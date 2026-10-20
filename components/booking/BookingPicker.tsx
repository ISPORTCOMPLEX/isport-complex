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
  initialShowers: boolean;
  maxHours: number;
  showersEnabled: boolean;
  showerPrice: number;
  presun?: string | null;
};

const pad = (h: number) => `${String(h).padStart(2, '0')}:00`;
const eur = (v: number) => `${v.toLocaleString('sk-SK')} €`;
const hoursWord = (n: number) => (n === 1 ? 'hodina' : n <= 4 ? 'hodiny' : 'hodín');

// Výber termínu: celá ľadová plocha (šatňa v cene) + voliteľne sprchy. Dostupnosť aj cenu na konci znova overí server.
export function BookingPicker({ days, iso, slots, initialHour, initialShowers, maxHours, showersEnabled, showerPrice, presun = null }: Props) {
  const ok = (s: Slot | undefined) => Boolean(s && s.free && s.bookable);
  const byHour = useMemo(() => new Map(slots.map((s) => [s.hour, s])), [slots]);
  const [start, setStart] = useState<number | null>(initialHour !== null && ok(byHour.get(initialHour)) ? initialHour : null);
  const [count, setCount] = useState(1);
  const [showers, setShowers] = useState(showersEnabled && initialShowers);

  const runFrom = (h: number) => {
    let n = 0;
    while (n < maxHours && ok(byHour.get(h + n))) n++;
    return n;
  };
  const possible = start === null ? 0 : runFrom(start);
  const hours = Math.min(count, Math.max(possible, 1));
  const valid = start !== null && possible >= 1;
  const ice = valid ? Array.from({ length: hours }, (_, i) => byHour.get(start! + i)?.price ?? 0).reduce((a, b) => a + b, 0) : 0;
  const extra = showers ? showerPrice : 0;
  const sp = showers ? 1 : 0;
  const day = days.find((d) => d.iso === iso) ?? days[0];
  const tail = presun ? `&presun=${presun}` : '';
  const next = valid ? `/rezervacia/udaje?datum=${iso}&od=${start}&hodiny=${hours}&sprchy=${sp}${tail}` : null;
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
                href={`/rezervacia?datum=${d.iso}&sprchy=${sp}${tail}`}
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

        {showersEnabled ? (
          <section className="rz-step">
            <h2 className="rz-h">
              <span>3</span>Sprchy
            </h2>
            <label className={`rz-extra${showers ? ' rz-extra--on' : ''}`}>
              <div>
                <strong>Sprchy po tréningu</strong>
                <span>{eur(showerPrice)} jednorazovo pre celý tím. Šatňa je v cene prenájmu.</span>
              </div>
              <input type="checkbox" role="switch" className="rz-switch" checked={showers} onChange={(e) => setShowers(e.target.checked)} />
            </label>
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
          <div>
            <dt>Šatňa</dt>
            <dd>v cene</dd>
          </div>
          {showersEnabled ? (
            <div>
              <dt>Sprchy</dt>
              <dd>{showers ? eur(showerPrice) : 'bez spŕch'}</dd>
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
        <div className="rz-total" aria-live="polite" aria-atomic="true">
          <span>Spolu s DPH</span>
          <strong>{valid ? eur(ice + extra) : '—'}</strong>
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

      {/* Mobil: súhrn a tlačidlo stále po ruke na spodku obrazovky */}
      <div className="rz-mbar">
        <span>
          <small>{valid ? `${day?.label ?? ''} · ${pad(start!)} – ${pad(start! + hours)}${showers ? ' · sprchy' : ''}` : 'Vyber deň a čas'}</small>
          <strong>{valid ? eur(ice + extra) : '—'}</strong>
        </span>
        {next ? (
          <Link href={next} className="rz-mbar__go">
            Pokračovať
          </Link>
        ) : (
          <span className="rz-mbar__off">Vyber čas</span>
        )}
      </div>
    </div>
  );
}
