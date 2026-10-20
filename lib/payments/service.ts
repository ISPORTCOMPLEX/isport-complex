import 'server-only';
import type { Booking, Payment } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { cancelBooking } from '@/lib/booking/create';
import { bookingRows } from '@/lib/booking/format';
import { euros } from '@/lib/booking/time';
import { sendBookingConfirmedEmail, sendPaymentExpiredEmail, sendRefundEmail } from '@/lib/email';
import { PAY_GRACE_MIN, PAY_WINDOW_MIN } from './config';
import { getProvider, providerFor } from './index';
import type { PaymentEventIn, PaymentProvider } from './types';
import { refundState } from './math';

// Celý životný cyklus platby kartou:
//   1. createBookingAction vytvorí rezerváciu s paymentStatus=PENDING a podrží čas (payDeadline)
//   2. startCheckout vytvorí platobnú reláciu v bráne a zákazníka presmeruje na jej stránku
//   3. brána pošle webhook (alebo sa zákazník vráti) → markPaid → PAID + potvrdzujúci e-mail
//   4. ak nezaplatí: relácia vyprší → expireSession → rezervácia sa zruší a čas sa uvoľní
//   5. zrušenie zaplatenej rezervácie → refund (celý alebo čiastočný)
// Každý krok je idempotentný – opakovaný webhook ani súbežné volania nič nezdvoja.

type BookingWithUser = Booking & { user: { email: string; firstName: string; deletedAt: Date | null } | null };

function recipient(b: BookingWithUser): { to: string; firstName: string } | null {
  const to = b.user && !b.user.deletedAt ? b.user.email : b.guestEmail;
  if (!to) return null;
  return { to, firstName: b.user?.firstName ?? b.contactName.split(' ')[0] ?? '' };
}

async function audit(action: string, target: string, meta: Record<string, unknown>, actorId: string | null = null) {
  try {
    await prisma.auditLog.create({ data: { actorId, action, target, meta: JSON.parse(JSON.stringify(meta)) } });
  } catch (err) {
    console.error('[payments:audit]', err);
  }
}

async function safely(label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    console.error(`[payments:${label}]`, err);
  }
}

const withUser = { user: { select: { email: true, firstName: true, deletedAt: true } } } as const;

// Termín sa drží o niečo dlhšie ako relácia v bráne, aby oneskorený webhook stihol prísť.
export function holdDeadline(now = new Date()): Date {
  return new Date(now.getTime() + (PAY_WINDOW_MIN + 1 + PAY_GRACE_MIN) * 60000);
}

// ───────────────────────── 2. Platobná relácia ─────────────────────────

export async function startCheckout(bookingId: string, base: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const provider = getProvider();
  if (!provider) return { ok: false, error: 'Platba kartou online nie je zapnutá.' };
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: withUser });
  if (!b || b.status !== 'CONFIRMED' || b.paymentMethod !== 'CARD' || b.paymentStatus !== 'PENDING') return { ok: false, error: 'Táto rezervácia nečaká na platbu kartou.' };

  const now = new Date();
  const open = await prisma.payment.findFirst({ where: { bookingId, state: 'CREATED', expiresAt: { gt: new Date(now.getTime() + 2 * 60000) } }, orderBy: { createdAt: 'desc' } });
  if (open?.checkoutUrl && open.provider === provider.id) return { ok: true, url: open.checkoutUrl };

  const attempts = await prisma.payment.count({ where: { bookingId } });
  if (attempts >= 5) return { ok: false, error: 'Príliš veľa pokusov o platbu. Kontaktuj recepciu.' };

  const expiresAt = new Date(now.getTime() + (PAY_WINDOW_MIN + 1) * 60000); // Stripe: najmenej 30 minút
  const who = recipient(b);
  const session = await provider.createCheckout({
    bookingId: b.id,
    code: b.code,
    amountCents: b.priceCents,
    currency: 'EUR',
    description: `Ľadová plocha · ${bookingRows(b)[1]?.value ?? ''} · ${bookingRows(b)[2]?.value ?? ''}`,
    customerEmail: who?.to ?? null,
    successUrl: `${base}/rezervacia/${b.code}?platba=ok`,
    cancelUrl: `${base}/rezervacia/${b.code}?platba=zrusena`,
    expiresAt,
    idempotencyKey: `checkout:${b.id}:${attempts}`,
  });
  try {
    await prisma.$transaction([
      prisma.payment.create({
        data: { bookingId: b.id, provider: provider.id, sessionRef: session.sessionRef, amountCents: b.priceCents, checkoutUrl: session.url, expiresAt: session.expiresAt, livemode: session.livemode },
      }),
      prisma.booking.update({ where: { id: b.id }, data: { payDeadline: new Date(session.expiresAt.getTime() + PAY_GRACE_MIN * 60000) } }),
    ]);
  } catch (err) {
    await safely('expire-orphan', () => provider.expireSession(session.sessionRef));
    throw err;
  }
  return { ok: true, url: session.url };
}

