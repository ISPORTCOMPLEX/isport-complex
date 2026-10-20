import type { BookingSettings } from './settings';
import { isWeekend } from './time';

export type AreaChoice = 'cela' | 'polovica';

// Cena jednej hodiny v eurách podľa dňa a času.
export function hourPrice(s: BookingSettings, area: AreaChoice, iso: string, hour: number): number {
  const p = area === 'cela' ? s.prices.full : s.prices.half;
  if (isWeekend(iso)) return p.weekend;
  return hour >= s.peakFromHour ? p.peak : p.offPeak;
}

export function totalCents(s: BookingSettings, area: AreaChoice, iso: string, startHour: number, hours: number): number {
  let sum = 0;
  for (let h = startHour; h < startHour + hours; h++) sum += Math.round(hourPrice(s, area, iso, h) * 100);
  return sum;
}
