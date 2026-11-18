'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useT } from '@/lib/i18n/client';

export type QbSlot = { hour: number; ok: boolean; past: boolean; price: number };
export type QbDay = { iso: string; short: string; today: boolean; num: string; long: string; name: string; date: string; slots: QbSlot[] };

const pad = (h: number) => `${String(h).padStart(2, '0')}:00`;
const eur = (v: number) => `${v.toLocaleString('sk-SK')} €`;

// Rezervácia na úvode – jedna sekcia, dva pohľady:
//  • Deň: dlaždice dní (s počtom voľných hodín) a dlaždice časov; prvé ťuknutie = začiatok, ďalšie neskoršie voľné = koniec.
//  • Týždeň: celý týždeň na jeden pohľad (na mobile zoznam dní s najbližšími časmi), voľná hodina vedie rovno do rezervácie.
// Večerná (vyššia) cena má žltú linku. Súhrn vpravo pokračuje rovno na údaje.
export function QuickBook({ days, showersEnabled, showerPrice, maxHours }: { days: QbDay[]; showersEnabled: boolean; showerPrice: number; maxHours: number }) {
  const t = useT();
  const first = Math.max(
    0,
    days.findIndex((d) => d.slots.some((s) => s.ok)),
  );
  const [view, setView] = useState<'day' | 'week'>('day');
  const [di, setDi] = useState(first);
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);
  const [showers, setShowers] = useState(false);
  const day = days[di];
  const base = day?.slots.find((s) => !s.past)?.price ?? day?.slots[0]?.price ?? 0;
  const freeCount = (d: QbDay) => d.slots.filter((s) => s.ok).length;

  const ok = (h: number) => !!day?.slots.find((s) => s.hour === h && s.ok);
  const pick = (h: number) => {
    if (start === null || h < start || end !== null || h - start + 1 > maxHours) {
      setStart(h);
      setEnd(null);
      return;
    }
    if (h === start) return;
    for (let x = start; x <= h; x++) if (!ok(x)) return setStart(h);
    setEnd(h);
  };
  const last = end ?? start;
  const hours = start === null || last === null ? 0 : last - start + 1;
  const ice = start === null ? 0 : (day?.slots.filter((s) => s.hour >= start && s.hour <= (last ?? start)) ?? []).reduce((a, s) => a + s.price, 0);
  const total = ice + (hours && showers ? showerPrice : 0);
  const sp = showers ? 1 : 0;
  const href = hours ? `/rezervacia/udaje?datum=${day.iso}&od=${start}&hodiny=${hours}&sprchy=${sp}` : `/rezervacia?datum=${day?.iso ?? ''}&sprchy=${sp}`;
  const inSel = (h: number) => start !== null && h >= start && h <= (last ?? start);
  const nowFree = day ? freeCount(day) : 0;

  return (
    <div className="qb3">
      <div className="shd qb3__head">
        <h2 className="disp shd__t">{t('Rozpis ľadu')}</h2>
        <div className="qb3__tabs" role="tablist" aria-label={t('Zobrazenie')}>
          <button type="button" role="tab" aria-selected={view === 'day'} onClick={() => setView('day')}>
            {t('Deň')}
          </button>
          <button type="button" role="tab" aria-selected={view === 'week'} onClick={() => setView('week')}>
            {t('Týždeň')}
          </button>
        </div>
        <span className="shd__line" aria-hidden="true" />
        <Link href="/cennik" className="shd__more">
          {t('Cenník a storno')}
        </Link>
      </div>
      <div className="qb3__l">
        <div className="qb3__bar">
          <p className="qb3__info">{view === 'day' ? (day ? `${day.today ? t('Dnes') : day.long} · ${t.n(nowFree, '{n} voľná hodina|{n} voľné hodiny|{n} voľných hodín')}` : '') : t('Ťukni na zelenú hodinu a rovno ju rezervuješ')}</p>
        </div>

        {view === 'day' ? (
          <>
            <div className="qb3__days" role="group" aria-label={t('Deň')}>
              {days.map((d, i) => {
                const n = freeCount(d);
                return (
                  <button
                    key={d.iso}
                    type="button"
                    className="qb3__day"
                    aria-pressed={i === di}
                    aria-label={`${d.long}, ${t.n(n, '{n} voľná|{n} voľné|{n} voľných')}`}
                    onClick={() => {
                      setDi(i);
                      setStart(null);
                      setEnd(null);
                    }}
                  >
                    <small>{d.short}</small>
                    <b className="disp">{d.num}</b>
                    <i className={n ? '' : 'is-none'}>{n ? t.n(n, '{n} voľná|{n} voľné|{n} voľných') : t('plno')}</i>
                  </button>
                );
              })}
            </div>
            <div className="qb3__slots" role="group" aria-label={t('Hodiny dňa')}>
              {day?.slots
                .filter((s) => !s.past)
                .map((s) => (
                  <button
                    key={s.hour}
                    type="button"
                    disabled={!s.ok}
                    aria-pressed={inSel(s.hour)}
                    className={`qb3__slot${s.price > base ? ' is-peak' : ''}${inSel(s.hour) ? ' is-sel' : ''}`}
                    onClick={() => pick(s.hour)}
                  >
                    <b className="disp">{pad(s.hour)}</b>
                    <span>{s.ok ? eur(s.price) : t('obsadené')}</span>
                  </button>
                ))}
            </div>
            {day && !day.slots.some((s) => !s.past) ? <p className="qb3__none">{t('Na dnes je po tréningoch – vyber iný deň.')}</p> : null}
            <p className="qb3__hint">
              {day?.slots.some((s) => s.price > base) ? (
                <>
                  <i aria-hidden="true" />
                  {t('vyššia (večerná) cena ·')}{' '}
                
                </>
              ) : null}
              {t('ďalším ťuknutím na neskorší čas vyberieš viac hodín')}
            </p>
          </>
        ) : (
          <Week days={days} />
        )}
      </div>

      <div className="qb3__sum" aria-live="polite">
        <span className="eb eb--muted">{t('Tvoja rezervácia')}</span>
        <span className="qb3__when">
          <span>{day ? `${day.today ? `${t('Dnes')} · ` : ''}${day.long}` : ''}</span>
          <span className={`disp qb3__time${hours ? '' : ' is-empty'}`}>{hours ? `${pad(start!)} – ${pad(start! + hours)}` : t('Vyber hodinu')}</span>
        </span>
        <div className="qb3__rows">
          <span>
            <span>{t('Celá plocha')}{hours ? t(' · {hours} h', { hours }) : ''}</span>
            <b>{hours ? eur(ice) : '—'}</b>
          </span>
          <span>
            <span>{t('Šatňa a úprava ľadu')}</span>
            <b className="is-green">{t('v cene')}</b>
          </span>
          {showersEnabled ? (
            <label className="qb3__sw">
              <span>{t('Sprchy pre tím')}</span>
              <span className="qb3__swr">
                <b>+ {eur(showerPrice)}</b>
                <input type="checkbox" role="switch" className="sw" checked={showers} onChange={(e) => setShowers(e.target.checked)} />
              </span>
            </label>
          ) : null}
        </div>
        <span className="qb3__total">
          <b>{t('Spolu s DPH')}</b>
          <span className="disp">{hours ? eur(total) : '—'}</span>
        </span>
        <Link href={href} className="sbtn sbtn--block">
          {hours ? t('Pokračovať') : t('Všetky časy')}
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="3" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

function Week({ days }: { days: QbDay[] }) {
  const t = useT();
  const hours = days[0]?.slots.map((s) => s.hour) ?? [];
  return (
    <>
      <div className="qb3__wkwrap">
        <table className="qb3__wk">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">{t('Deň')}</span>
              </th>
              {hours.map((h) => (
                <th key={h} scope="col">
                  {String(h).padStart(2, '0')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.iso}>
                <th scope="row">
                  {d.name}
                  <small>{d.date}</small>
                </th>
                {d.slots.map((s) => (
                  <td key={s.hour}>
                    {s.ok ? (
                      <Link href={`/rezervacia?datum=${d.iso}&cas=${s.hour}`} className="qb3__c is-free" aria-label={t('{name} {pad}, voľné, {eur}', { name: d.name, pad: pad(s.hour), eur: eur(s.price) })}>
                        <span className="qb3__tip" aria-hidden="true">
                          <b>{pad(s.hour)}</b>
                          {eur(s.price)}
                        </span>
                      </Link>
                    ) : (
                      <span className={`qb3__c ${s.past ? 'is-past' : 'is-busy'}`} aria-label={`${d.name} ${pad(s.hour)}, ${s.past ? t('prebehlo') : t('obsadené')}`} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="qb3__leg" aria-hidden="true">
          <span>
            <i className="is-free" />
            {t('voľné')}
          </span>
          <span>
            <i className="is-busy" />
            {t('obsadené')}
          </span>
          <span>
            <i className="is-past" />
            {t('prebehlo')}
          </span>
        </div>
      </div>
      {/* mobil: zoznam dní s najbližšími voľnými časmi */}
      <ul className="qb3__mlist">
        {days.map((d) => {
          const free = d.slots.filter((s) => s.ok);
          return (
            <li key={d.iso}>
              <span className="qb3__mday">
                {d.name}
                <small>
                  {d.date} · {free.length ? t('{length} voľ.', { length: free.length }) : t('plno')}
                </small>
              </span>
              <span className="qb3__mchips">
                {free.slice(0, 3).map((s) => (
                  <Link key={s.hour} href={`/rezervacia?datum=${d.iso}&cas=${s.hour}`} className="qb3__chip" aria-label={t('{name} {pad}, voľné', { name: d.name, pad: pad(s.hour) })}>
                    {pad(s.hour)}
                  </Link>
                ))}
              </span>
              {free.length > 3 ? (
                <Link href={`/rezervacia?datum=${d.iso}`} className="qb3__more" aria-label={t('{name}: ďalších {v} voľných časov', { name: d.name, v: free.length - 3 })}>
                  +{free.length - 3}
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}