// ───────────────────────── 3.–4. Výsledok platby ─────────────────────────

export async function markPaid(sessionRef: string, intentRef: string | null, amountCents: number, base: string | null): Promise<string> {
  const p = await prisma.payment.findUnique({ where: { sessionRef }, include: { booking: { include: withUser } } });
  if (!p) return 'unknown-session';
  if (p.state === 'SUCCEEDED') return 'already-paid';

  const claimed = await prisma.payment.updateMany({
    where: { id: p.id, state: { not: 'SUCCEEDED' } },
    data: { state: 'SUCCEEDED', intentRef, paidAt: new Date(), checkoutUrl: null },
  });
  if (claimed.count !== 1) return 'already-paid';
  if (amountCents && amountCents !== p.amountCents) await audit('payment.amount-mismatch', p.bookingId, { code: p.booking.code, expected: p.amountCents, got: amountCents });

  const b = p.booking;
  const updated = await prisma.booking.updateMany({
    where: { id: b.id, status: 'CONFIRMED', paymentStatus: { in: ['PENDING', 'UNPAID'] } },
    data: { paymentStatus: 'PAID', paidAt: new Date(), payDeadline: null, paymentMethod: 'CARD' },
  });
  await audit('payment.succeeded', b.id, { code: b.code, amount: p.amountCents, provider: p.provider });

  if (updated.count !== 1) {
    // Rezervácia bola medzitým zrušená alebo už zaplatená inak → peniaze hneď vrátime.
    await audit('payment.auto-refund', b.id, { code: b.code, reason: b.status !== 'CONFIRMED' ? 'zrušená pred prijatím platby' : 'už zaplatená inak' });
    await safely('auto-refund', async () => {
      const r = await refundPayment(p.id, null, 'Rezervácia nebola aktívna v čase platby', null);
      if (!r.ok) throw new Error(r.error);
    });
    return 'refunded-inactive';
  }
  const who = recipient(b);
  if (who && base) {
    await safely('email-paid', async () => {
      const fresh = await prisma.booking.findUnique({ where: { id: b.id } });
      if (fresh) await sendBookingConfirmedEmail(who.to, who.firstName, `${base}/rezervacia/${b.code}`, bookingRows(fresh));
    });
  }
  return 'paid';
}

export async function markUnsuccessful(sessionRef: string, kind: 'EXPIRED' | 'FAILED', reason: string | null, base: string | null): Promise<string> {
  const p = await prisma.payment.findUnique({ where: { sessionRef }, include: { booking: { include: withUser } } });
  if (!p) return 'unknown-session';
  const changed = await prisma.payment.updateMany({ where: { id: p.id, state: 'CREATED' }, data: { state: kind, failureReason: reason, checkoutUrl: null } });
  if (changed.count !== 1) return 'already-final';

  const b = p.booking;
  const stillOpen = await prisma.payment.count({ where: { bookingId: b.id, state: 'CREATED' } });
  if (stillOpen > 0 || b.status !== 'CONFIRMED' || b.paymentStatus !== 'PENDING') return 'payment-closed';

  const cancelled = await cancelBooking(b.id, 'system', kind === 'EXPIRED' ? 'Platba kartou nebola dokončená včas' : 'Platba kartou zlyhala');
  await prisma.booking.update({ where: { id: b.id }, data: { paymentStatus: 'UNPAID', payDeadline: null } });
  await audit(kind === 'EXPIRED' ? 'payment.expired' : 'payment.failed', b.id, { code: b.code, reason });
  const who = recipient(b);
  if (cancelled && who && base) await safely('email-expired', () => sendPaymentExpiredEmail(who.to, who.firstName, `${base}/rezervacia`, bookingRows(b)));
  return 'booking-released';
}

