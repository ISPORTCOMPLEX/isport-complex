'use client';

import Link from 'next/link';
import { useState } from 'react';

type Day = { iso: string; short: string; num: string; weekend: boolean; label: string; long: string; slots: { hour: number; ok: boolean; past: boolean; price: number }[] };

const pad = (h: number) => `${String(h).padStart(2, '0')}:00`;
const eur = (v: number) => `${v.toLocaleString('sk-SK')} €`;

// Rýchla rezervácia na úvode („Vyber deň. Vyber hodinu.“): dni ako šikmé dlaždice, pás celého dňa
// (voľné biele, obsadené čierne, výber červený) a čierna karta súhrnu. Pokračuje sa v plnej rezervácii.
export function QuickBook({ days, showersEnabled, showerPrice }: { days: Day[]; showersEnabled: boolean; showerPrice: number }) {
  const firstWithFree = Math.max(
    0,
    days.findIndex((d) => d.slots.some((s) => s.ok)),
  );
  const [di, setDi] = useState(firstWithFree);
  const [start, setStart] = useState<number | null>(null);
  const [showers, setShowers] = useState(false);
  const sp = showers ? 1 : 0;
  const day = days[di];
  const slot = day?.slots.find((s) => s.hour === start && s.ok);
  const total = slot ? slot.price + (showers ? showerPrice : 0) : 0;
  const href = slot ? `/rezervacia?datum=${day.iso}&cas=${slot.hour}&sprchy=${sp}` : `/rezervacia?datum=${day?.iso ?? ''}&sprchy=${sp}`;
  const last = day?.slots[day.slots.length - 1];

  return (
    <div className="qb2">
      <div className="qb2__l">
        <h2 className="disp qb2__title">
          Vyber deň.
          <br />
          Vyber hodinu.
        </h2>
        <div className="qb2__days" role="group" aria-label="Deň">
          {days.map((d, i) => (
            <button
              key={d.iso}
              type="button"
              className="qb2__day"
              aria-pressed={i === di}
              aria-label={d.long}
              onClick={() => {
                setDi(i);
                setStart(null);
              }}
            >
              <small>{d.short}</small>
              <b className="disp">{d.num}</b>
            </button>
          ))}
        </div>
        <div className="qb2__line">
          <div className="qb2__strip" role="group" aria-label="Hodiny dňa">
            {day?.slots.map((s) => (
              <button
                key={s.hour}
                type="button"
                disabled={!s.ok}
                aria-pressed={s.hour === start}
                aria-label={`${pad(s.hour)}${s.ok ? `, voľné, ${eur(s.price)}` : s.past ? ', prebehlo' : ', obsadené'}`}
                title={pad(s.hour)}
                className={s.hour === start ? 'is-sel' : s.ok ? '' : s.past ? 'is-past' : 'is-off'}
                onClick={() => setStart(s.hour)}
              />
            ))}
          </div>
          <div className="qb2__ticks" aria-hidden="true">
            {day?.slots.map((s) => (
              <span key={s.hour}>{s.hour % 3 === 0 ? String(s.hour).padStart(2, '0') : ''}</span>
            ))}
            {last ? <span className="qb2__end">{String(last.hour + 1).padStart(2, '0')}</span> : null}
          </div>
          <div className="qb2__legend" aria-hidden="true">
            <span>
              <i className="is-free" />
              voľné
            </span>
            <span>
              <i className="is-off" />
              obsadené
            </span>
            <span>
              <i className="is-sel" />
              tvoj výber
            </span>
          </div>
        </div>
        <Link href={`/rezervacia?datum=${day?.iso ?? ''}`} className="sbtn sbtn--block qb2__mgo">
          Zobraziť voľné hodiny
        </Link>
      </div>

      <div className="qb2__sum" aria-live="polite">
        <span className="eb eb--muted">Tvoj výber</span>
        <span className="qb2__when">
          <span>{day ? `${day.short === 'Dnes' ? 'Dnes · ' : ''}${day.long}` : ''}</span>
          <span className={`disp qb2__time${slot ? '' : ' is-empty'}`}>{slot ? `${pad(slot.hour)} – ${pad(slot.hour + 1)}` : 'Vyber hodinu'}</span>
        </span>
        <div className="qb2__rows">
          <span>
            <span>Celá plocha · 60 min</span>
            <b>{slot ? eur(slot.price) : '—'}</b>
          </span>
          <span>
            <span>Šatňa a úprava ľadu</span>
            <b className="is-green">v cene</b>
          </span>
          {showersEnabled ? (
            <label className="qb2__sw">
              <span>Sprchy pre tím</span>
              <span className="qb2__swr">
                <b>+ {eur(showerPrice)}</b>
                <input type="checkbox" role="switch" className="sw" checked={showers} onChange={(e) => setShowers(e.target.checked)} />
              </span>
            </label>
          ) : null}
        </div>
        <span className="qb2__total">
          <b>Spolu s DPH</b>
          <span className="disp">{slot ? eur(total) : '—'}</span>
        </span>
        <Link href={href} className="sbtn sbtn--block">
          {slot ? 'Pokračovať' : 'Všetky časy'}
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="3" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
