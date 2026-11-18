import 'server-only';
import { cache } from 'react';
import { nextDays, longDayLabel } from '@/lib/dates';
import { getT } from '@/lib/i18n/server';
import { getBookingSettings } from './settings';
import { dayAvailability } from './availability';

export type IceSlot = { hour: number; ok: boolean; free: boolean; price: number }; // ok = voľné a ešte sa dá rezervovať
export type IceToday = {
  day: 'dnes' | 'zajtra' | null;
  iso: string | null;
  dayLabel: string;
  hours: string[];
  slots: IceSlot[]; // celý deň (od otvorenia), pre tabuľu „Ľad dnes“
  offPeak: number;
  peak: number;
  priceLabel: string; // „100 €“ alebo „od 100 €“, ak sa pásma líšia
};

// Najbližšie voľné hodiny ľadu (dnes, inak zajtra) – pre hlavičku a úvod. Raz za požiadavku.
export const iceToday = cache(async (): Promise<IceToday> => {
  const [s, t] = await Promise.all([getBookingSettings(), getT()]);
  const p = s.prices.full;
  const all = [p.offPeak, p.peak, p.weekend];
  const min = Math.min(...all);
  const same = all.every((v) => v === all[0]);
  const base = { offPeak: p.offPeak, peak: Math.max(p.peak, p.weekend), priceLabel: same ? `${min.toLocaleString(t.intl)} €` : t('od {price}', { price: `${min.toLocaleString(t.intl)} €` }) };
  try {
    const days = nextDays(2, t);
    for (const [i, d] of days.entries()) {
      const raw = await dayAvailability(s, d.iso);
      const slots = raw.map((x) => ({ hour: x.hour, ok: x.free && x.bookable, free: x.free, price: x.price }));
      const hours = slots.filter((x) => x.ok).map((x) => `${String(x.hour).padStart(2, '0')}:00`);
      if (hours.length) return { ...base, day: i === 0 ? 'dnes' : 'zajtra', iso: d.iso, dayLabel: longDayLabel(d.iso, t), hours, slots };
    }
  } catch {
    /* databáza nedostupná – hlavička funguje ďalej */
  }
  return { ...base, day: null, iso: null, dayLabel: '', hours: [], slots: [] };
});
