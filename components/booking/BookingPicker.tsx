'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { DayOption } from '@/lib/dates';

type Slot = { hour: number; free: boolean; bookable: boolean; price: number };

type Props = {
  days: DayOption[];
  iso: string;
  slots: Slot[];
  initialHour: number | null;
  initialRooms: number;
  maxHours: number;
  lockerRooms: number;
  lockerPrice: number;
  presun?: string | null;
};

const pad = (h: number) => `${String(h).padStart(2, '0')}:00`;
const eur = (v: number) => `${v.toLocaleString('sk-SK')} €`;
const hoursWord = (n: number) => (n === 1 ? 'hodina' : n <= 4 ? 'hodiny' : 'hodín');

// Výber termínu: celá ľadová plocha + šatne. Dostupnosť aj cenu na konci znova overí server.
export function BookingPicker({ days, iso, slots, initialHour, initialRooms, maxHours, lockerRooms, lockerPrice, presun = null }: Props) {
  const ok = (s: Slot | undefined) => Boolean(s && s.free && s.bookable);
  const byHour = useMemo(() => new Map(slots.map((s) => [s.hour, s])), [slots]);
  const [start, setStart] = useState<number | null>(initialHour !== null && ok(byHour.get(initialHour)) ? initialHour : null);
  const [count, setCount] = useState(1);
  const [rooms, setRooms] = useState(Math.min(Math.max(initialRooms, 0), lockerRooms));

  const runFrom = (h: number) => {
    let n = 0;
    while (n < maxHours && ok(byHour.get(h + n))) n++;
    return n;
  };
  const possible = start === null ? 0 : runFrom(start);
  const hours = Math.min(count, Math.max(possible, 1));
  const valid = start !== null && possible >= 1;
  const ice = valid ? Array.from({ length: hours }, (_, i) => byHour.get(start! + i)?.price ?? 0).reduce((a, b) => a + b, 0) : 0;
  const lockers = rooms * lockerPrice;
  const day = days.find((d) => d.iso === iso) ?? days[0];
  const tail = presun ? `&presun=${presun}` : '';
  const next = valid ? `/rezervacia/udaje?datum=${iso}&od=${start}&hodiny=${hours}&satne=${rooms}${tail}` : null;
  const anyFree = slots.some((s) => ok(s));

  return (
    <div className="rz-grid">
      <div className="rz-main">
        <section className="rz-step">
          <h2 className="rz-h">
            <span>1</span>Deň
          </h2>
          <nav className="rz-days" aria-label="Deň">
            {days.map((d) => (
              <Link
                key={d.iso}
                href={`/rezervacia?datum=${d.iso}&satne=${rooms}${tail}`}
                className={`rz-day${d.weekend ? ' rz-day--we' : ''}`}
                aria-current={d.iso === iso ? 'date' : undefined}
                aria-label={d.label}
                scroll={false}
              >
                <small>{d.short}</small>
                <b>{d.num}</b>
              </Link>
            ))}
          </nav>
        </section>

        <section className="rz-step">
          <div className="rz-step__row">
            <h2 className="rz-h">
              <span>2</span>Čas · {day?.label}
            </h2>
            <span className="rz-note">Šrafované = obsadené</span>
          </div>
          {anyFree ? null : <p className="rz-empty">V tento deň už nie je voľný čas. Vyber si iný deň.</p>}
          <div className="rz-slots" role="group" aria-label="Začiatok">
            {slots.map((s) => {
              const free = ok(s);
              const sel = valid && s.hour >= start! && s.hour < start! + hours;
              return (
                <button
                  key={s.hour}
                  type="button"
                  className={`rz-slot${sel ? ' rz-slot--sel' : ''}${free ? '' : ' rz-slot--off'}`}
                  disabled={!free}
                  aria-pressed={sel}
                  onClick={() => {
                    setStart(s.hour);
                    setCount((c) => Math.min(c, Math.max(runFrom(s.hour), 1)));
                  }}
                >
                  <b>{pad(s.hour)}</b>
                  <small>{!s.bookable ? 'nedostupné' : s.free ? eur(s.price) : 'obsadené'}</small>
                </button>
              );
            })}
          </div>
        </section>

        {lockerRooms > 0 ? (
          <section className="rz-step">
            <h2 className="rz-h">
              <span>3</span>Šatne
            </h2>
            <div className="rz-lockers">
              <div>
                <strong>Koľko šatní potrebuješ?</strong>
                <span>
                  {eur(lockerPrice)} za šatňu na celý čas rezervácie. K dispozícii {lockerRooms}.
                </span>
              </div>
              <div className="rz-stepper">
                <button type="button" aria-label="Menej šatní" disabled={rooms <= 0} onClick={() => setRooms(rooms - 1)}>
                  −
                </button>
                <strong aria-live="polite">{rooms}</strong>
                <button type="button" aria-label="Viac šatní" className="rz-stepper__plus" disabled={rooms >= lockerRooms} onClick={() => setRooms(rooms + 1)}>
                  +
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <aside className="rz-sum">
        <h2 className="rz-sum__title">Tvoja rezervácia</h2>
        <dl className="rz-rows">
          <div>
            <dt>Plocha</dt>
            <dd>Celá ľadová plocha</dd>
          </div>
          <div>
            <dt>Termín</dt>
            <dd>{valid ? `${day?.label} · ${pad(start!)} – ${pad(start! + hours)}` : 'Vyber čas'}</dd>
          </div>
          <div>
            <dt>Ľad{valid ? `, ${hours} ${hoursWord(hours)}` : ''}</dt>
            <dd>{valid ? eur(ice) : '—'}</dd>
          </div>
          {lockerRooms > 0 ? (
            <div>
              <dt>Šatne{rooms ? `, ${rooms} × ${eur(lockerPrice)}` : ''}</dt>
              <dd>{rooms ? eur(lockers) : 'bez šatne'}</dd>
            </div>
          ) : null}
        </dl>
        <div className="rz-len">
          <span>Dĺžka</span>
          <div className="rz-stepper rz-stepper--dark">
            <button type="button" aria-label="Kratšie" disabled={!valid || hours <= 1} onClick={() => setCount(Math.max(1, hours - 1))}>
              −
            </button>
            <strong>
              {hours} {hoursWord(hours)}
            </strong>
            <button type="button" aria-label="Dlhšie" disabled={!valid || hours >= possible} onClick={() => setCount(Math.min(possible, hours + 1))}>
              +
            </button>
          </div>
        </div>
        <div className="rz-total">
          <span>Spolu s DPH</span>
          <strong>{valid ? eur(ice + lockers) : '—'}</strong>
        </div>
        {next ? (
          <Link href={next} className="rz-cta">
            Pokračovať na údaje
            <span aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 14 14">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              </svg>
            </span>
          </Link>
        ) : (
          <span className="rz-cta rz-cta--off" aria-disabled="true">
            Najprv vyber čas
          </span>
        )}
        <p className="rz-fine">Úprava ľadu je v cene. Platíš na recepcii alebo prevodom.</p>
      </aside>
    </div>
  );
}
