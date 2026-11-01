'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { Dyn } from '@/components/Dyn';
import { Icon } from '@/components/Icon';
import { EmptyState, ZamboniArt } from '@/components/EmptyArt';
import type { DayOption } from '@/lib/dates';

type Slot = { hour: number; free: boolean; bookable: boolean; price: number };
type WeekDay = DayOption & { free: number };
type CalDay = { iso: string; num: string; dow: number; month: string };

type Props = {
  week: WeekDay[];
  prevWeek: string | null;
  nextWeek: string | null;
  month: string;
  calendar: CalDay[];
  iso: string;
  isToday: boolean;
  dayLong: string;
  dayLongYear: string;
  slots: Slot[];
  initialHour: number | null;
  initialShowers: boolean;
  maxHours: number;
  showersEnabled: boolean;
  showerPrice: number;
  cancelFreeHours: number;
  presun?: string | null;
};

const pad = (h: number) => `${String(h).padStart(2, '0')}:00`;
const eur = (v: number) => `${v.toLocaleString('sk-SK')} €`;
const hoursWord = (n: number) => (n === 1 ? 'hodina' : n <= 4 ? 'hodiny' : 'hodín');
const freeWord = (n: number) => (n === 1 ? 'voľná' : n >= 2 && n <= 4 ? 'voľné' : 'voľných');
const WD = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];

function Check({ size = 18, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12l5 5 9-10" fill="none" stroke={color} strokeWidth="3.2" />
    </svg>
  );
}


