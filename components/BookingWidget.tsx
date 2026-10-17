'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight } from './Icons';
import type { DayOption } from '@/lib/dates';

type Prices = { offPeak: number | null; peak: number | null; weekend: number | null };

type Props = {
  days: DayOption[];
  hours: number[];
  prices: { full: Prices; half: Prices };
  peakFromHour: number;
};

const pad = (h: number) => `${String(h).padStart(2, '0')}:00`;

// Rýchla rezervácia v úvode. Výber sa odovzdá do rezervačného kalendára,
// kde server overí skutočnú dostupnosť a vypočíta cenu (fáza 3).
export function BookingWidget({ days, hours, prices, peakFromHour }: Props) {
  const [area, setArea] = useState<'cela' | 'polovica'>('cela');
  const [dayIdx, setDayIdx] = useState(Math.min(1, days.length - 1));
  const [hour, setHour] = useState<number | null>(null);

  const day = days[dayIdx];

  const priceLabel = useMemo(() => {
    if (hour === null) return 'Vyber čas';
    const p = area === 'cela' ? prices.full : prices.half;
    const v = day.weekend ? p.weekend : hour >= peakFromHour ? p.peak : p.offPeak;
    return v === null ? 'Cena: doplníme' : `${v.toLocaleString('sk-SK')} €`;
  }, [hour, area, day, prices, peakFromHour]);

  const href = hour === null ? '/rezervacia' : `/rezervacia?datum=${day.iso}&cas=${hour}&plocha=${area}`;

  return (
    <div className="booker-frame">
      <div className="booker glass">
        <div className="booker__head">
          <strong style={{ fontSize: 18 }}>Rýchla rezervácia</strong>
          <span className="muted" style={{ fontSize: 13 }}>
            60 minút
          </span>
        </div>

        <div className="seg" role="group" aria-label="Plocha">
          <button type="button" aria-pressed={area === 'cela'} onClick={() => setArea('cela')}>
            Celá plocha
          </button>
          <button type="button" aria-pressed={area === 'polovica'} onClick={() => setArea('polovica')}>
            Polovica
          </button>
        </div>

        <div className="days" role="group" aria-label="Deň">
          {days.map((d, i) => (
            <button key={d.iso} type="button" className="day" aria-pressed={i === dayIdx} aria-label={d.label} onClick={() => setDayIdx(i)}>
              <small>{d.short}</small>
              <b>{d.num}</b>
            </button>
          ))}
        </div>

        <div className="slots" role="group" aria-label="Začiatok">
          {hours.map((h) => (
            <button key={h} type="button" className="slot" aria-pressed={hour === h} onClick={() => setHour(h)}>
              {pad(h)}
            </button>
          ))}
        </div>

        <div className="booker__foot">
          <span>
            <small>
              {day.label}
              {hour !== null && ` · ${pad(hour)} – ${pad(hour + 1)}`}
            </small>
            <strong>{priceLabel}</strong>
          </span>
          <Link href={href} className="btn btn--sm btn--icon">
            Pokračovať
            <span className="btn__ic">
              <ArrowRight size={15} />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
