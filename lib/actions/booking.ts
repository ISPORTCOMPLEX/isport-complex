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
import { cardPaymentsEnabled } from '@/lib/payments';
import { closeOpenCheckouts, holdDeadline, refundBooking, startCheckout, sweepExpiredHolds } from '@/lib/payments/service';
import { getT } from '@/lib/i18n/server';

function allowedMethods(): PaymentMethod[] {
  return cardPaymentsEnabled() ? ['ONSITE', 'TRANSFER', 'CARD'] : ['ONSITE', 'TRANSFER'];
}

export async function createBookingAction(_prev: FormState, form: FormData): Promise<FormState> {
  const t = await getT();
  const user = await getSessionUser();
  const iso = str(form, 'datum', 10);
  const startHour = Number.parseInt(str(form, 'od', 2), 10);
  const hours = Number.parseInt(str(form, 'hodiny', 2), 10);
  const showers = str(form, 'sprchy', 2) === '1';
  if (!user) redirect(`/prihlasenie?next=${encodeURIComponent(`/rezervacia/udaje?datum=${iso}&od=${startHour}&hodiny=${hours}&sprchy=${showers ? 1 : 0}`)}`);

  const values = {
    contactName: str(form, 'contactName', 120),
    contactPhone: normalizePhone(str(form, 'contactPhone', 30)),
    teamName: str(form, 'teamName', 120),
    note: str(form, 'note', 500),
    platba: str(form, 'platba', 10),
  };
  const errors: Record<string, string> = {};
  if (!isIsoDate(iso) || !Number.isInteger(startHour) || !Number.isInteger(hours)) return { error: t('Neplatný termín. Vyber ho znova.') };
  if (values.contactName.length < 3 || !isName(values.contactName.split(' ')[0] ?? '')) errors.contactName = t('Zadaj meno a priezvisko.');
  if (!values.contactPhone || !isPhone(values.contactPhone)) errors.contactPhone = t('Zadaj telefón, aby sme ťa vedeli kontaktovať.');
  const method = allowedMethods().includes(values.platba as PaymentMethod) ? (values.platba as PaymentMethod) : null;
  if (!method) errors.platba = t('Vyber spôsob platby.');
  if (method === 'CARD' && str(form, 'presun', 12)) errors.platba = t('Pri presune zvoľ platbu na recepcii alebo prevodom.');
  if (!checked(form, 'terms')) errors.terms = t('Potvrď obchodné podmienky a storno podmienky.');
  if (Object.keys(errors).length) return { error: t('Skontroluj označené polia.'), errors, values };

  const limit = await hitLimit(`booking:create:${user.id}`, 10, 60 * 60);
  if (!limit.ok) return { error: t('Príliš veľa rezervácií za krátky čas. Skús to o {minutes} min.', { minutes: minutes(limit.retryAfterSec) }), values };

  const base = await getBaseUrl();
  // nezaplatené podržané termíny po lehote uvoľníme skôr, ako budeme kontrolovať voľný čas
  await sweepExpiredHolds(base).catch((err) => console.error('[payments:sweep]', err));
  const settings = await getBookingSettings();
  const presun = str(form, 'presun', 12);
  const old = presun ? await prisma.booking.findUnique({ where: { code: presun } }) : null;
  if (presun) {
    if (!old || old.userId !== user.id || old.status !== 'CONFIRMED' || old.paymentStatus === 'PAID') return { error: t('Túto rezerváciu nie je možné presunúť online.'), values };
    if (old.startsAt.getTime() - Date.now() < settings.cancelFreeHours * 3600000) return { error: t('Presunúť sa dá najneskôr {cancelFreeHours} hodín pred začiatkom.', { cancelFreeHours: settings.cancelFreeHours }), values };
  }
  const active = await prisma.booking.count({ where: { userId: user.id, status: 'CONFIRMED', endsAt: { gt: new Date() } } });
  if (active >= settings.maxActive && !presun) {
    return { error: t('Máš už {active} nadchádzajúcich rezervácií (najviac {maxActive}). Ďalšie ti vytvorí recepcia.', { active, maxActive: settings.maxActive }), values };
  }
  const result = await createBooking(settings, {
    movedFromCode: old?.code ?? null,
    userId: user.id,
    iso,
    startHour,
    hours,
    showers,
    contactName: values.contactName,
    contactPhone: values.contactPhone,
    teamName: values.teamName || null,
    note: values.note || null,
    paymentMethod: method!,
    cardPending: method === 'CARD',
    holdUntil: method === 'CARD' ? holdDeadline() : undefined,
  });
  if (!result.ok) return { error: result.error, values };

  if (method === 'CARD') {
    // Potvrdzujúci e-mail pošleme až po zaplatení (lib/payments/service.ts → markPaid).
    let checkout: Awaited<ReturnType<typeof startCheckout>>;
    try {
      checkout = await startCheckout(result.id, base);
    } catch (err) {
      console.error('[payments:checkout]', err);
      checkout = { ok: false, error: t('Platobná brána teraz neodpovedá.') };
    }
    if (!checkout.ok) {
      await cancelBooking(result.id, 'system', t('Platobná brána nedostupná'));
      await prisma.booking.update({ where: { id: result.id }, data: { paymentStatus: 'UNPAID', payDeadline: null } });
      return { error: t('{error} Termín sme uvoľnili – skús to znova alebo zvoľ platbu na recepcii.', { error: checkout.error }), values };
    }
    redirect(checkout.url);
  }
  if (old) {
    const cancelled = await cancelBooking(old.id, 'customer', t('Presunuté na {code}', { code: result.code }));
    if (!cancelled) {
      await cancelBooking(result.id, 'customer', t('Presun sa nepodaril'));
      return { error: t('Presun sa nepodaril, pôvodná rezervácia sa medzitým zmenila. Skontroluj Moje rezervácie.'), values };
    }
  }

  const booking = await prisma.booking.findUnique({ where: { id: result.id } });
  if (booking) {
    try {
      const site = await getSite();
      await sendBookingConfirmedEmail(t, user.email, user.firstName, `${base}/rezervacia/${booking.code}`, (m) => [...bookingRows(booking, m), ...transferRows(booking, site.iban, m)]);
    } catch (err) {
      console.error('[email:booking]', err);
    }
  }
  redirect(`/rezervacia/${result.code}?nova=1`);
}