// Časová os dňa: celý deň na jednom riadku – voľné, obsadené, večerná cena a vybraný úsek.
// Ťuknutie na voľnú hodinu ju vyberie, okraje výberu sa dajú potiahnuť (myš aj prst).
// Je to len pohodlnejší ovládač – z klávesnice a pre čítačky slúži mriežka časov pod ňou.
function Timeline({ slots, ok, start, hours, peakFrom, maxHours, onPick, onRange }: {
  slots: Slot[];
  ok: (s: Slot | undefined) => boolean;
  start: number | null;
  hours: number;
  peakFrom: number | null;
  maxHours: number;
  onPick: (h: number) => void;
  onRange: (start: number, count: number) => void;
}) {
  const track = useRef<HTMLDivElement | null>(null);
  const drag = useRef<'l' | 'r' | null>(null);
  const [tip, setTip] = useState<number | null>(null);
  const first = slots[0]?.hour ?? 0;
  const n = slots.length;
  const byHour = new Map(slots.map((s) => [s.hour, s]));
  const allFree = (a: number, b: number) => {
    for (let h = a; h < b; h++) if (!ok(byHour.get(h))) return false;
    return true;
  };
  const hourAt = (x: number) => {
    const r = track.current?.getBoundingClientRect();
    if (!r) return null;
    return first + Math.max(0, Math.min(n - 1, Math.floor(((x - r.left) / r.width) * n)));
  };
  const move = (e: React.PointerEvent) => {
    const h = hourAt(e.clientX);
    if (h === null) return;
    if (!drag.current || start === null) {
      setTip(e.pointerType === 'mouse' ? h : null);
      return;
    }
    const end = start + hours;
    if (drag.current === 'l') {
      const s0 = Math.max(end - maxHours, Math.min(h, end - 1));
      if (allFree(s0, end)) onRange(s0, end - s0);
    } else {
      const e0 = Math.min(start + maxHours, Math.max(h + 1, start + 1));
      if (allFree(start, e0)) onRange(start, e0 - start);
    }
  };
  const peakIdx = peakFrom === null ? -1 : slots.findIndex((s) => s.hour >= peakFrom);
  const tipSlot = tip === null ? undefined : byHour.get(tip);
  return (
    <div className="tl" aria-hidden="true">
      <div className="tl__scale">
        {slots.map((s) => (
          <span key={s.hour}>{String(s.hour).padStart(2, '0')}</span>
        ))}
        <span className="tl__last">{String(first + n).padStart(2, '0')}</span>
      </div>
      <div
        ref={track}
        className="tl__track"
        onPointerMove={move}
        onPointerLeave={() => setTip(null)}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        {slots.map((s) => {
          const free = ok(s);
          return (
            <button
              key={s.hour}
              type="button"
              tabIndex={-1}
              className={`tl__h${free ? '' : s.bookable ? ' is-busy' : ' is-past'}${peakFrom !== null && s.hour >= peakFrom ? ' is-peak' : ''}`}
              disabled={!free}
              onClick={() => onPick(s.hour)}
            />
          );
        })}
        {start !== null ? (
          <Dyn as="div" className="tl__sel" css={{ 'grid-column': `${start - first + 1} / span ${hours}` }}>
            <b>
              {String(start).padStart(2, '0')} – {String(start + hours).padStart(2, '0')}
            </b>
            <small>
              {hours} h · {slots.filter((x) => x.hour >= start && x.hour < start + hours).reduce((a, x) => a + x.price, 0).toLocaleString('sk-SK')} €
            </small>
            <span
              className="tl__grip tl__grip--l"
              onPointerDown={(e) => {
                drag.current = 'l';
                track.current?.setPointerCapture(e.pointerId);
              }}
            />
            <span
              className="tl__grip tl__grip--r"
              onPointerDown={(e) => {
                drag.current = 'r';
                track.current?.setPointerCapture(e.pointerId);
              }}
            />
          </Dyn>
        ) : null}
        {tipSlot && !drag.current ? (
          <Dyn as="span" className="tl__tip" css={{ left: `${((tipSlot.hour - first + 0.5) / n) * 100}%` }}>
            <b>{pad(tipSlot.hour)}</b>
            {ok(tipSlot) ? `voľné · ${eur(tipSlot.price)}` : tipSlot.bookable ? 'obsadené' : 'nedostupné'}
          </Dyn>
        ) : null}
      </div>
      {peakIdx > 0 && peakIdx < n ? (
        <Dyn as="div" className="tl__price" css={{ 'grid-template-columns': `${peakIdx}fr ${n - peakIdx}fr` }}>
          <span>
            {pad(first)} – {pad(slots[peakIdx].hour)} · {eur(slots[0].price)} / hod
          </span>
          <span>
            od {pad(slots[peakIdx].hour)} · {eur(slots[peakIdx].price)} / hod
          </span>
        </Dyn>
      ) : null}
    </div>
  );
}

