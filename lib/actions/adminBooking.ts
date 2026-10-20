'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { Area } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { FormState } from '@/lib/formState';
import { requireStaff, type Permission } from '@/lib/staff';
import { getBaseUrl, getRequestInfo } from '@/lib/requestInfo';
import { hitLimit } from '@/lib/rateLimit';
import { checked, str } from '@/lib/validate';
import { cancelBooking, createBooking } from '@/lib/booking/create';
import { bookingRows } from '@/lib/booking/format';
import { getBookingSettings, normalizeSettings, saveBookingSettings } from '@/lib/booking/settings';
import { hallTime, isIsoDate } from '@/lib/booking/time';
import { sendBookingCancelledEmail, sendBookingConfirmedEmail } from '@/lib/email';
import { getSite, saveSite } from '@/lib/siteSettings';
import { closeOpenCheckouts, refundBooking } from '@/lib/payments/service';
import { parseEuroInput } from '@/lib/payments/math';

// Zásahy recepcie a administrátora do rezervácií. Každý zásah ide do záznamu zmien.

async function staff(perm: Permission) {
  const actor = await requireStaff(perm);
  const limit = await hitLimit(`admin:book:${actor.id}`, 120, 10 * 60);
  if (!limit.ok) throw new Error('Príliš veľa zásahov za krátky čas.');
  return actor;
}

async function audit(actorId: string, action: string, target: string, meta?: Record<string, unknown>) {
  const { ip } = await getRequestInfo();
  await prisma.auditLog.create({ data: { actorId, action, target, meta: meta ? JSON.parse(JSON.stringify(meta)) : undefined, ip } });
}

async function loadBooking(form: FormData) {
  const id = str(form, 'bookingId', 40);
  const b = await prisma.booking.findUnique({ where: { id } });
  if (!b) redirect('/admin/rezervacie');
  return b;
}

function back(id: string, stav: string): never {
  revalidatePath(`/admin/rezervacie/${id}`);
  redirect(`/admin/rezervacie/${id}?stav=${stav}`);
}

export async function adminMarkPaid(form: FormData): Promise<void> {
  const actor = await staff('payments.manage');
  const b = await loadBooking(form);
  if (b.paymentStatus === 'UNPAID' || b.paymentStatus === 'PENDING') {
    // zákazník čakal na platbu kartou, ale zaplatil inak → otvorenú platobnú stránku zavrieme
    if (b.paymentStatus === 'PENDING') await closeOpenCheckouts(b.id);
    await prisma.booking.update({
      where: { id: b.id },
      data: { paymentStatus: 'PAID', paidAt: new Date(), payDeadline: null, ...(b.paymentStatus === 'PENDING' ? { paymentMethod: 'ONSITE' as const } : {}) },
    });
    await audit(actor.id, 'booking.paid', b.id, { code: b.code });
  }
  back(b.id, 'zaplatena');
}

export async function adminMarkUnpaid(form: FormData): Promise<void> {
  const actor = await staff('payments.manage');
  const b = await loadBooking(form);
  // platbu kartou cez bránu nejde len „odznačiť“ – peniaze sa musia vrátiť
  const card = await prisma.payment.count({ where: { bookingId: b.id, state: 'SUCCEEDED' } });
  if (card > 0) back(b.id, 'karta-vratit');
  await prisma.booking.update({ where: { id: b.id }, data: { paymentStatus: 'UNPAID', paidAt: null } });
  await audit(actor.id, 'booking.unpaid', b.id, { code: b.code });
  back(b.id, 'nezaplatena');
}

// Vrátenie peňazí na kartu (celá suma alebo časť). Peniaze vracia brána, nie my.
export async function adminRefundAction(form: FormData): Promise<void> {
  const actor = await staff('payments.manage');
  const b = await loadBooking(form);
  const raw = str(form, 'amount', 20);
  const amount = raw ? parseEuroInput(raw) : null;
  if (raw && amount === null) back(b.id, 'suma-neplatna');
  const reason = str(form, 'reason', 300) || null;
  const limit = await hitLimit(`admin:refund:${actor.id}`, 20, 60 * 60);
  if (!limit.ok) back(b.id, 'limit');
  let r: Awaited<ReturnType<typeof refundBooking>>;
  try {
    r = await refundBooking(b.id, amount, reason, actor.id, await getBaseUrl());
  } catch (err) {
    console.error('[payments:admin-refund]', b.code, err);
    r = { ok: false, error: '' };
  }
  back(b.id, r.ok ? 'vratene' : 'vratenie-zlyhalo');
}

