import { euros, fmtDayLong, fmtRange } from './time';
import { msg, type T } from '@/lib/i18n/translate';

// Popisy sú slovenské kľúče prekladu – na webe/v e-maile vždy cez t(...).

export const AREA_LABEL: Record<string, string> = { FULL: msg('Celá ľadová plocha'), HALF_A: msg('Polovica A (staršia rezervácia)'), HALF_B: msg('Polovica B (staršia rezervácia)') };
export const AREA_SHORT: Record<string, string> = { FULL: msg('Celá'), HALF_A: msg('Pol. A'), HALF_B: msg('Pol. B') };
export const STATUS_LABEL: Record<string, string> = { CONFIRMED: msg('Potvrdená'), CANCELLED: msg('Zrušená'), COMPLETED: msg('Odohraná'), NO_SHOW: msg('Neprišiel') };
export const PAYMENT_LABEL: Record<string, string> = { UNPAID: msg('Nezaplatená'), PENDING: msg('Čaká na platbu kartou'), PAID: msg('Zaplatená'), PARTIALLY_REFUNDED: msg('Čiastočne vrátená'), REFUNDED: msg('Vrátená') };
export const METHOD_LABEL: Record<string, string> = { ONSITE: msg('Na recepcii'), TRANSFER: msg('Bankovým prevodom'), CARD: msg('Kartou online') };

type B = { code: string; area: string; startsAt: Date; endsAt: Date; priceCents: number; paymentMethod: string; showers?: number };

// Riadky súhrnu rezervácie (e-maily, platobná brána) v jazyku t.
export function bookingRows(b: B, t: T) {
  return [
    { label: t('Kód rezervácie'), value: b.code },
    { label: t('Dátum'), value: fmtDayLong(b.startsAt, t) },
    { label: t('Čas'), value: fmtRange(b.startsAt, b.endsAt) },
    { label: t('Plocha'), value: AREA_LABEL[b.area] ? t(AREA_LABEL[b.area]) : b.area },
    { label: t('Sprchy'), value: b.showers ? t('áno') : t('nie') },
    { label: t('Cena'), value: euros(b.priceCents) },
    { label: t('Platba'), value: METHOD_LABEL[b.paymentMethod] ? t(METHOD_LABEL[b.paymentMethod]) : b.paymentMethod },
  ];
}

export function transferRows(b: { number: number; code: string; priceCents: number; paymentMethod: string; paymentStatus: string }, iban: string, t: T) {
  if (b.paymentMethod !== 'TRANSFER' || b.paymentStatus === 'PAID' || !iban) return [];
  return [
    { label: 'IBAN', value: iban },
    { label: t('Variabilný symbol'), value: String(b.number) },
    { label: t('Správa pre príjemcu'), value: b.code },
  ];
}