// Výber termínu: celá ľadová plocha (šatňa v cene) + voliteľne sprchy. Dostupnosť aj cenu na konci znova overí server.
export function BookingPicker({ week, prevWeek, nextWeek, month, calendar, iso, isToday, dayLong, dayLongYear, slots, initialHour, initialShowers, maxHours, showersEnabled, showerPrice, cancelFreeHours, presun = null }: Props) {
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
  const tail = presun ? `&presun=${presun}` : '';
  const next = valid ? `/rezervacia/udaje?datum=${iso}&od=${start}&hodiny=${hours}&sprchy=${sp}${tail}` : null;
  const anyFree = slots.some((s) => ok(s));
  const nextFree = week.find((d) => d.iso > iso && d.free > 0) ?? null;
  // od ktorej hodiny platí vyššia (večerná) cena – odvodené z cien časov, aby sa nič nemuselo posielať navyše
  const peakFrom = useMemo(() => {
    const base = slots[0]?.price;
    const hit = slots.find((x) => x.price > (base ?? 0));
    return hit && slots.every((x) => x.hour < hit.hour || x.price === hit.price) ? hit.hour : null;
  }, [slots]);
  const isSel = (h: number) => valid && h >= start! && h < start! + hours;
  const dayHref = (d: string) => `/rezervacia?datum=${d}&sprchy=${sp}${tail}`;
  const when = `${isToday ? 'Dnes · ' : ''}${dayLongYear}`;
  const range = valid ? `${pad(start!)} – ${pad(start! + hours)}` : 'Vyber čas';

  // kalendár po mesiacoch (pondelok prvý)
  const months = useMemo(() => {
    const out: { name: string; days: CalDay[] }[] = [];
    for (const d of calendar) {
      const m = out[out.length - 1];
      if (m && m.name === d.month) m.days.push(d);
      else out.push({ name: d.month, days: [d] });
    }
    return out;
  }, [calendar]);

  return (
    <div className="rz2__grid">
      <div className="rz2__main">
        {/* 01 DEŇ */}
        <section className="rz2__step" aria-labelledby="rz-s1">
          <div className="rz2__row">
            <h2 id="rz-s1" className="rz2__h">
              <span className="wide-display rz2__n" aria-hidden="true">
                01
              </span>
              <span className="disp">Deň</span>
            </h2>
            <div className="rz2__nav">
              <span className="disp rz2__month">{month}</span>
              {prevWeek ? (
                <Link href={prevWeek} className="rz2__arr" aria-label="Predchádzajúci týždeň" scroll={false}>
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="3" />
                  </svg>
                </Link>
              ) : (
                <span className="rz2__arr is-off" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="3" />
                  </svg>
                </span>
              )}
              {nextWeek ? (
                <Link href={nextWeek} className="rz2__arr" aria-label="Ďalší týždeň" scroll={false}>
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="3" />
                  </svg>
                </Link>
              ) : (
                <span className="rz2__arr is-off" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="3" />
                  </svg>
                </span>
              )}
              <details className="cal2">
                <summary>
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" />
                    <path d="M3 10h18M8 3v4M16 3v4" fill="none" stroke="currentColor" strokeWidth="2.2" />
                  </svg>
                  Kalendár
                </summary>
                <div className="cal2__pop">
                  {months.map((m) => (
                    <div key={m.name} className="cal2__m">
                      <span className="disp cal2__name">{m.name}</span>
                      <div className="cal2__grid">
                        {WD.map((w) => (
                          <span key={w} className="cal2__wd" aria-hidden="true">
                            {w}
                          </span>
                        ))}
                        {m.days[0].dow > 0 ? <span className={`cal2__pad cal2__pad--${m.days[0].dow}`} aria-hidden="true" /> : null}
                        {m.days.map((d) => (
                          <Link key={d.iso} href={dayHref(d.iso)} className="cal2__d" aria-current={d.iso === iso ? 'date' : undefined} scroll={false}>
                            {d.num}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </div>
          <nav className="rz2__days" aria-label="Deň">
            {week.map((d) => (
              <Link key={d.iso} href={dayHref(d.iso)} className="rz2__day" aria-current={d.iso === iso ? 'date' : undefined} aria-label={`${d.label}, ${d.free} ${freeWord(d.free)}`} scroll={false}>
                <small>{d.short}</small>
                <b className="disp">{d.num}</b>
                <span>
                  {d.free} <span className="rz2__long">{freeWord(d.free)}</span>
                  <span className="rz2__short">voľ.</span>
                </span>
              </Link>
            ))}
          </nav>
        </section>

        {/* 02 ČAS */}
        <section className="rz2__step" aria-labelledby="rz-s2">
          <div className="rz2__row">
            <h2 id="rz-s2" className="rz2__h">
              <span className="wide-display rz2__n" aria-hidden="true">
                02
              </span>
              <span className="disp">Čas</span>
              <span className="rz2__hday">{isToday ? `dnes, ${dayLong}` : dayLong}</span>
            </h2>
            <div className="rz2__legend" aria-hidden="true">
              <span>
                <i className="is-free" />
                Voľné
              </span>
              <span>
                <i className="is-sel" />
                Tvoj výber – potiahni okraj
              </span>
              <span>
                <i className="is-off" />
                Obsadené
              </span>
              {peakFrom !== null ? (
                <span>
                  <i className="is-peak" />
                  Večerná cena
                </span>
              ) : null}
            </div>
          </div>
          <Timeline
            slots={slots}
            ok={ok}
            start={valid ? start : null}
            hours={hours}
            peakFrom={peakFrom}
            maxHours={maxHours}
            onPick={(h) => {
              setStart(h);
              setCount((c) => Math.min(c, Math.max(runFrom(h), 1)));
            }}
            onRange={(s0, c) => {
              setStart(s0);
              setCount(c);
            }}
          />
          {anyFree ? null : (
            <EmptyState art={<ZamboniArt />} title="Na tento deň je ľad plný" text={nextFree ? `Rolba už upravuje plochu pre ďalších. Najbližší deň s voľným časom je ${nextFree.label.toLowerCase()}.` : 'Rolba už upravuje plochu pre ďalších. Skús iný deň v kalendári.'}>
              {nextFree ? (
                <Link href={dayHref(nextFree.iso)} className="sbtn sbtn--md" scroll={false}>
                  {nextFree.label}
                </Link>
              ) : null}
            </EmptyState>
          )}
          <div className="rz2__slots" role="group" aria-label="Začiatok">
            {slots.map((s) => {
              const free = ok(s);
              const sel = isSel(s.hour);
              if (!free)
                return (
                  <div key={s.hour} className={`rz2__slot ${s.bookable ? 'is-off' : 'is-past'}`}>
                    <span className="disp">{pad(s.hour)}</span>
                    <small>{!s.bookable ? (isToday ? 'Prebehlo' : 'Nedostupné') : 'Obsadené'}</small>
                  </div>
                );
              return (
                <button
                  key={s.hour}
                  type="button"
                  className={`rz2__slot${sel ? ' is-sel' : ''}`}
                  aria-pressed={sel}
                  aria-label={`${pad(s.hour)}, ${eur(s.price)}`}
                  onClick={() => {
                    setStart(s.hour);
                    setCount((c) => Math.min(c, Math.max(runFrom(s.hour), 1)));
                  }}
                >
                  <span className="disp">{pad(s.hour)}</span>
                  <small>{sel ? 'Vybraté' : eur(s.price)}</small>
                  {sel ? (
                    <span className="rz2__tick">
                      <Check />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        {/* 03 DOPLNKY */}
        <section className="rz2__step" aria-labelledby="rz-s3">
          <h2 id="rz-s3" className="rz2__h">
            <span className="wide-display rz2__n" aria-hidden="true">
              03
            </span>
            <span className="disp">
              <span className="rz2__mtitle">Dĺžka a </span>
              <span className="rz2__dtitle">D</span>
              <span className="rz2__mtitle">d</span>oplnky
            </span>
          </h2>
          <div className="rz2__mlen">
            <span>Dĺžka</span>
            <div className="rz2__stepper">
              <button type="button" aria-label="Skrátiť o hodinu" disabled={!valid || hours <= 1} onClick={() => setCount(Math.max(1, hours - 1))}>
                −
              </button>
              <strong className="disp">
                {hours} {hoursWord(hours)}
              </strong>
              <button type="button" aria-label="Predĺžiť o hodinu" disabled={!valid || hours >= possible} onClick={() => setCount(Math.min(possible, hours + 1))}>
                +
              </button>
            </div>
          </div>
          <div className="rz2__extras">
            {showersEnabled ? (
              <button type="button" className={`rz2__extra${showers ? ' is-on' : ''}`} aria-pressed={showers} onClick={() => setShowers((v) => !v)}>
                <span className="rz2__box">{showers ? <Check /> : null}</span>
                <span className="rz2__ex">
                  <b>Sprchy po tréningu</b>
                  <span>Jednorazovo pre celý tím</span>
                </span>
                <span className="disp rz2__exp">+{eur(showerPrice)}</span>
              </button>
            ) : null}
            <div className="rz2__extra is-incl">
              <span className="rz2__box is-green">
                <Check color="#2FCB75" />
              </span>
              <span className="rz2__ex">
                <b>Šatňa a úprava ľadu</b>
                <span>Pri každom prenájme</span>
              </span>
              <span className="disp rz2__exp is-green">V cene</span>
            </div>
          </div>
          <p className="rz2__mnote">
            <Icon name="qr" size={30} />
            Storno zdarma do {cancelFreeHours} h. QR kód dostaneš hneď po rezervácii.
          </p>
        </section>
      </div>

      {/* SÚHRN – prilepený vpravo */}
      <aside className="rz2__aside" aria-label="Súhrn rezervácie">
        <div className="rz2__sum">
          <div className="rz2__bar">
            <span className="wide-display">Tvoja rezervácia</span>
            <span>KROK 1 / 3</span>
          </div>
          <div className="rz2__body">
            <span className="rz2__when">
              <span>{when}</span>
              <span className="disp rz2__range">{range}</span>
            </span>
            <div className="rz2__len">
              <span>Dĺžka</span>
              <div className="rz2__stepper">
                <button type="button" aria-label="Skrátiť o hodinu" disabled={!valid || hours <= 1} onClick={() => setCount(Math.max(1, hours - 1))}>
                  −
                </button>
                <strong className="disp">
                  {hours} {hoursWord(hours)}
                </strong>
                <button type="button" aria-label="Predĺžiť o hodinu" disabled={!valid || hours >= possible} onClick={() => setCount(Math.min(possible, hours + 1))}>
                  +
                </button>
              </div>
            </div>
            <div className="rz2__rows">
              <span>
                <span>Celá ľadová plocha{valid ? ` · ${hours} h` : ''}</span>
                <b>{valid ? eur(ice) : '—'}</b>
              </span>
              <span>
                <span>Šatňa a úprava ľadu</span>
                <b className="is-green">v cene</b>
              </span>
              {showersEnabled ? (
                <span>
                  <span>Sprchy</span>
                  <b>{showers ? eur(showerPrice) : 'bez spŕch'}</b>
                </span>
              ) : null}
            </div>
            <div className="rz2__total" aria-live="polite" aria-atomic="true">
              <span>
                <b>Spolu</b>
                <small>vrátane DPH</small>
              </span>
              <span className="disp">{valid ? eur(ice + extra) : '—'}</span>
            </div>
            {next ? (
              <Link href={next} className="sbtn sbtn--block sbtn--lg">
                Pokračovať na údaje
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="3" />
                </svg>
              </Link>
            ) : (
              <span className="sbtn sbtn--block sbtn--lg is-off" aria-disabled="true">
                Najprv vyber čas
              </span>
            )}
            <span className="rz2__fine">Platíš na recepcii alebo prevodom.</span>
          </div>
        </div>
        <p className="rz2__qr">
          <Icon name="qr" size={36} />
          <span>
            Po rezervácii dostaneš <b>QR kód</b>. Na recepcii ho ukážeš a šatňa je pripravená.
          </span>
        </p>
      </aside>

      {/* Mobil: súhrn prilepený dole */}
      <div className="rz2__mbar">
        <div className="rz2__mrow">
          <span>
            <small>{when}</small>
            <span className="disp">{range}</span>
          </span>
          <span className="rz2__mtot">
            <small>Spolu s DPH</small>
            <span className="disp">{valid ? eur(ice + extra) : '—'}</span>
          </span>
        </div>
        {next ? (
          <Link href={next} className="sbtn sbtn--block">
            Pokračovať na údaje
          </Link>
        ) : (
          <span className="sbtn sbtn--block is-off" aria-disabled="true">
            Najprv vyber čas
          </span>
        )}
      </div>
    </div>
  );
}