export async function adminCheckIn(form: FormData): Promise<void> {
  const actor = await staff('bookings.manage');
  const b = await loadBooking(form);
  if (b.status !== 'CONFIRMED') back(b.id, 'nie-aktivna');
  await prisma.booking.update({ where: { id: b.id }, data: { checkedInAt: b.checkedInAt ?? new Date() } });
  await audit(actor.id, 'booking.check-in', b.id, { code: b.code });
  back(b.id, 'prichod');
}

export async function adminNoShow(form: FormData): Promise<void> {
  const actor = await staff('bookings.manage');
  const b = await loadBooking(form);
  if (b.status !== 'CONFIRMED') back(b.id, 'nie-aktivna');
  if (b.startsAt > new Date()) back(b.id, 'este-nezacala');
  await prisma.booking.update({ where: { id: b.id }, data: { status: 'NO_SHOW' } });
  await audit(actor.id, 'booking.no-show', b.id, { code: b.code });
  back(b.id, 'neprisiel');
}

export async function adminCancelBooking(form: FormData): Promise<void> {
  const actor = await staff('bookings.manage');
  const b = await loadBooking(form);
  const reason = str(form, 'reason', 300) || 'Zrušené recepciou';
  const ok = await cancelBooking(b.id, 'staff', reason);
  if (!ok) back(b.id, 'nie-aktivna');
  await audit(actor.id, 'booking.cancel', b.id, { code: b.code, reason });
  let refundFailed = false;
  if (b.paymentStatus === 'PENDING') {
    await closeOpenCheckouts(b.id);
    await prisma.booking.update({ where: { id: b.id }, data: { paymentStatus: 'UNPAID', payDeadline: null } });
  } else if (checked(form, 'refund') && (b.paymentStatus === 'PAID' || b.paymentStatus === 'PARTIALLY_REFUNDED')) {
    try {
      const r = await refundBooking(b.id, null, reason, actor.id, await getBaseUrl());
      refundFailed = !r.ok;
    } catch (err) {
      console.error('[payments:cancel-refund]', b.code, err);
      refundFailed = true;
    }
  }
  if (checked(form, 'notify')) {
    const user = b.userId ? await prisma.user.findUnique({ where: { id: b.userId } }) : null;
    const to = user && !user.deletedAt ? user.email : b.guestEmail;
    if (to) {
      const base = await getBaseUrl();
      try {
        await sendBookingCancelledEmail(to, user?.firstName ?? b.contactName.split(' ')[0], `${base}/rezervacia`, bookingRows(b), true);
      } catch (err) {
        console.error('[email:admin-cancel]', err);
      }
    }
  }
  back(b.id, refundFailed ? 'zrusena-bez-vratenia' : 'zrusena');
}

// ───────────────────────── Blokovanie času ─────────────────────────

const AREAS: Area[] = ['FULL', 'HALF_A', 'HALF_B'];

export async function adminCreateBlock(form: FormData): Promise<void> {
  const actor = await staff('bookings.manage');
  const iso = str(form, 'datum', 10);
  const from = Number.parseInt(str(form, 'od', 2), 10);
  const to = Number.parseInt(str(form, 'do', 2), 10);
  const area = str(form, 'plocha', 10) as Area;
  const reason = str(form, 'reason', 200) || 'Blokované';
  const backTo = (stav: string): never => redirect(`/admin/kalendar?datum=${isIsoDate(iso) ? iso : ''}&stav=${stav}`);
  if (!isIsoDate(iso) || !AREAS.includes(area) || !Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to > 24 || to <= from) backTo('blok-chyba');

  const halves = area === 'FULL' ? ['A', 'B'] : area === 'HALF_A' ? ['A'] : ['B'];
  const starts: Date[] = [];
  for (let h = from; h < to; h++) starts.push(hallTime(iso, h));
  try {
    const block = await prisma.block.create({
      data: {
        area,
        startsAt: hallTime(iso, from),
        endsAt: hallTime(iso, to),
        reason,
        createdBy: actor.id,
        slots: { create: starts.flatMap((slotStart) => halves.map((half) => ({ slotStart, half }))) },
      },
    });
    await audit(actor.id, 'block.create', block.id, { iso, from, to, area, reason });
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') backTo('blok-obsadene');
    throw e;
  }
  revalidatePath('/admin/kalendar');
  backTo('blok-ok');
}

