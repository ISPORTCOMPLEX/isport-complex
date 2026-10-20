import type { BookingSettings } from './settings';
import { isWeekend } from './time';

// Prenajíma sa celá ľadová plocha. Cena hodiny podľa dňa a času, šatne sa pripočítajú za kus.
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

export function lockerCents(s: BookingSettings, rooms: number): number {
  return Math.round(s.lockerPrice * 100) * rooms;
}

export function totalCents(s: BookingSettings, iso: string, startHour: number, hours: number, rooms: number): number {
  return iceCents(s, iso, startHour, hours) + lockerCents(s, rooms);
}
