import 'server-only';
import { prisma } from '@/lib/prisma';
import type { BookingSettings } from './settings';
import { hourPrice } from './pricing';
import { addDays, hallTime, todayIso } from './time';

export type HourSlot = {
  hour: number;
  free: boolean; // celá plocha je voľná (obe polovice – kvôli starším rezerváciám polovíc)
  bookable: boolean; // nie je v minulosti ani príliš blízko
  price: number;
};

export function dayWindow(s: BookingSettings, now = new Date()) {
  const first = todayIso(now);
  return { first, last: addDays(first, s.maxDaysAhead - 1) };
}

export function inWindow(s: BookingSettings, iso: string, now = new Date()): boolean {
  const { first, last } = dayWindow(s, now);
  return iso >= first && iso <= last;
}

export async function dayAvailability(s: BookingSettings, iso: string, now = new Date()): Promise<HourSlot[]> {
  const from = hallTime(iso, s.openHour);
  const to = hallTime(iso, s.closeHour);
  const taken = await prisma.bookingSlot.findMany({ where: { slotStart: { gte: from, lt: to } }, select: { slotStart: true, half: true } });
  const busy = new Set(taken.map((t) => `${t.slotStart.getTime()}|${t.half}`));
  const cutoff = now.getTime() + s.leadMinutes * 60 * 1000;
  const out: HourSlot[] = [];
  for (let h = s.openHour; h < s.closeHour; h++) {
    const t = hallTime(iso, h).getTime();
    out.push({ hour: h, free: !busy.has(`${t}|A`) && !busy.has(`${t}|B`), bookable: t >= cutoff, price: hourPrice(s, iso, h) });
  }
  return out;
}