export async function adminDeleteBlock(form: FormData): Promise<void> {
  const actor = await staff('bookings.manage');
  const id = str(form, 'blockId', 40);
  const block = await prisma.block.findUnique({ where: { id } });
  if (block) {
    await prisma.block.delete({ where: { id } });
    await audit(actor.id, 'block.delete', id, { reason: block.reason });
  }
  const iso = str(form, 'datum', 10);
  revalidatePath('/admin/kalendar');
  redirect(`/admin/kalendar?datum=${isIsoDate(iso) ? iso : ''}&stav=blok-zmazany`);
}

// ───────────────────────── Nastavenia ─────────────────────────

export async function adminSaveSettings(_prev: FormState, form: FormData): Promise<FormState> {
  const actor = await staff('settings.manage');
  const n = (name: string) => Number(str(form, name, 10).replace(',', '.'));
  const raw = {
    prices: {
      full: { offPeak: n('fullOff'), peak: n('fullPeak'), weekend: n('fullWeekend') },
    },
    showerPrice: n('showerPrice'),
    showersEnabled: checked(form, 'showersEnabled'),
    peakFromHour: n('peakFromHour'),
    openHour: n('openHour'),
    closeHour: n('closeHour'),
    cancelFreeHours: n('cancelFreeHours'),
    leadMinutes: n('leadMinutes'),
    maxDaysAhead: n('maxDaysAhead'),
    maxHours: n('maxHours'),
    maxActive: n('maxActive'),
    temporary: checked(form, 'temporary'),
  };
  const errors: Record<string, string> = {};
  const priceKeys = ['fullOff', 'fullPeak', 'fullWeekend', 'showerPrice'];
  for (const k of priceKeys) if (!Number.isFinite(n(k)) || n(k) < 0 || n(k) > 10000) errors[k] = 'Zadaj cenu 0 – 10 000 €.';
  if (!(raw.openHour >= 0 && raw.openHour <= 23)) errors.openHour = '0 – 23';
  if (!(raw.closeHour > raw.openHour && raw.closeHour <= 24)) errors.closeHour = 'Musí byť po otvorení (najviac 24).';
  if (!(raw.peakFromHour >= 0 && raw.peakFromHour <= 24)) errors.peakFromHour = '0 – 24';
  if (!(raw.maxHours >= 1 && raw.maxHours <= 12)) errors.maxHours = '1 – 12';
  if (!(raw.maxActive >= 1 && raw.maxActive <= 100)) errors.maxActive = '1 – 100';
  if (!(raw.maxDaysAhead >= 1 && raw.maxDaysAhead <= 365)) errors.maxDaysAhead = '1 – 365';
  if (!(raw.cancelFreeHours >= 0 && raw.cancelFreeHours <= 720)) errors.cancelFreeHours = '0 – 720';
  if (!(raw.leadMinutes >= 0 && raw.leadMinutes <= 10080)) errors.leadMinutes = '0 – 10 080';
  if (Object.keys(errors).length) return { error: 'Skontroluj označené polia.', errors };

  const before = await getBookingSettings();
  const value = normalizeSettings(raw);
  await saveBookingSettings(value, actor.id);
  await audit(actor.id, 'settings.booking', 'booking', { before, after: value });
  revalidatePath('/', 'layout');
  return { success: 'Nastavenia sú uložené. Nové ceny platia pre nové rezervácie.' };
}

// ───────────────────────── Rezervácia zadaná recepciou ─────────────────────────

