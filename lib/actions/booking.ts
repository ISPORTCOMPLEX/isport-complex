'use server';

import { redirect } from 'next/navigation';
import type { PaymentMethod } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { FormState } from '@/lib/formState';
import { getSessionUser } from '@/lib/session';
import { hitLimit, minutes } from '@/lib/rateLimit';
import { getBaseUrl } from '@/lib/requestInfo';
import { checked, isName, isPhone, normalizePhone, str } from '@/lib/validate';
import { getBookingSettings } from '@/lib/booking/settings';
import { cancelBooking, createBooking } from '@/lib/booking/create';
import { isIsoDate } from '@/lib/booking/time';
import { bookingRows, transferRows } from '@/lib/booking/format';
import { getSite } from '@/lib/siteSettings';
import { sendBookingCancelledEmail, sendBookingConfirmedEmail } from '@/lib/email';

const METHODS: PaymentMethod[] = ['ONSITE', 'TRANSFER'];

export async function createBookingAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await getSessionUser();
  const iso = str(form, 'datum', 10);
  const startHour = Number.parseInt(str(form, 'od', 2), 10);
  const hours = Number.parseInt(str(form, 'hodiny', 2), 10);
  const rooms = Math.max(0, Number.parseInt(str(form, 'satne', 2), 10) || 0);
  if (!user) redirect(`/prihlasenie?next=${encodeURIComponent(`/rezervacia/udaje?datum=${iso}&od=${startHour}&hodiny=${hours}&satne=${rooms}`)}`);

  const values = {
    contactName: str(form, 'contactName', 120),
    contactPhone: normalizePhone(str(form, 'contactPhone', 30)),
    teamName: str(form, 'teamName', 120),
    note: str(form, 'note', 500),
    platba: str(form, 'platba', 10),
  };
  const errors: Record<string, string> = {};
  if (!isIsoDate(iso) || !Number.isInteger(startHour) || !Number.isInteger(hours)) return { error: 'Neplatný termín. Vyber ho znova.' };
  if (values.contactName.length < 3 || !isName(values.contactName.split(' ')[0] ?? '')) errors.contactName = 'Zadaj meno a priezvisko.';
  if (!values.contactPhone || !isPhone(values.contactPhone)) errors.contactPhone = 'Zadaj telefón, aby sme ťa vedeli kontaktovať.';
  const method = METHODS.includes(values.platba as PaymentMethod) ? (values.platba as PaymentMethod) : null;
  if (!method) errors.platba = 'Vyber spôsob platby.';
  if (!checked(form, 'terms')) errors.terms = 'Potvrď obchodné podmienky a storno podmienky.';
  if (Object.keys(errors).length) return { error: 'Skontroluj označené polia.', errors, values };

  const limit = await hitLimit(`booking:create:${user.id}`, 10, 60 * 60);
  if (!limit.ok) return { error: `Príliš veľa rezervácií za krátky čas. Skús to o ${minutes(limit.retryAfterSec)} min.`, values };

  const settings = await getBookingSettings();
  const presun = str(form, 'presun', 12);
  const old = presun ? await prisma.booking.findUnique({ where: { code: presun } }) : null;
  if (presun) {
    if (!old || old.userId !== user.id || old.status !== 'CONFIRMED' || old.paymentStatus === 'PAID') return { error: 'Túto rezerváciu nie je možné presunúť online.', values };
    if (old.startsAt.getTime() - Date.now() < settings.cancelFreeHours * 3600000) return { error: `Presunúť sa dá najneskôr ${settings.cancelFreeHours} hodín pred začiatkom.`, values };
  }
  const active = await prisma.booking.count({ where: { userId: user.id, status: 'CONFIRMED', endsAt: { gt: new Date() } } });
  if (active >= settings.maxActive && !presun) {
    return { error: `Máš už ${active} nadchádzajúcich rezervácií (najviac ${settings.maxActive}). Ďalšie ti vytvorí recepcia.`, values };
  }
  const result = await createBooking(settings, {
    movedFromCode: old?.code ?? null,
    userId: user.id,
    iso,
    startHour,
    hours,
    lockerRooms: rooms,
    contactName: values.contactName,
    contactPhone: values.contactPhone,
    teamName: values.teamName || null,
    note: values.note || null,
    paymentMethod: method!,
  });
  if (!result.ok) return { error: result.error, values };
  if (old) {
    const cancelled = await cancelBooking(old.id, 'customer', `Presunuté na ${result.code}`);
    if (!cancelled) {
      await cancelBooking(result.id, 'customer', 'Presun sa nepodaril');
      return { error: 'Presun sa nepodaril, pôvodná rezervácia sa medzitým zmenila. Skontroluj Moje rezervácie.', values };
    }
  }

  const booking = await prisma.booking.findUnique({ where: { id: result.id } });
  if (booking) {
    const base = await getBaseUrl();
    try {
      const site = await getSite();
      await sendBookingConfirmedEmail(user.email, user.firstName, `${base}/rezervacia/${booking.code}`, [...bookingRows(booking), ...transferRows(booking, site.iban)]);
    } catch (err) {
      console.error('[email:booking]', err);
    }
  }
  redirect(`/rezervacia/${result.code}?nova=1`);
}

export async function cancelMyBookingAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) redirect('/prihlasenie?next=/ucet/rezervacie');
  const code = str(form, 'code', 20);
  const booking = await prisma.booking.findUnique({ where: { code } });
  if (!booking || booking.userId !== user.id) return { error: 'Rezervácia sa nenašla.' };
  if (booking.status !== 'CONFIRMED') return { error: 'Táto rezervácia sa už nedá zrušiť.' };

  const settings = await getBookingSettings();
  const hoursLeft = (booking.startsAt.getTime() - Date.now()) / 3600000;
  if (hoursLeft < settings.cancelFreeHours) {
    return { error: `Online sa dá zrušiť najneskôr ${settings.cancelFreeHours} hodín pred začiatkom. Kontaktuj recepciu.` };
  }
  const ok = await cancelBooking(booking.id, 'customer', str(form, 'reason', 300) || null);
  if (!ok) return { error: 'Rezerváciu sa nepodarilo zrušiť. Skús to znova.' };

  const base = await getBaseUrl();
  try {
    await sendBookingCancelledEmail(user.email, user.firstName, `${base}/rezervacia`, bookingRows(booking), false);
  } catch (err) {
    console.error('[email:booking-cancel]', err);
  }
  redirect(`/rezervacia/${booking.code}?zrusena=1`);
}
