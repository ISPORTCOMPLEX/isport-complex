'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Dyn } from '@/components/Dyn';

type Day = { iso: string; short: string; num: string; weekend: boolean; label: string; slots: { hour: number; ok: boolean; price: number }[] };

const pad = (h: number) => `${String(h).padStart(2, '0')}:00`;
const eur = (v: number) => `${v.toLocaleString('sk-SK')} €`;

// Rýchla rezervácia na úvode: deň, časová os dňa (celá plocha) a sprchy. Pokračuje sa v plnej rezervácii.
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

  return (
    <div className="qb">
      <div className="qb__head">
        <strong className="cond">Rýchla rezervácia</strong>
        <span>celá plocha</span>
      </div>
      <div className="qb__days" role="group" aria-label="Deň">
        {days.map((d, i) => (
          <button
            key={d.iso}
            type="button"
            aria-pressed={i === di}
            aria-label={d.label}
            onClick={() => {
              setDi(i);
              setStart(null);
            }}
          >
            <small className={d.weekend ? 'qb__we' : undefined}>{d.short}</small>
            <b className="cond">{d.num}</b>
          </button>
        ))}
      </div>
      <div className="qb__line" role="group" aria-label="Začiatok – hodiny dňa">
        {day?.slots.map((s) => (
          <button
            key={s.hour}
            type="button"
            disabled={!s.ok}
            aria-pressed={s.hour === start}
            aria-label={`${pad(s.hour)}${s.ok ? `, ${eur(s.price)}` : ', obsadené'}`}
            title={pad(s.hour)}
            className={s.hour === start ? 'is-sel' : s.ok ? '' : 'is-off'}
            onClick={() => setStart(s.hour)}
          />
        ))}
      </div>
      <div className="qb__ticks" aria-hidden="true">
        {day?.slots
          .filter((s) => s.hour % 3 === 0)
          .map((s) => (
            <Dyn as="span" key={s.hour} css={{ left: `${((s.hour - day.slots[0].hour) / day.slots.length) * 100}%`, visibility: 'visible' }}>
              {s.hour}
            </Dyn>
          ))}
      </div>
      {showersEnabled ? (
        <label className="qb__lockers">
          <span>
            <strong>Sprchy po tréningu</strong>
            <small>{eur(showerPrice)} pre celý tím · šatňa v cene</small>
          </span>
          <input type="checkbox" className="rz-switch rz-switch--dark" checked={showers} onChange={(e) => setShowers(e.target.checked)} />
        </label>
      ) : null}
      <div className="qb__foot">
        <span>
          <small>{slot ? `${day.label} · ${pad(slot.hour)} – ${pad(slot.hour + 1)}` : 'Vyber hodinu na osi dňa'}</small>
          <strong className="cond">{slot ? eur(total) : '—'}</strong>
        </span>
        <Link href={href} className="qb__cta">
          {slot ? 'Pokračovať' : 'Všetky časy'}
          <span aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            </svg>
          </span>
        </Link>
      </div>
    </div>
  );
}