// Udalosť z webhooku. Duplicitné udalosti preskočíme; udalosť zapíšeme až po úspešnom spracovaní,
// takže keď spracovanie zlyhá, brána ju pošle znova.
export async function handleEvent(provider: PaymentProvider, ev: PaymentEventIn, base: string | null): Promise<string> {
  const key = `${provider.id}:${ev.eventId}`;
  if (await prisma.paymentEvent.findUnique({ where: { id: key } })) return 'duplicate';
  let result = 'ignored';
  if (ev.kind === 'paid') result = await markPaid(ev.sessionRef, ev.intentRef, ev.amountCents, base);
  else if (ev.kind === 'expired') result = await markUnsuccessful(ev.sessionRef, 'EXPIRED', null, base);
  else if (ev.kind === 'failed') result = await markUnsuccessful(ev.sessionRef, 'FAILED', ev.reason, base);
  else if (ev.kind === 'refunded') result = await syncRefundTotal(ev.intentRef, ev.refundedTotalCents);
  try {
    await prisma.paymentEvent.create({ data: { id: key, provider: provider.id, type: ev.kind === 'ignored' ? ev.type : ev.kind } });
  } catch {
    // súbežne spracovaná rovnaká udalosť – výsledok je rovnaký
  }
  return result;
}

// Zákazník sa vrátil z platobnej stránky alebo denná údržba – opýtame sa brány priamo.
export async function reconcileBooking(bookingId: string, base: string | null): Promise<string> {
  const open = await prisma.payment.findMany({ where: { bookingId, state: 'CREATED' }, orderBy: { createdAt: 'desc' }, take: 3 });
  let result = 'nothing-open';
  for (const p of open) {
    const provider = providerFor(p.provider);
    if (!provider) continue;
    const st = await provider.getSession(p.sessionRef);
    if (st.state === 'paid') return markPaid(p.sessionRef, st.intentRef, st.amountCents, base);
    if (st.state === 'expired') result = await markUnsuccessful(p.sessionRef, 'EXPIRED', null, base);
    else result = 'open';
  }
  return result;
}

// Rezervácie, pri ktorých platba neprišla ani po lehote – uvoľní čas pre ostatných.
// Volá sa pri otvorení rezervačného kalendára, pri novej rezervácii a v dennej údržbe.
export async function sweepExpiredHolds(base: string | null, limit = 20): Promise<number> {
  const stale = await prisma.booking.findMany({
    where: { status: 'CONFIRMED', paymentStatus: 'PENDING', payDeadline: { lt: new Date() } },
    select: { id: true, code: true },
    take: limit,
  });
  let released = 0;
  for (const b of stale) {
    try {
      const r = await reconcileBooking(b.id, base);
      if (r === 'paid') continue;
      const now = await prisma.booking.findUnique({ where: { id: b.id }, select: { status: true, paymentStatus: true } });
      if (now?.status === 'CONFIRMED' && now.paymentStatus === 'PENDING') {
        // brána nie je dostupná alebo relácia neexistuje → uzavrieme sami
        await prisma.payment.updateMany({ where: { bookingId: b.id, state: 'CREATED' }, data: { state: 'EXPIRED', checkoutUrl: null } });
        await cancelBooking(b.id, 'system', 'Platba kartou nebola dokončená včas');
        await prisma.booking.update({ where: { id: b.id }, data: { paymentStatus: 'UNPAID', payDeadline: null } });
        await audit('payment.expired', b.id, { code: b.code, reason: 'lehota uplynula' });
      }
      released++;
    } catch (err) {
      console.error('[payments:sweep]', b.code, err);
    }
  }
  return released;
}

// Zákazník zrušil nezaplatenú rezerváciu alebo recepcia prijala platbu inak → zavrieme otvorené relácie.
export async function closeOpenCheckouts(bookingId: string): Promise<void> {
  const open = await prisma.payment.findMany({ where: { bookingId, state: 'CREATED' } });
  for (const p of open) {
    const provider = providerFor(p.provider);
    if (provider) await safely('expire', () => provider.expireSession(p.sessionRef));
    await prisma.payment.updateMany({ where: { id: p.id, state: 'CREATED' }, data: { state: 'CANCELED', checkoutUrl: null } });
  }
}

// ───────────────────────── 5. Vrátenie peňazí ─────────────────────────

