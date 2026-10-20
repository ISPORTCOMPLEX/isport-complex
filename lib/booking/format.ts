import { euros, fmtDayLong, fmtRange } from './time';

export const AREA_LABEL: Record<string, string> = { FULL: 'Celá plocha', HALF_A: 'Polovica A', HALF_B: 'Polovica B' };
export const AREA_SHORT: Record<string, string> = { FULL: 'Celá', HALF_A: 'Pol. A', HALF_B: 'Pol. B' };
export const STATUS_LABEL: Record<string, string> = { CONFIRMED: 'Potvrdená', CANCELLED: 'Zrušená', COMPLETED: 'Odohraná', NO_SHOW: 'Neprišiel' };
export const PAYMENT_LABEL: Record<string, string> = { UNPAID: 'Nezaplatená', PAID: 'Zaplatená', REFUNDED: 'Vrátená' };
export const METHOD_LABEL: Record<string, string> = { ONSITE: 'Na recepcii', TRANSFER: 'Bankovým prevodom', CARD: 'Kartou online' };

type B = { code: string; area: string; startsAt: Date; endsAt: Date; priceCents: number; paymentMethod: string };

export function bookingRows(b: B) {
  return [
    { label: 'Kód rezervácie', value: b.code },
    { label: 'Dátum', value: fmtDayLong(b.startsAt) },
    { label: 'Čas', value: fmtRange(b.startsAt, b.endsAt) },
    { label: 'Plocha', value: AREA_LABEL[b.area] ?? b.area },
    { label: 'Cena', value: euros(b.priceCents) },
    { label: 'Platba', value: METHOD_LABEL[b.paymentMethod] ?? b.paymentMethod },
  ];
}
