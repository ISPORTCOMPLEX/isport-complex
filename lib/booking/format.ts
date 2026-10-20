import { euros, fmtDayLong, fmtRange } from './time';

export const AREA_LABEL: Record<string, string> = { FULL: 'Celá ľadová plocha', HALF_A: 'Polovica A (staršia rezervácia)', HALF_B: 'Polovica B (staršia rezervácia)' };
export const AREA_SHORT: Record<string, string> = { FULL: 'Celá', HALF_A: 'Pol. A', HALF_B: 'Pol. B' };
export const STATUS_LABEL: Record<string, string> = { CONFIRMED: 'Potvrdená', CANCELLED: 'Zrušená', COMPLETED: 'Odohraná', NO_SHOW: 'Neprišiel' };
export const PAYMENT_LABEL: Record<string, string> = { UNPAID: 'Nezaplatená', PAID: 'Zaplatená', REFUNDED: 'Vrátená' };
export const METHOD_LABEL: Record<string, string> = { ONSITE: 'Na recepcii', TRANSFER: 'Bankovým prevodom', CARD: 'Kartou online' };

type B = { code: string; area: string; startsAt: Date; endsAt: Date; priceCents: number; paymentMethod: string; showers?: number };

export function bookingRows(b: B) {
  return [
    { label: 'Kód rezervácie', value: b.code },
    { label: 'Dátum', value: fmtDayLong(b.startsAt) },
    { label: 'Čas', value: fmtRange(b.startsAt, b.endsAt) },
    { label: 'Plocha', value: AREA_LABEL[b.area] ?? b.area },
    { label: 'Sprchy', value: b.showers ? 'áno' : 'nie' },
    { label: 'Cena', value: euros(b.priceCents) },
    { label: 'Platba', value: METHOD_LABEL[b.paymentMethod] ?? b.paymentMethod },
  ];
}

export function transferRows(b: { number: number; code: string; priceCents: number; paymentMethod: string; paymentStatus: string }, iban: string) {
  if (b.paymentMethod !== 'TRANSFER' || b.paymentStatus === 'PAID' || !iban) return [];
  return [
    { label: 'IBAN', value: iban },
    { label: 'Variabilný symbol', value: String(b.number) },
    { label: 'Správa pre príjemcu', value: b.code },
  ];
}
