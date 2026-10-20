import 'server-only';
import { cache } from 'react';
import { prisma } from '@/lib/prisma';

// Nastavenia rezervácií. Kým ich administrátor neuloží, platia DOČASNÉ hodnoty nižšie.

export type AreaPrices = { offPeak: number; peak: number; weekend: number };

export type BookingSettings = {
  prices: { full: AreaPrices }; // € s DPH za 60 minút, celá plocha
  showerPrice: number; // € za sprchy k rezervácii (šatňa je v cene)
  showersEnabled: boolean; // ponúkať sprchy pri rezervácii
  peakFromHour: number; // od tejto hodiny v pracovné dni platí špička
  openHour: number; // prvá hodina, ktorá sa dá rezervovať
  closeHour: number; // ľad končí o tejto hodine
  cancelFreeHours: number; // bezplatné zrušenie online
  leadMinutes: number; // najneskôr koľko minút pred začiatkom sa dá rezervovať
  maxDaysAhead: number; // ako ďaleko dopredu
  maxHours: number; // najviac hodín v jednej rezervácii
  maxActive: number; // najviac nadchádzajúcich rezervácií na jeden účet (ochrana pred blokovaním kalendára)
  temporary: boolean; // true = ešte neboli zadané skutočné hodnoty
};

export const DEFAULT_SETTINGS: BookingSettings = {
  prices: {
    full: { offPeak: 140, peak: 180, weekend: 180 },
  },
  showerPrice: 20,
  showersEnabled: true,
  peakFromHour: 16,
  openHour: 6,
  closeHour: 23,
  cancelFreeHours: 48,
  leadMinutes: 60,
  maxDaysAhead: 30,
  maxHours: 3,
  maxActive: 6,
  temporary: true,
};

const KEY = 'booking';

function num(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

export function normalizeSettings(raw: unknown): BookingSettings {
  const r = (raw ?? {}) as Record<string, any>;
  const d = DEFAULT_SETTINGS;
  const area = (x: any, def: AreaPrices): AreaPrices => ({
    offPeak: num(x?.offPeak, def.offPeak, 0, 10000),
    peak: num(x?.peak, def.peak, 0, 10000),
    weekend: num(x?.weekend, def.weekend, 0, 10000),
  });
  const openHour = num(r.openHour, d.openHour, 0, 23);
  const closeHour = num(r.closeHour, d.closeHour, openHour + 1, 24);
  return {
    prices: { full: area(r.prices?.full, d.prices.full) },
    showerPrice: num(r.showerPrice ?? r.lockerPrice, d.showerPrice, 0, 1000),
    showersEnabled: r.showersEnabled === undefined ? d.showersEnabled : Boolean(r.showersEnabled),
    peakFromHour: num(r.peakFromHour, d.peakFromHour, 0, 24),
    openHour,
    closeHour,
    cancelFreeHours: num(r.cancelFreeHours, d.cancelFreeHours, 0, 720),
    leadMinutes: num(r.leadMinutes, d.leadMinutes, 0, 10080),
    maxDaysAhead: num(r.maxDaysAhead, d.maxDaysAhead, 1, 365),
    maxHours: num(r.maxHours, d.maxHours, 1, 12),
    maxActive: num(r.maxActive, d.maxActive, 1, 100),
    temporary: r.temporary === undefined ? true : Boolean(r.temporary),
  };
}

export const getBookingSettings = cache(async (): Promise<BookingSettings> => {
  try {
    const row = await prisma.setting.findUnique({ where: { key: KEY } });
    return row ? normalizeSettings(row.value) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
});

export async function saveBookingSettings(value: BookingSettings, userId: string): Promise<void> {
  const v = JSON.parse(JSON.stringify(value));
  await prisma.setting.upsert({ where: { key: KEY }, create: { key: KEY, value: v, updatedBy: userId }, update: { value: v, updatedBy: userId } });
}
