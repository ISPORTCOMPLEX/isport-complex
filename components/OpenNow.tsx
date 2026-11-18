'use client';

import { useEffect, useState } from 'react';

// „Teraz otvorené · do 23:00“ podľa otváracích hodín (Po–Pi, Sobota, Nedeľa) a času v Košiciach.
// Počíta sa až v prehliadači, aby nebol zastaraný text z vyrovnávacej pamäte. Bez hodín sa nezobrazí nič.
type Hours = { days: string; time: string }[];

function parse(t: string): [number, number] | null {
  const m = /(\d{1,2})[:.](\d{2})\s*[–-]\s*(\d{1,2})[:.](\d{2})/.exec(t);
  if (!m) return null;
  return [Number(m[1]) * 60 + Number(m[2]), Number(m[3]) * 60 + Number(m[4])];
}
export function openState(hours: Hours, now: Date): { open: boolean; text: string } | null {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Bratislava', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
  const wd = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const min = (Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24) * 60 + Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  const idx = wd === 'Sat' ? 1 : wd === 'Sun' ? 2 : 0;
  const today = parse(hours[idx]?.time ?? '');
  if (!today) return null;
  const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  if (min >= today[0] && min < today[1]) return { open: true, text: `Teraz otvorené · do ${hhmm(today[1])}` };
  if (min < today[0]) return { open: false, text: `Zatvorené · otvárame o ${hhmm(today[0])}` };
  return { open: false, text: 'Zatvorené · otvárame zajtra' };
}

export function OpenNow({ hours, className = '' }: { hours: Hours; className?: string }) {
  const [s, setS] = useState<ReturnType<typeof openState>>(null);
  useEffect(() => {
    const tick = () => setS(openState(hours, new Date()));
    tick();
    const id = window.setInterval(tick, 60000);
    return () => window.clearInterval(id);
  }, [hours]);
  if (!s) return null;
  return <p className={`open-now${s.open ? ' is-open' : ''} ${className}`}>{s.text}</p>;
}