export async function cancelMyBookingAction(_prev: FormState, form: FormData): Promise<FormState> {
  const t = await getT();
  const user = await getSessionUser();
  if (!user) redirect('/prihlasenie?next=/ucet/rezervacie');
  const code = str(form, 'code', 20);
  const booking = await prisma.booking.findUnique({ where: { code } });
  if (!booking || booking.userId !== user.id) return { error: t('Rezervácia sa nenašla.') };
  if (booking.status !== 'CONFIRMED') return { error: t('Táto rezervácia sa už nedá zrušiť.') };

  const settings = await getBookingSettings();
  const hoursLeft = (booking.startsAt.getTime() - Date.now()) / 3600000;
  // nezaplatenú rezerváciu čakajúcu na kartu sa dá zrušiť kedykoľvek
  if (hoursLeft < settings.cancelFreeHours && booking.paymentStatus !== 'PENDING') {
    return { error: t('Online sa dá zrušiť najneskôr {cancelFreeHours} hodín pred začiatkom. Kontaktuj recepciu.', { cancelFreeHours: settings.cancelFreeHours }) };
  }
  const ok = await cancelBooking(booking.id, 'customer', str(form, 'reason', 300) || null);
  if (!ok) return { error: t('Rezerváciu sa nepodarilo zrušiť. Skús to znova.') };

  const base = await getBaseUrl();
  let refund = '';
  if (booking.paymentStatus === 'PENDING') {
    await closeOpenCheckouts(booking.id);
    await prisma.booking.update({ where: { id: booking.id }, data: { paymentStatus: 'UNPAID', payDeadline: null } });
  } else if (booking.paymentMethod === 'CARD' && (booking.paymentStatus === 'PAID' || booking.paymentStatus === 'PARTIALLY_REFUNDED')) {
    // zrušenie v lehote zadarmo → celá suma späť na kartu
    try {
      const r = await refundBooking(booking.id, null, t('Zrušené zákazníkom v lehote'), null, base);
      refund = r.ok ? '&vratene=1' : '&vratenie=recepcia';
      if (!r.ok) console.error('[payments:refund-customer]', booking.code, r.error);
    } catch (err) {
      console.error('[payments:refund-customer]', booking.code, err);
      refund = '&vratenie=recepcia';
    }
  }
  try {
    await sendBookingCancelledEmail(t, user.email, user.firstName, `${base}/rezervacia`, (m) => bookingRows(booking, m), false);
  } catch (err) {
    console.error('[email:booking-cancel]', err);
  }
  redirect(`/rezervacia/${booking.code}?zrusena=1${refund}`);
}

// „Zaplatiť znova“ – zákazník sa vrátil z platobnej stránky bez zaplatenia a termín je ešte podržaný.
export async function payAgainAction(form: FormData): Promise<void> {
  const user = await getSessionUser();
  const code = str(form, 'code', 20);
  if (!user) redirect(`/prihlasenie?next=${encodeURIComponent(`/rezervacia/${code}`)}`);
  const booking = await prisma.booking.findUnique({ where: { code } });
  if (!booking || booking.userId !== user.id) redirect('/ucet/rezervacie');
  const limit = await hitLimit(`booking:payagain:${user.id}`, 10, 60 * 60);
  if (!limit.ok) redirect(`/rezervacia/${code}?platba=limit`);
  let r: Awaited<ReturnType<typeof startCheckout>>;
  try {
    r = await startCheckout(booking.id, await getBaseUrl());
  } catch (err) {
    console.error('[payments:pay-again]', code, err);
    r = { ok: false, error: '' };
  }
  redirect(r.ok ? r.url : `/rezervacia/${code}?platba=chyba`);
}
