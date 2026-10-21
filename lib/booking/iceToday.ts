import 'server-only';
import { cache } from 'react';
import { nextDays } from '@/lib/dates';
import { getBookingSettings } from './settings';
import { dayAvailability } from './availability';

export type IceToday = { day: 'dnes' | 'zajtra' | null; hours: string[]; offPeak: number; peak: number };

// Najbližšie voľné hodiny ľadu (dnes, inak zajtra) – pre hlavičku a úvod. Raz za požiadavku.
export const iceToday = cache(async (): Promise<IceToday> => {
  const s = await getBookingSettings();
  const p = s.prices.full;
  const base = { offPeak: p.offPeak, peak: Math.max(p.peak, p.weekend) };
  try {
    const days = nextDays(2);
    for (const [i, d] of days.entries()) {
      const slots = await dayAvailability(s, d.iso);
      const hours = slots.filter((x) => x.free && x.bookable).map((x) => `${x.hour}:00`);
      if (hours.length) return { ...base, day: i === 0 ? 'dnes' : 'zajtra', hours };
    }
  } catch {
    /* databáza nedostupná – hlavička funguje ďalej */
  }
  return { ...base, day: null, hours: [] };
});
