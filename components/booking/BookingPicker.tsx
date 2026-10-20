'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { DayOption } from '@/lib/dates';
import { ArrowRight } from '@/components/Icons';
import { RinkPlan } from '@/components/Rink';

type Slot = { hour: number; freeA: boolean; freeB: boolean; bookable: boolean; priceFull: number; priceHalf: number };
type Area = 'cela' | 'polovica';

type Props = {
  days: DayOption[];
  iso: string;
  slots: Slot[];
  initialArea: Area;
  initialHour: number | null;
  maxHours: number;
  presun?: string | null;
};

const pad = (h: number) => `${String(h).padStart(2, '0')}:00`;
const eur = (v: number) => `${v.toLocaleString('sk-SK')} €`;

function freeFor(s: Slot, area: Area, half?: 'A' | 'B'): boolean {
  if (!s.bookable) return false;
  if (area === 'cela') return s.freeA && s.freeB;
  if (half === 'A') return s.freeA;
  if (half === 'B') return s.freeB;
  return s.freeA || s.freeB;
}

// Kalendár voľných hodín. Dostupnosť a cenu na konci aj tak znova overí server.
export function BookingPicker({ days, iso, slots, initialArea, initialHour, maxHours, presun = null }: Props) {
  const [area, setArea] = useState<Area>(initialArea);
  const [start, setStart] = useState<number | null>(initialHour !== null && slots.some((s) => s.hour === initialHour && freeFor(s, initialArea)) ? initialHour : null);
  const [count, setCount] = useState(1);

  const byHour = useMemo(() => new Map(slots.map((s) => [s.hour, s])), [slots]);

  // Koľko hodín za sebou sa dá od začiatku rezervovať (pri polovici rovnaká polovica celý čas).
  const maxFrom = (h: number, a: Area): number => {
    const run = (half?: 'A' | 'B') => {
      let n = 0;
      while (n < maxHours) {
        const s = byHour.get(h + n);
        if (!s || !freeFor(s, a, half)) break;
        n++;
      }
      return n;
    };
    return a === 'cela' ? run() : Math.max(run('A'), run('B'));
  };

  const possible = start === null ? 0 : maxFrom(start, area);
  const hours = Math.min(count, Math.max(possible, 1));
  const valid = start !== null && possible >= 1;
  const total = valid ? Array.from({ length: hours }, (_, i) => byHour.get(start! + i)).reduce((sum, s) => sum + (s ? (area === 'cela' ? s.priceFull : s.priceHalf) : 0), 0) : 0;
  const selectedDay = days.find((d) => d.iso === iso) ?? days[0];

  const pickArea = (a: Area) => {
    setArea(a);
    if (start !== null && maxFrom(start, a) === 0) setStart(null);
  };
  const pickHour = (h: number) => {
    setStart(h);
    setCount((c) => Math.min(c, Math.max(maxFrom(h, area), 1)));
  };

  const tail = presun ? `&presun=${presun}` : '';
  const next = valid ? `/rezervacia/udaje?datum=${iso}&od=${start}&hodiny=${hours}&plocha=${area}${tail}` : null;
  const anyFree = slots.some((s) => freeFor(s, area));

  return (
    <div className="rez">
      <div className="rez__main">
        <div className="rez__block">
          <h2 className="rez__label">1. Plocha</h2>
          <div className="rez__areas">
            <button type="button" className="rez__area" aria-pressed={area === 'cela'} onClick={() => pickArea('cela')}>
              <RinkPlan highlight="full" muted={area !== 'cela'} />
              <span>
                <strong>Celá plocha</strong>
                <small>Tímový tréning, zápas</small>
              </span>
            </button>
            <button type="button" className="rez__area" aria-pressed={area === 'polovica'} onClick={() => pickArea('polovica')}>
              <RinkPlan highlight="half" muted={area !== 'polovica'} />
              <span>
                <strong>Polovica plochy</strong>
                <small>Individuálny tréning, brankári</small>
              </span>
            </button>
          </div>
        </div>

        <div className="rez__block">
          <h2 className="rez__label">2. Deň</h2>
          <nav className="rez__days" aria-label="Deň">
            {days.map((d) => (
              <Link
                key={d.iso}
                href={`/rezervacia?datum=${d.iso}&plocha=${area}${presun ? `&presun=${presun}` : ''}`}
                className={`day${d.weekend ? ' day--weekend' : ''}`}
                aria-current={d.iso === iso ? 'date' : undefined}
                aria-label={d.label}
                scroll={false}
              >
                <small>{d.short}</small>
                <b>{d.num}</b>
              </Link>
            ))}
          </nav>
        </div>

        <div className="rez__block">
          <div className="rez__label-row">
            <h2 className="rez__label">3. Začiatok · {selectedDay?.label}</h2>
            <div className="rez__legend" aria-hidden="true">
              <span><i className="lg lg--free" />Voľné</span>
              <span><i className="lg lg--taken" />Obsadené</span>
              <span><i className="lg lg--sel" />Tvoj výber</span>
            </div>
          </div>
          {anyFree ? null : <p className="muted rez__none">V tento deň už nie je voľný čas pre {area === 'cela' ? 'celú plochu' : 'polovicu'}. Skús iný deň alebo polovicu plochy.</p>}
          <div className="rez__slots" role="group" aria-label="Začiatok">
            {slots.map((s) => {
              const free = freeFor(s, area);
              const inSel = valid && s.hour >= start! && s.hour < start! + hours;
              const price = area === 'cela' ? s.priceFull : s.priceHalf;
              const halfNote = area === 'polovica' && free && s.freeA !== s.freeB ? 'posledná polovica' : '';
              return (
                <button
                  key={s.hour}
                  type="button"
                  className={`rez-slot${inSel ? ' rez-slot--sel' : ''}${free ? '' : ' rez-slot--off'}`}
                  disabled={!free}
                  aria-pressed={inSel}
                  onClick={() => pickHour(s.hour)}
                >
                  <b>{pad(s.hour)}</b>
                  <small>{!s.bookable ? 'nedostupné' : free ? halfNote || eur(price) : 'obsadené'}</small>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="rez__side">
        <div className="booker-frame rez__summary-frame">
          <div className="booker glass rez__summary">
            <h2 className="rez__label">Tvoja rezervácia</h2>
            <dl className="rez__dl">
              <div>
                <dt>Plocha</dt>
                <dd>{area === 'cela' ? 'Celá plocha' : 'Polovica plochy'}</dd>
              </div>
              <div>
                <dt>Deň</dt>
                <dd>{selectedDay?.label}</dd>
              </div>
              <div>
                <dt>Čas</dt>
                <dd>{valid ? `${pad(start!)} – ${pad(start! + hours)}` : 'Vyber začiatok'}</dd>
              </div>
            </dl>
            <div className="rez__count">
              <span>Dĺžka</span>
              <div className="rez__stepper">
                <button type="button" aria-label="Kratšie" disabled={!valid || hours <= 1} onClick={() => setCount(Math.max(1, hours - 1))}>
                  −
                </button>
                <strong>
                  {hours} {hours === 1 ? 'hodina' : hours <= 4 ? 'hodiny' : 'hodín'}
                </strong>
                <button type="button" aria-label="Dlhšie" disabled={!valid || hours >= possible} onClick={() => setCount(Math.min(possible, hours + 1))}>
                  +
                </button>
              </div>
            </div>
            <div className="rez__total">
              <small>Spolu s DPH</small>
              <strong className="num">{valid ? eur(total) : '—'}</strong>
            </div>
            {next ? (
              <Link href={next} className="btn btn--icon btn--full">
                Pokračovať
                <span className="btn__ic">
                  <ArrowRight />
                </span>
              </Link>
            ) : (
              <span className="btn btn--full adm-disabled" aria-disabled="true">
                Vyber čas
              </span>
            )}
            <p className="muted rez__fine">Šatňa a úprava ľadu sú v cene. Platíš na recepcii alebo prevodom.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