async function applyBookingRefundState(bookingId: string) {
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: { payments: { where: { state: 'SUCCEEDED' } } } });
  if (!b) return;
  const paid = b.payments.reduce((a: number, x: Payment) => a + x.amountCents, 0);
  const refunded = b.payments.reduce((a: number, x: Payment) => a + x.refundedCents, 0);
  const st = refundState(paid, refunded);
  if (!st) return;
  await prisma.booking.update({ where: { id: bookingId }, data: { refundedCents: refunded, paymentStatus: st } });
}

// Brána hlási celkovú vrátenú sumu (napr. vrátenie urobené priamo v administrácii Stripe).
async function syncRefundTotal(intentRef: string, totalCents: number): Promise<string> {
  const p = await prisma.payment.findUnique({ where: { intentRef } });
  if (!p) return 'unknown-intent';
  if (totalCents <= p.refundedCents) return 'refund-known';
  await prisma.payment.update({ where: { id: p.id }, data: { refundedCents: Math.min(totalCents, p.amountCents) } });
  await applyBookingRefundState(p.bookingId);
  await audit('payment.refund-synced', p.bookingId, { total: totalCents });
  return 'refund-synced';
}

export async function refundPayment(paymentId: string, amountCents: number | null, reason: string | null, actorId: string | null): Promise<{ ok: true; amountCents: number } | { ok: false; error: string }> {
  const p = await prisma.payment.findUnique({ where: { id: paymentId }, include: { booking: true } });
  if (!p || p.state !== 'SUCCEEDED' || !p.intentRef) return { ok: false, error: 'Platba sa nenašla alebo nebola dokončená.' };
  const remaining = p.amountCents - p.refundedCents;
  const amount = amountCents ?? remaining;
  if (!Number.isInteger(amount) || amount < 1 || amount > remaining) return { ok: false, error: `Vrátiť sa dá najviac ${euros(remaining)}.` };
  const provider = providerFor(p.provider);
  if (!provider) return { ok: false, error: `Brána ${p.provider} teraz nie je zapnutá. Vráť peniaze priamo v jej administrácii – stav sa zladí sám.` };

  const r = await provider.refund(p.intentRef, amount, `refund:${p.id}:${p.refundedCents}:${amount}`, reason);
  if (r.status === 'failed') return { ok: false, error: 'Brána vrátenie odmietla. Skús to v jej administrácii.' };
  // Zvýšenie vrátenej sumy je podmienené pôvodnou hodnotou – súbežné kliknutie nezdvojí záznam.
  const bumped = await prisma.payment.updateMany({ where: { id: p.id, refundedCents: p.refundedCents }, data: { refundedCents: p.refundedCents + amount } });
  await prisma.refund.upsert({
    where: { providerRef: r.refundRef || `${p.id}:${p.refundedCents}:${amount}` },
    create: { paymentId: p.id, providerRef: r.refundRef || `${p.id}:${p.refundedCents}:${amount}`, amountCents: amount, reason, status: r.status, createdById: actorId },
    update: { status: r.status },
  });
  if (bumped.count === 1) {
    await applyBookingRefundState(p.bookingId);
    await audit('payment.refund', p.bookingId, { code: p.booking.code, amount, reason }, actorId);
  }
  return { ok: true, amountCents: amount };
}

// Vráti peniaze za rezerváciu (všetky úspešné platby, alebo zadanú sumu).
export async function refundBooking(bookingId: string, amountCents: number | null, reason: string | null, actorId: string | null, base: string | null): Promise<{ ok: true; amountCents: number } | { ok: false; error: string }> {
  const payments = await prisma.payment.findMany({ where: { bookingId, state: 'SUCCEEDED' }, orderBy: { createdAt: 'asc' } });
  const open = payments.filter((p: Payment) => p.amountCents > p.refundedCents);
  if (open.length === 0) return { ok: false, error: 'Rezervácia nemá platbu kartou, ktorú by bolo možné vrátiť.' };
  let left = amountCents;
  let total = 0;
  for (const p of open) {
    const part = left === null ? null : Math.min(left, p.amountCents - p.refundedCents);
    if (part === 0) break;
    const r = await refundPayment(p.id, part, reason, actorId);
    if (!r.ok) return total > 0 ? { ok: true, amountCents: total } : r;
    total += r.amountCents;
    if (left !== null) left -= r.amountCents;
  }
  if (total > 0 && base) {
    const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: withUser });
    const who = b ? recipient(b) : null;
    if (b && who) await safely('email-refund', () => sendRefundEmail(who.to, who.firstName, `${base}/rezervacia/${b.code}`, bookingRows(b), euros(total)));
  }
  return { ok: true, amountCents: total };
}
