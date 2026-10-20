'use client';

import { useState } from 'react';
import { Dyn } from '@/components/Dyn';

// Jednoduché grafy administrácie (HTML/CSS, bez knižníc): jeden odtieň, tenké značky, popis pri prejdení myšou
// a vždy aj tabuľkový pohľad pre presné čísla.

type Point = { label: string; key: string; value: number; extra?: number };

const nf = new Intl.NumberFormat('sk-SK', { maximumFractionDigits: 1 });
export const fmtNum = (v: number) => nf.format(v);

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

export function BarChart({
  points,
  unit = '',
  extraLabel,
  extraUnit = '',
  valueLabel,
  height = 220,
}: {
  points: Point[];
  unit?: string;
  extraLabel?: string;
  extraUnit?: string;
  valueLabel: string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...points.map((p) => p.value), 0));
  const every = Math.max(1, Math.ceil(points.length / 10));
  const h = hover === null ? null : points[hover];
  const fmt = (v: number, u: string) => `${fmtNum(v)}${u ? ` ${u}` : ''}`;
  return (
    <div className="ch">
      <Dyn className="ch__plot" css={{ height: typeof height === 'number' ? `${height}px` : height }} onMouseLeave={() => setHover(null)}>
        <div className="ch__grid" aria-hidden="true">
          {[1, 0.5, 0].map((f) => (
            <Dyn as="span" key={f} css={{ bottom: `${f * 100}%` }}>
              <em>{fmtNum(max * f)}</em>
            </Dyn>
          ))}
        </div>
        <div className="ch__bars" role="img" aria-label={`${valueLabel} po dňoch`}>
          {points.map((p, i) => (
            <button
              type="button"
              key={p.key}
              className={`ch__bar${hover === i ? ' is-hover' : ''}`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={`${p.label}: ${fmt(p.value, unit)}`}
            >
              <Dyn as="i" css={{ height: `${(p.value / max) * 100}%` }} />
            </button>
          ))}
        </div>
        {h ? (
          <Dyn className="ch__tip" css={{ left: `calc(44px + (100% - 44px) * ${(hover! + 0.5) / points.length})` }}>
            <strong>{h.label}</strong>
            <span>
              {valueLabel}: <b>{fmt(h.value, unit)}</b>
            </span>
            {extraLabel && h.extra !== undefined ? (
              <span>
                {extraLabel}: <b>{fmt(h.extra, extraUnit)}</b>
              </span>
            ) : null}
          </Dyn>
        ) : null}
      </Dyn>
      <div className="ch__x" aria-hidden="true">
        {points.map((p, i) => (
          <span key={p.key}>{i % every === 0 ? p.label : ''}</span>
        ))}
      </div>
      <details className="ch__table">
        <summary>Zobraziť ako tabuľku</summary>
        <table className="adm-table">
          <thead>
            <tr>
              <th>Deň</th>
              <th className="r">{valueLabel}</th>
              {extraLabel ? <th className="r">{extraLabel}</th> : null}
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.key}>
                <td>{p.label}</td>
                <td className="r">{fmt(p.value, unit)}</td>
                {extraLabel ? <td className="r">{p.extra === undefined ? '—' : fmt(p.extra, extraUnit)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

const DAYS = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];

// Teplotná mapa deň × hodina. value < 0 = mimo otváracích hodín.
export function Heatmap({ grid, fromHour = 0, toHour = 24, percent = false, unit = '' }: { grid: number[][]; fromHour?: number; toHour?: number; percent?: boolean; unit?: string }) {
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);
  const hours = Array.from({ length: toHour - fromHour }, (_, i) => fromHour + i);
  const max = percent ? 1 : Math.max(1, ...grid.flat());
  const show = (v: number) => (v < 0 ? 'zatvorené' : percent ? `${Math.round(v * 100)} %` : `${fmtNum(v)}${unit ? ` ${unit}` : ''}`);
  const cur = hover ? grid[hover.d][hover.h] : null;
  return (
    <div className="hm">
      <Dyn className="hm__grid" css={{ 'grid-template-columns': `28px repeat(${hours.length}, minmax(0, 1fr))` }} onMouseLeave={() => setHover(null)}>
        <span />
        {hours.map((h) => (
          <span key={h} className="hm__h">
            {h % 3 === 0 ? h : ''}
          </span>
        ))}
        {DAYS.map((d, di) => (
          <div className="u-contents" key={d}>
            <span className="hm__d">{d}</span>
            {hours.map((h) => {
              const v = grid[di][h];
              const a = v < 0 ? 0 : Math.min(1, v / max);
              return (
                <Dyn
                  as="button"
                  type="button"
                  key={h}
                  className={`hm__c${v < 0 ? ' hm__c--off' : ''}${hover?.d === di && hover.h === h ? ' is-hover' : ''}`}
                  css={{ background: v < 0 ? undefined : `color-mix(in oklab, #2350C8 ${Math.round(8 + a * 92)}%, #FFFFFF)` }}
                  onMouseEnter={() => setHover({ d: di, h })}
                  onFocus={() => setHover({ d: di, h })}
                  aria-label={`${d} ${h}:00 – ${show(v)}`}
                />
              );
            })}
          </div>
        ))}
      </Dyn>
      <div className="hm__foot">
        <span className="hm__readout" aria-live="polite">
          {hover && cur !== null ? (
            <>
              <b>
                {DAYS[hover.d]} {hover.h}:00 – {hover.h + 1}:00
              </b>{' '}
              · {show(cur)}
            </>
          ) : (
            'Prejdi myšou nad políčko'
          )}
        </span>
        <span className="hm__scale" aria-hidden="true">
          menej <i /> viac
        </span>
      </div>
    </div>
  );
}
