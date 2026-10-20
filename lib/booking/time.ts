// Čas v hale (Europe/Bratislava) – server na Verceli beží v UTC, preto všetko prepočítavame tu.
// Rezervuje sa po celých hodinách miestneho času.

export const HALL_TZ = 'Europe/Bratislava';

const partsFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: HALL_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function hallParts(date: Date) {
  const p = partsFmt.formatToParts(date);
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour'), min: get('minute') };
}

function offsetMs(date: Date): number {
  const { y, m, d, h, min } = hallParts(date);
  return Date.UTC(y, m - 1, d, h, min) - Math.floor(date.getTime() / 60000) * 60000;
}

export function isIsoDate(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// Miestny dátum + hodina → presný okamih (UTC). Zvláda aj zmenu letného času.
export function hallTime(iso: string, hour: number): Date {
  const [y, m, d] = iso.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, hour);
  let t = guess - offsetMs(new Date(guess));
  t = guess - offsetMs(new Date(t));
  return new Date(t);
}

export function todayIso(now = new Date()): string {
  const { y, m, d } = hallParts(now);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function isoOf(date: Date): string {
  return todayIso(date);
}

export function isWeekend(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow === 0 || dow === 6;
}

export const pad2 = (h: number) => `${String(h).padStart(2, '0')}:00`;

const dayLong = new Intl.DateTimeFormat('sk-SK', { timeZone: HALL_TZ, weekday: 'long', day: 'numeric', month: 'long' });
const dayShort = new Intl.DateTimeFormat('sk-SK', { timeZone: HALL_TZ, weekday: 'short', day: 'numeric', month: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('sk-SK', { timeZone: HALL_TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export function fmtDayLong(d: Date): string {
  const s = dayLong.format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function fmtDayShort(d: Date): string {
  return dayShort.format(d);
}

export function fmtTime(d: Date): string {
  return timeFmt.format(d);
}

export function fmtRange(start: Date, end: Date): string {
  return `${fmtTime(start)} – ${fmtTime(end)}`;
}

export function euros(cents: number): string {
  return `${(cents / 100).toLocaleString('sk-SK', { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })} €`;
}
