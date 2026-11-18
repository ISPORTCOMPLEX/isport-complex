// Dátumy v časovom pásme haly (Košice), nezávisle od servera (Vercel beží v UTC).
// Názvy dní a mesiacov v jazyku návštevníka (t.intl).
import type { T } from '@/lib/i18n/translate';

export const HALL_TZ = 'Europe/Bratislava';

export type DayOption = { iso: string; short: string; num: string; weekend: boolean; label: string; today: boolean };

function todayParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: HALL_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get('year'), m: get('month'), d: get('day') };
}

export function nextDays(count: number, t: T, now = new Date()): DayOption[] {
  const { y, m, d } = todayParts(now);
  const weekday = new Intl.DateTimeFormat(t.intl, { timeZone: 'UTC', weekday: 'short' });
  const long = new Intl.DateTimeFormat(t.intl, { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'numeric' });
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(y, m - 1, d + i));
    const dow = date.getUTCDay();
    const wd = weekday.format(date).replace('.', '');
    return {
      iso: date.toISOString().slice(0, 10),
      short: i === 0 ? t('Dnes') : wd.charAt(0).toUpperCase() + wd.slice(1),
      today: i === 0,
      num: String(date.getUTCDate()),
      weekend: dow === 0 || dow === 6,
      label: long.format(date),
    };
  });
}

// „štvrtok 22. 10.“ (s rokom: „štvrtok 22. 10. 2026“) – pre súhrny a tabuľu „Ľad dnes“.
// V iných jazykoch podľa ich zvyklostí („Thursday 22/10“, „Donnerstag, 22.10.“).
export function longDayLabel(iso: string, t: T, withYear = false): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (t.locale === 'sk' || t.locale === 'cs') {
    const wd = new Intl.DateTimeFormat(t.intl, { timeZone: 'UTC', weekday: 'long' }).format(date);
    return `${wd} ${d}. ${m}.${withYear ? ` ${y}` : ''}`;
  }
  return new Intl.DateTimeFormat(t.intl, { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'numeric', ...(withYear ? { year: 'numeric' } : {}) }).format(date);
}

// Len názov dňa s veľkým začiatočným písmenom („Štvrtok“, „Thursday“).
export function weekdayName(iso: string, t: T): string {
  const [y, m, d] = iso.split('-').map(Number);
  const wd = new Intl.DateTimeFormat(t.intl, { timeZone: 'UTC', weekday: 'long' }).format(new Date(Date.UTC(y, m - 1, d)));
  return wd.charAt(0).toUpperCase() + wd.slice(1);
}

export function monthLabel(iso: string, t: T): string {
  const [y, m] = iso.split('-').map(Number);
  // samostatný tvar mesiaca (nominatív): „november“, „Ноябрь“
  const name = new Intl.DateTimeFormat(t.intl, { timeZone: 'UTC', month: 'long' }).formatToParts(new Date(Date.UTC(y, m - 1, 1))).find((p) => p.type === 'month')?.value ?? '';
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
}

// Skratky dní pondelok → nedeľa v jazyku návštevníka („Po, Ut…“, „Mon, Tue…“).
export function weekdaysShort(intl: string): string[] {
  const f = new Intl.DateTimeFormat(intl, { timeZone: 'UTC', weekday: 'short' });
  // 1. 1. 2024 bol pondelok
  return Array.from({ length: 7 }, (_, i) => {
    const s = f.format(new Date(Date.UTC(2024, 0, 1 + i))).replace(/\.$/, '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  });
}
