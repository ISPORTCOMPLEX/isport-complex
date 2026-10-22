// Dátumy v časovom pásme haly (Košice), nezávisle od servera (Vercel beží v UTC).

export const HALL_TZ = 'Europe/Bratislava';

export type DayOption = { iso: string; short: string; num: string; weekend: boolean; label: string };

function todayParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: HALL_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get('year'), m: get('month'), d: get('day') };
}

export function nextDays(count: number, now = new Date()): DayOption[] {
  const { y, m, d } = todayParts(now);
  const weekday = new Intl.DateTimeFormat('sk-SK', { timeZone: 'UTC', weekday: 'short' });
  const long = new Intl.DateTimeFormat('sk-SK', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'numeric' });
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(y, m - 1, d + i));
    const dow = date.getUTCDay();
    const wd = weekday.format(date).replace('.', '');
    return {
      iso: date.toISOString().slice(0, 10),
      short: i === 0 ? 'Dnes' : wd.charAt(0).toUpperCase() + wd.slice(1),
      num: String(date.getUTCDate()),
      weekend: dow === 0 || dow === 6,
      label: long.format(date),
    };
  });
}

// „štvrtok 22. 10.“ (s rokom: „štvrtok 22. 10. 2026“) – pre súhrny a tabuľu „Ľad dnes“.
export function longDayLabel(iso: string, withYear = false): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const wd = new Intl.DateTimeFormat('sk-SK', { timeZone: 'UTC', weekday: 'long' }).format(date);
  return `${wd} ${d}. ${m}.${withYear ? ` ${y}` : ''}`;
}

export function monthLabel(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  const name = new Intl.DateTimeFormat('sk-SK', { timeZone: 'UTC', month: 'long' }).format(new Date(Date.UTC(y, m - 1, 1)));
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
}
