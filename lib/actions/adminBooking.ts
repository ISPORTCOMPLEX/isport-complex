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
import { cancelBooking } from '@/lib/booking/create';
import { bookingRows } from '@/lib/booking/format';
import { getBookingSettings, normalizeSettings, saveBookingSettings } from '@/lib/booking/settings';
import { hallTime, isIsoDate } from '@/lib/booking/time';
import { sendBookingCancelledEmail } from '@/lib/email';

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
  if (b.paymentStatus !== 'PAID') {
    await prisma.booking.update({ where: { id: b.id }, data: { paymentStatus: 'PAID', paidAt: new Date() } });
    await audit(actor.id, 'booking.paid', b.id, { code: b.code });
  }
  back(b.id, 'zaplatena');
}

export async function adminMarkUnpaid(form: FormData): Promise<void> {
  const actor = await staff('payments.manage');
  const b = await loadBooking(form);
  await prisma.booking.update({ where: { id: b.id }, data: { paymentStatus: 'UNPAID', paidAt: null } });
  await audit(actor.id, 'booking.unpaid', b.id, { code: b.code });
  back(b.id, 'nezaplatena');
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
  if (checked(form, 'notify')) {
    const user = await prisma.user.findUnique({ where: { id: b.userId } });
    if (user && !user.deletedAt) {
      const base = await getBaseUrl();
      try {
        await sendBookingCancelledEmail(user.email, user.firstName, `${base}/rezervacia`, bookingRows(b), true);
      } catch (err) {
        console.error('[email:admin-cancel]', err);
      }
    }
  }
  back(b.id, 'zrusena');
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
      half: { offPeak: n('halfOff'), peak: n('halfPeak'), weekend: n('halfWeekend') },
    },
    peakFromHour: n('peakFromHour'),
    openHour: n('openHour'),
    closeHour: n('closeHour'),
    cancelFreeHours: n('cancelFreeHours'),
    leadMinutes: n('leadMinutes'),
    maxDaysAhead: n('maxDaysAhead'),
    maxHours: n('maxHours'),
    temporary: checked(form, 'temporary'),
  };
  const errors: Record<string, string> = {};
  const priceKeys = ['fullOff', 'fullPeak', 'fullWeekend', 'halfOff', 'halfPeak', 'halfWeekend'];
  for (const k of priceKeys) if (!Number.isFinite(n(k)) || n(k) < 0 || n(k) > 10000) errors[k] = 'Zadaj cenu 0 – 10 000 €.';
  if (!(raw.openHour >= 0 && raw.openHour <= 23)) errors.openHour = '0 – 23';
  if (!(raw.closeHour > raw.openHour && raw.closeHour <= 24)) errors.closeHour = 'Musí byť po otvorení (najviac 24).';
  if (!(raw.peakFromHour >= 0 && raw.peakFromHour <= 24)) errors.peakFromHour = '0 – 24';
  if (!(raw.maxHours >= 1 && raw.maxHours <= 12)) errors.maxHours = '1 – 12';
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
