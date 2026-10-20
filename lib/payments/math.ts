// Čisté výpočty bez databázy – kvôli testom.

export type RefundStatus = 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED';

export function refundState(paidCents: number, refundedCents: number): RefundStatus | null {
  if (paidCents <= 0) return null;
  if (refundedCents <= 0) return 'PAID';
  return refundedCents >= paidCents ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
}

// Suma zadaná v administrácii („12,50“ alebo „12.5“) → centy; null = neplatná suma.
export function parseEuroInput(input: string): number | null {
  const t = input.trim().replace(/\s|€/g, '').replace(',', '.');
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(t)) return null;
  const cents = Math.round(Number(t) * 100);
  return cents > 0 ? cents : null;
}
