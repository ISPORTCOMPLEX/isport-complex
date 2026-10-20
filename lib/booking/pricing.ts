import type { BookingSettings } from './settings';
import { isWeekend } from './time';

// Prenajíma sa celá ľadová plocha (šatňa je v cene). Sprchy po tréningu sa pripočítajú jednou sumou.
export function hourPrice(s: BookingSettings, iso: string, hour: number): number {
  const p = s.prices.full;
  if (isWeekend(iso)) return p.weekend;
  return hour >= s.peakFromHour ? p.peak : p.offPeak;
}

export function iceCents(s: BookingSettings, iso: string, startHour: number, hours: number): number {
  let sum = 0;
  for (let h = startHour; h < startHour + hours; h++) sum += Math.round(hourPrice(s, iso, h) * 100);
  return sum;
}

export function showerCents(s: BookingSettings, showers: boolean): number {
  return showers && s.showersEnabled ? Math.round(s.showerPrice * 100) : 0;
}
