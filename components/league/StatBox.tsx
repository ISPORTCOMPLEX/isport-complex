'use client';

import { useState } from 'react';
import { Dyn } from '@/components/Dyn';
import { useT } from '@/lib/i18n/client';

export type StatRow = { key: string; rank: number; tie: boolean; name: string; value: string; color: string; ink: string; initials: string; sub: string };
export type StatTab = { label: string; unit: string; rows: StatRow[]; empty: string };

// Box lídrov ako na NHL.com: záložky, vľavo líder (iniciály vo farbe tímu, veľké číslo), vpravo top 10.
// Klik/fokus na riadok zmení zobrazeného lídra.
export function StatBox({ title, note, tabs }: { title: string; note?: string; tabs: StatTab[] }) {
  const t = useT();
  const [tab, setTab] = useState(0);
  const [pick, setPick] = useState(0);
  const cur = tabs[tab];
  const lead = cur.rows[Math.min(pick, cur.rows.length - 1)];
  return (
    <section className="lgs">
      <div className="lgs__head">
        <h2>{title}</h2>
        {note ? <span className="lgs__note">{note}</span> : null}
      </div>
      <div className="lgs__tabs" role="tablist">
        {tabs.map((x, i) => (
          <button
            key={x.label}
            type="button"
            role="tab"
            aria-selected={i === tab}
            onClick={() => {
              setTab(i);
              setPick(0);
            }}
          >
            {x.label}
          </button>
        ))}
      </div>
      {lead ? (
        <div className="lgs__body" role="tabpanel">
          <div className="lgs__lead">
            <Dyn as="span" className="lgs__av" css={{ '--tc': lead.color, '--ti': lead.ink }} aria-hidden="true">
              {lead.initials}
            </Dyn>
            <b className="lgs__name">{lead.name}</b>
            <span className="lgs__sub">{lead.sub}</span>
            <span className="lgs__unit">{cur.unit}</span>
            <b className="lgs__big">{lead.value}</b>
          </div>
          <ol className="lgs__list">
            {cur.rows.map((r, i) => (
              <li key={r.key}>
                <button type="button" className={i === pick ? 'is-on' : undefined} onClick={() => setPick(i)} onMouseEnter={() => setPick(i)} onFocus={() => setPick(i)} aria-pressed={i === pick}>
                  <span className="lgs__rk">
                    {r.tie ? <abbr title={t('Rovnaký počet')}>R</abbr> : null}
                    {r.rank}.
                  </span>
                  <span className="lgs__nm">{r.name}</span>
                  <b>{r.value}</b>
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="lgs__empty">{cur.empty}</p>
      )}
    </section>
  );
}
