'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { EmptyState, ZamboniArt } from '@/components/EmptyArt';
import { weekdaysShort, type DayOption } from '@/lib/dates';
import { useT } from '@/lib/i18n/client';

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

function Check({ size = 18, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12l5 5 9-10" fill="none" stroke={color} strokeWidth="3.2" />
    </svg>
  );
}


export function BookingPicker({ week, prevWeek, nextWeek, month, calendar, iso, isToday, dayLong, dayLongYear, slots, initialHour, initialShowers, maxHours, showersEnabled, showerPrice, cancelFreeHours, presun = null }: Props) {
  const tr = useT();
  const WD = weekdaysShort(tr.intl);
  const ok = (s: Slot | undefined) => Boolean(s && s.free && s.bookable);
  const router = useRouter();
  // jemná vibrácia pri výbere (Android; iPhone vibráciu z webu nepodporuje)
  const buzz = () => {
    try {
      navigator.vibrate?.(12);
    } catch {
      /* nepodporované */
    }
  };
  // potiahnutie prstom po dňoch: doľava ďalší deň, doprava predchádzajúci
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const goDay = (dir: 1 | -1) => {
    const i = week.findIndex((d) => d.iso === iso);
    const target = week[i + dir];
    if (target) router.push(dayHref(target.iso), { scroll: false });
    else if (dir === 1 && nextWeek) router.push(nextWeek, { scroll: false });
    else if (dir === -1 && prevWeek) router.push(prevWeek, { scroll: false });
  };
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
  const when = `${isToday ? tr('Dnes · ') : ''}${dayLongYear}`;
  const range = valid ? `${pad(start!)} – ${pad(start! + hours)}` : tr('Vyber čas');

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
        {/* DEŇ */}
        <section className="rz2__step" aria-labelledby="rz-s1">
          <div className="rz2__row">
            <h2 id="rz-s1" className="rz2__h">
              <span className="disp">{tr('Deň')}</span>
            </h2>
            <div className="rz2__nav">
              <span className="disp rz2__month">{month}</span>
              {prevWeek ? (
                <Link href={prevWeek} className="rz2__arr" aria-label={tr('Predchádzajúci týždeň')} scroll={false}>
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
                <Link href={nextWeek} className="rz2__arr" aria-label={tr('Ďalší týždeň')} scroll={false}>
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
                  {tr('Kalendár')}
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
          <nav
            className="rz2__days"
            aria-label={tr('Deň')}
            onTouchStart={(e) => {
              const t = e.touches[0];
              swipe.current = t ? { x: t.clientX, y: t.clientY } : null;
            }}
            onTouchEnd={(e) => {
              const t = e.changedTouches[0];
              const s0 = swipe.current;
              swipe.current = null;
              if (!s0 || !t) return;
              const dx = t.clientX - s0.x;
              if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(t.clientY - s0.y) * 1.5) goDay(dx < 0 ? 1 : -1);
            }}
          >
            {week.map((d) => (
              <Link key={d.iso} href={dayHref(d.iso)} className="rz2__day" aria-current={d.iso === iso ? 'date' : undefined} aria-label={`${d.label}, ${tr.n(d.free, '{n} voľná|{n} voľné|{n} voľných')}`} scroll={false}>
                <small>{d.short}</small>
                <b className="disp">{d.num}</b>
                <span>
                  {d.free} <span className="rz2__long">{tr.n(d.free, 'voľná|voľné|voľných')}</span>
                  <span className="rz2__short">{tr('voľ.')}</span>
                </span>
              </Link>
            ))}
          </nav>
          <p className="rz2__swipe" aria-hidden="true">
            <i />
            {tr('Potiahni prstom pre ďalší deň')}
          </p>
        </section>

        {/* ČAS */}
        <section className="rz2__step" aria-labelledby="rz-s2">
          <div className="rz2__row">
            <h2 id="rz-s2" className="rz2__h">
              <span className="disp">{tr('Čas')}</span>
              <span className="rz2__hday">{isToday ? tr('dnes, {dayLong}', { dayLong }) : dayLong}</span>
            </h2>
            <div className="rz2__legend" aria-hidden="true">
              <span>
                <i className="is-free" />
                {tr('Voľné')}
              </span>
              <span>
                <i className="is-sel" />
                {tr('Tvoj výber')}
              </span>
              <span>
                <i className="is-off" />
                {tr('Obsadené')}
              </span>
              {peakFrom !== null ? (
                <span>
                  <i className="is-peak" />
                  {tr('Večerná cena')}
                </span>
              ) : null}
            </div>
          </div>
          {anyFree ? null : (
            <EmptyState art={<ZamboniArt />} title={tr('Na tento deň je ľad plný')} text={nextFree ? tr('Rolba už upravuje plochu pre ďalších. Najbližší deň s voľným časom je {toLowerCase}.', { toLowerCase: nextFree.label.toLowerCase() }) : tr('Rolba už upravuje plochu pre ďalších. Skús iný deň v kalendári.')}>
              {nextFree ? (
                <Link href={dayHref(nextFree.iso)} className="sbtn sbtn--md" scroll={false}>
                  {nextFree.label}
                </Link>
              ) : null}
            </EmptyState>
          )}
          <div className="rz2__slots" role="group" aria-label={tr('Začiatok')}>
            {slots.map((s) => {
              const free = ok(s);
              const sel = isSel(s.hour);
              if (!free)
                return (
                  <div key={s.hour} className={`rz2__slot ${s.bookable ? 'is-off' : 'is-past'}`}>
                    <span className="disp">{pad(s.hour)}</span>
                    <small>{!s.bookable ? (isToday ? tr('Prebehlo') : tr('Nedostupné')) : tr('Obsadené')}</small>
                  </div>
                );
              return (
                <button
                  key={s.hour}
                  type="button"
                  className={`rz2__slot${sel ? ' is-sel' : ''}${peakFrom !== null && s.hour >= peakFrom ? ' is-peak' : ''}`}
                  aria-pressed={sel}
                  aria-label={`${pad(s.hour)}, ${eur(s.price)}`}
                  onClick={() => {
                    buzz();
                    setStart(s.hour);
                    setCount((c) => Math.min(c, Math.max(runFrom(s.hour), 1)));
                  }}
                >
                  <span className="disp">{pad(s.hour)}</span>
                  <small>{sel ? tr('Vybraté') : eur(s.price)}</small>
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

        {/* DOPLNKY */}
        <section className="rz2__step" aria-labelledby="rz-s3">
          <h2 id="rz-s3" className="rz2__h">
            <span className="disp">
              <span className="rz2__mtitle">{tr('Dĺžka a doplnky')}</span>
              <span className="rz2__dtitle">{tr('Doplnky')}</span>
            </span>
          </h2>
          <div className="rz2__mlen">
            <span>{tr('Dĺžka')}</span>
            <div className="rz2__stepper">
              <button type="button" aria-label={tr('Skrátiť o hodinu')} disabled={!valid || hours <= 1} onClick={() => setCount(Math.max(1, hours - 1))}>
                −
              </button>
              <strong className="disp">
                {tr.n(hours, '{n} hodina|{n} hodiny|{n} hodín')}
              </strong>
              <button type="button" aria-label={tr('Predĺžiť o hodinu')} disabled={!valid || hours >= possible} onClick={() => setCount(Math.min(possible, hours + 1))}>
                +
              </button>
            </div>
          </div>
          <div className="rz2__extras">
            {showersEnabled ? (
              <button type="button" className={`rz2__extra${showers ? ' is-on' : ''}`} aria-pressed={showers} onClick={() => setShowers((v) => !v)}>
                <span className="rz2__box">{showers ? <Check /> : null}</span>
                <span className="rz2__ex">
                  <b>{tr('Sprchy po tréningu')}</b>
                  <span>{tr('Jednorazovo pre celý tím')}</span>
                </span>
                <span className="disp rz2__exp">+{eur(showerPrice)}</span>
              </button>
            ) : null}
            <div className="rz2__extra is-incl">
              <span className="rz2__box is-green">
                <Check color="#2FCB75" />
              </span>
              <span className="rz2__ex">
                <b>{tr('Šatňa a úprava ľadu')}</b>
                <span>{tr('Pri každom prenájme')}</span>
              </span>
              <span className="disp rz2__exp is-green">{tr('V cene')}</span>
            </div>
          </div>
          <p className="rz2__mnote">
            <Icon name="qr" size={30} />
            {tr('Storno zdarma do {cancelFreeHours} h. QR kód dostaneš hneď po rezervácii.', { cancelFreeHours })} 
          </p>
        </section>
      </div>

      {/* SÚHRN – prilepený vpravo */}
      <aside className="rz2__aside" aria-label={tr('Súhrn rezervácie')}>
        <div className="rz2__sum">
          <div className="rz2__bar">
            <span className="wide-display">{tr('Tvoja rezervácia')}</span>
            <span>{tr('KROK {n} / 3', { n: 1 })}</span>
          </div>
          <div className="rz2__body">
            <span className="rz2__when">
              <span>{when}</span>
              <span className="disp rz2__range">{range}</span>
            </span>
            <div className="rz2__len">
              <span>{tr('Dĺžka')}</span>
              <div className="rz2__stepper">
                <button type="button" aria-label={tr('Skrátiť o hodinu')} disabled={!valid || hours <= 1} onClick={() => setCount(Math.max(1, hours - 1))}>
                  −
                </button>
                <strong className="disp">
                  {tr.n(hours, '{n} hodina|{n} hodiny|{n} hodín')}
                </strong>
                <button type="button" aria-label={tr('Predĺžiť o hodinu')} disabled={!valid || hours >= possible} onClick={() => setCount(Math.min(possible, hours + 1))}>
                  +
                </button>
              </div>
            </div>
            <div className="rz2__rows">
              <span>
                <span>{tr('Celá ľadová plocha')}{valid ? tr(' · {hours} h', { hours }) : ''}</span>
                <b>{valid ? eur(ice) : '—'}</b>
              </span>
              <span>
                <span>{tr('Šatňa a úprava ľadu')}</span>
                <b className="is-green">{tr('v cene')}</b>
              </span>
              {showersEnabled ? (
                <span>
                  <span>{tr('Sprchy')}</span>
                  <b>{showers ? eur(showerPrice) : tr('bez spŕch')}</b>
                </span>
              ) : null}
            </div>
            <div className="rz2__total" aria-live="polite" aria-atomic="true">
              <span>
                <b>{tr('Spolu')}</b>
                <small>{tr('vrátane DPH')}</small>
              </span>
              <span className="disp">{valid ? eur(ice + extra) : '—'}</span>
            </div>
            {next ? (
              <Link href={next} className="sbtn sbtn--block sbtn--lg">
                {tr('Pokračovať na údaje')}
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="3" />
                </svg>
              </Link>
            ) : (
              <span className="sbtn sbtn--block sbtn--lg is-off" aria-disabled="true">
                {tr('Najprv vyber čas')}
              </span>
            )}
            <span className="rz2__fine">{tr('Platíš na recepcii alebo prevodom.')}</span>
          </div>
        </div>
        <p className="rz2__qr">
          <Icon name="qr" size={36} />
          <span>
            {tr('Po rezervácii dostaneš')}{' '}<b>{tr('QR kód')}</b>{tr('. Na recepcii ho ukážeš a šatňa je pripravená.')}
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
            <small>{tr('Spolu s DPH')}</small>
            <span className="disp">{valid ? eur(ice + extra) : '—'}</span>
          </span>
        </div>
        {next ? (
          <Link href={next} className="sbtn sbtn--block">
            {tr('Pokračovať na údaje')}
          </Link>
        ) : (
          <span className="sbtn sbtn--block is-off" aria-disabled="true">
            {tr('Najprv vyber čas')}
          </span>
        )}
      </div>
    </div>
  );
}