export async function adminCreateBookingAction(_prev: FormState, form: FormData): Promise<FormState> {
  const actor = await staff('bookings.manage');
  const iso = str(form, 'datum', 10);
  const showers = checked(form, 'sprchy');
  const startHour = Number.parseInt(str(form, 'od', 2), 10);
  const hours = Number.parseInt(str(form, 'hodiny', 2), 10);
  const values = {
    email: str(form, 'email', 254).toLowerCase(),
    contactName: str(form, 'contactName', 120),
    contactPhone: str(form, 'contactPhone', 30).replace(/[\s()-]/g, ''),
    teamName: str(form, 'teamName', 120),
    note: str(form, 'note', 500),
    platba: str(form, 'platba', 10) === 'TRANSFER' ? 'TRANSFER' : 'ONSITE',
  };
  const errors: Record<string, string> = {};
  if (!isIsoDate(iso)) return { error: 'Vyber dátum.', values };
  if (!Number.isInteger(startHour)) errors.od = 'Vyber začiatok.';
  if (values.contactName.length < 2) errors.contactName = 'Zadaj meno.';
  if (!/^\+?[0-9]{9,15}$/.test(values.contactPhone)) errors.contactPhone = 'Zadaj telefón.';
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email)) errors.email = 'Neplatný e-mail.';
  if (Object.keys(errors).length) return { error: 'Skontroluj označené polia.', errors, values };

  const account = values.email ? await prisma.user.findUnique({ where: { email: values.email } }) : null;
  const user = account && !account.deletedAt ? account : null;

  const settings = await getBookingSettings();
  const result = await createBooking(settings, {
    userId: user?.id ?? null,
    guestEmail: user ? null : values.email || null,
    createdById: actor.id,
    iso,
    startHour,
    hours: Number.isInteger(hours) ? hours : 1,
    showers,
    contactName: values.contactName,
    contactPhone: values.contactPhone,
    teamName: values.teamName || null,
    note: values.note || null,
    paymentMethod: values.platba as 'ONSITE' | 'TRANSFER',
    paid: checked(form, 'paid'),
    staff: true,
  });
  if (!result.ok) return { error: result.error, values };
  await audit(actor.id, 'booking.create', result.id, { code: result.code, customer: user?.email ?? values.email ?? values.contactName });

  const to = user?.email ?? (values.email || null);
  if (to && checked(form, 'notify')) {
    const b = await prisma.booking.findUnique({ where: { id: result.id } });
    if (b) {
      const base = await getBaseUrl();
      try {
        await sendBookingConfirmedEmail(to, user?.firstName ?? values.contactName.split(' ')[0], user ? `${base}/rezervacia/${b.code}` : `${base}/rezervacia`, bookingRows(b));
      } catch (err) {
        console.error('[email:admin-create]', err);
      }
    }
  }
  redirect(`/admin/rezervacie/${result.id}?stav=vytvorena`);
}

// ───────────────────────── Údaje o firme a hale ─────────────────────────

export async function adminSaveSiteAction(_prev: FormState, form: FormData): Promise<FormState> {
  const actor = await staff('settings.manage');
  const current = await getSite();
  const v = (k: string, max = 300) => str(form, k, max);
  const errors: Record<string, string> = {};
  const email = v('email', 200).toLowerCase();
  const notifyEmail = v('notifyEmail', 200).toLowerCase();
  const mailOk = (x: string) => x === '' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(x);
  if (!mailOk(email)) errors.email = 'Neplatný e-mail.';
  if (!mailOk(notifyEmail)) errors.notifyEmail = 'Neplatný e-mail.';
  const urlOk = (x: string) => x === '' || /^https:\/\/[^\s]+$/.test(x);
  for (const k of ['mapUrl', 'facebook', 'instagram']) if (!urlOk(v(k, 500))) errors[k] = 'Adresa musí začínať https://';
  const iban = v('iban', 40).replace(/\s/g, '').toUpperCase();
  if (iban && !/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) errors.iban = 'Neplatný IBAN.';
  // Poloha: „48.70123, 21.25456“ skopírované z Google Máp (pravý klik na budovu)
  const gps = v('gps', 60).replace(/\s+/g, '');
  let lat = '';
  let lng = '';
  if (gps) {
    const m = /^(-?\d{1,2}\.\d{3,8}),(-?\d{1,3}\.\d{3,8})$/.exec(gps.replace(';', ','));
    if (!m || +m[1] < 47.5 || +m[1] > 49.8 || +m[2] < 16.7 || +m[2] > 22.7) errors.gps = 'Zadaj polohu v tvare 48.70123, 21.25456 (v Google Mapách pravý klik na budovu a klikni na čísla).';
    else [lat, lng] = [m[1], m[2]];
  }
  if (Object.keys(errors).length) return { error: 'Skontroluj označené polia.', errors };

  const next = {
    ...current,
    phone: v('phone', 40),
    email,
    notifyEmail,
    hall: { street: v('hallStreet') || current.hall.street, city: v('hallCity') || current.hall.city, mapUrl: v('mapUrl', 500), lat, lng },
    company: {
      name: v('companyName') || current.company.name,
      street: v('companyStreet') || current.company.street,
      city: v('companyCity') || current.company.city,
      ico: v('ico', 20),
      dic: v('dic', 20),
      icDph: v('icDph', 20),
      register: v('register'),
    },
    social: { facebook: v('facebook', 500), instagram: v('instagram', 500) },
    hours: current.hours.map((h, i) => ({ days: h.days, time: v(`hours${i}`, 60) })),
    iban: iban.replace(/(.{4})/g, '$1 ').trim(),
    bankName: v('bankName', 100),
  };
  await saveSite(next, actor.id);
  await audit(actor.id, 'settings.site', 'site');
  revalidatePath('/', 'layout');
  return { success: 'Údaje sú uložené a hneď sa zobrazujú na webe.' };
}
