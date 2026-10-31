'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CloudImage } from '@/components/CloudImage';
import type { WebPhoto } from '@/lib/media';
import { ComplexArt } from '@/components/home/ComplexArt';
import { ComplexSky } from '@/components/home/ComplexSky';
import { ComplexWeather } from '@/components/home/ComplexWeather';
import { CLEAR, moonPhaseName, scene, weatherLabel, type Weather } from '@/lib/sky';

// Interaktívny areál: hala 1 (ľad, skyboxy, bufet), ihrisko medzi halami, hala 2 (posilňovňa, wellness).
// Ilustrácia stále jemne žije; prejdenie myšou časť zvýrazní a rozpohybuje. Klik (ťuknutie) plynulo priblíži kameru
// na to miesto a vysunie panel s fotkami interiéru. Esc alebo „Celý areál“ vráti celý pohľad.
// Pri „obmedziť pohyb“ sa nič neanimuje – zmena pohľadu je okamžitá.
// Obloha žije podľa skutočného času v Košiciach (slnko, mesiac a jeho fáza, hviezdy) a podľa aktuálneho počasia (oblaky, dážď, sneh, búrka, hmla).
export type Zone = 'ice' | 'sky' | 'food' | 'pitch' | 'gym' | 'well';
export type ZoneInfo = { zone: Zone; name: string; hall: string; text: string; href: string; cta: string; soon?: boolean; photos: WebPhoto[] };

type VB = { x: number; y: number; w: number; h: number };
const FULL: VB = { x: 0, y: 0, w: 1600, h: 700 };
// oblasti na hover/klik (súradnice ilustrácie)
const BOX: Record<Zone, VB> = {
  ice: { x: 70, y: 250, w: 582, h: 310 },
  sky: { x: 652, y: 344, w: 208, h: 112 },
  food: { x: 652, y: 456, w: 208, h: 104 },
  pitch: { x: 872, y: 318, w: 334, h: 242 },
  gym: { x: 1214, y: 286, w: 346, h: 143 },
  well: { x: 1214, y: 429, w: 346, h: 131 },
};
// výrez kamery pre priblíženie (ak sa líši od oblasti)
const FRAME: Partial<Record<Zone, VB>> = {
  ice: { x: 70, y: 280, w: 600, h: 280 },
  pitch: { x: 872, y: 380, w: 334, h: 180 },
};

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// cieľový výrez v pomere strán obrázka; na počítači je oblasť v ľavej časti (vpravo je panel), na mobile v strede
function target(z: Zone, wide: boolean): VB {
  const b = FRAME[z] ?? BOX[z];
  const ratio = FULL.w / FULL.h;
  let w = Math.max(b.w * (wide ? 1.75 : 1.3), b.h * 1.35 * ratio, FULL.w / 2.6);
  w = Math.min(w, FULL.w);
  const h = w / ratio;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  let x = cx - w * (wide ? 0.31 : 0.5);
  let y = cy - h * 0.52;
  x = Math.max(FULL.x - w * 0.12, Math.min(x, FULL.x + FULL.w - w * 0.6));
  y = Math.max(FULL.y, Math.min(y, FULL.y + FULL.h - h));
  return { x, y, w, h };
}

export function ComplexExplorer({ zones, now: initialNow, weather = CLEAR }: { zones: ZoneInfo[]; now: number; weather?: Weather }) {
  // čas zo servera pri prvom vykreslení (rovnaký výsledok pri hydratácii), potom každú minútu podľa hodín návštevníka
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(id);
  }, []);
  const sky = useMemo(() => scene(now, weather), [now, weather]);
  const [hover, setHover] = useState<Zone | null>(null);
  const [open, setOpen] = useState<Zone | null>(null);
  const [vb, setVb] = useState<VB>(FULL);
  const cur = useRef<VB>(FULL);
  const raf = useRef<number>(0);
  const touch = useRef(false);
  const back = useRef<HTMLButtonElement | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const info = zones.find((z) => z.zone === open) ?? null;

  const fly = useCallback((to: VB) => {
    cancelAnimationFrame(raf.current);
    const from = { ...cur.current };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cur.current = to;
      setVb(to);
      return;
    }
    const t0 = performance.now();
    const dur = 1100;
    const step = (now: number) => {
      const k = ease(Math.min(1, (now - t0) / dur));
      const next = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, w: from.w + (to.w - from.w) * k, h: from.h + (to.h - from.h) * k };
      cur.current = next;
      setVb(next);
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, []);

  const zoomTo = useCallback(
    (z: Zone, from?: HTMLElement | null) => {
      opener.current = from ?? null;
      setOpen(z);
      setHover(null);
      fly(target(z, window.matchMedia('(min-width: 1001px)').matches));
    },
    [fly],
  );
  const zoomOut = useCallback(() => {
    setOpen(null);
    fly(FULL);
    window.setTimeout(() => opener.current?.focus?.(), 50);
  }, [fly]);

  useEffect(() => {
    if (!open) return;
    back.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') zoomOut();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, zoomOut]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const active = open ?? hover;
  const enter = (z: Zone) => () => {
    if (!touch.current && !open) setHover(z);
  };
  const leave = () => {
    if (!touch.current) setHover(null);
  };

  return (
    <div className={`cxe${open ? ' is-zoomed' : ''}`}>
      <div className="cxe__stage">
        <div className={`cx__art cxe__art ph-${sky.phase}${sky.lights ? ' lights-on' : ''}${active ? ` is-${active}` : ''}`}>
          <svg
            viewBox={`${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}`}
            role="img"
            aria-label="Areál I-SPORT COMPLEX: hala 1 s ľadovou plochou, skyboxmi a bufetom, medzi halami futbalové ihrisko, hala 2 s posilňovňou a wellness"
            preserveAspectRatio="xMidYMid slice"
          >
            <ComplexArt sky={<ComplexSky s={sky} w={weather} />} front={<ComplexWeather s={sky} w={weather} />} />
            {zones.map((z) => (
              <rect key={`r-${z.zone}`} className={`cxv-ring cxv-ring-${z.zone}`} x={BOX[z.zone].x} y={BOX[z.zone].y} width={BOX[z.zone].w} height={BOX[z.zone].h} rx="10" aria-hidden="true" />
            ))}
            {zones.map((z) => (
              <rect
                key={z.zone}
                className={`a-hit cxe__hit${open === z.zone ? ' is-on' : ''}`}
                x={BOX[z.zone].x}
                y={BOX[z.zone].y}
                width={BOX[z.zone].w}
                height={BOX[z.zone].h}
                aria-hidden="true"
                onMouseEnter={enter(z.zone)}
                onMouseLeave={leave}
                onPointerDown={(e) => {
                  touch.current = e.pointerType !== 'mouse';
                }}
                onClick={() => (open === z.zone ? zoomOut() : zoomTo(z.zone, null))}
              />
            ))}
          </svg>

          {/* body na mape – pulzujú a pri prejdení ukážu názov */}
          <div className="cxe__pins" aria-hidden="true">
            {zones.map((z) => (
              <button
                key={z.zone}
                type="button"
                tabIndex={-1}
                className={`cxe__pin cxe__pin--${z.zone}${active === z.zone ? ' is-on' : ''}`}
                onMouseEnter={enter(z.zone)}
                onMouseLeave={leave}
                onClick={() => zoomTo(z.zone, null)}
              >
                <span className="cxe__tip">
                  <strong>{z.name}</strong>
                  <span className={z.soon ? 'is-soon' : undefined}>{z.soon ? 'Pripravujeme' : z.hall}</span>
                </span>
              </button>
            ))}
          </div>
          {weather.temp !== null ? (
            <p className="cxe__wx">
              <span className="cxe__wx-t">{Math.round(weather.temp)} °C</span>
              <span>
                Teraz v Košiciach · {weatherLabel(weather)}
                {sky.phase !== 'day' && sky.moon.visible ? ` · ${moonPhaseName(sky.moon.phase)}` : ''}
              </span>
            </p>
          ) : null}
          <p className="cxe__hint" aria-hidden="true">
            <span className="cxe__hint-m">Klikni na miesto v areáli – priblížime ho a ukážeme fotky</span>
            <span className="cxe__hint-t">Ťukni na miesto v areáli</span>
          </p>
        </div>

        {/* panel s fotkami priblíženej časti */}
        <div className={`cxe__panel${info ? ' is-open' : ''}`} role="region" aria-label={info ? info.name : undefined} hidden={!info}>
          {info ? (
            <>
              <div className="cxe__ph">
                <span className="cxe__hall">
                  {info.hall}
                  {info.soon ? <span className="cxe__soon">Pripravujeme</span> : null}
                </span>
                <h3 className="disp cxe__name">{info.name}</h3>
                <p className="cxe__text">{info.text}</p>
              </div>
              {info.photos.length ? (
                <ul className="cxe__photos">
                  {info.photos.slice(0, 5).map((p, i) => (
                    <li key={p.id} className={i === 0 ? 'is-first' : undefined}>
                      <Link href={`/fotky/${p.id}`} aria-label={`Otvoriť fotku: ${p.alt}`}>
                        <CloudImage photo={p} sizes={i === 0 ? '440px' : '110px'} />
                        {i === 4 && info.photos.length > 5 ? <span className="cxe__more">+{info.photos.length - 5}</span> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="cxe__nophoto">{info.soon ? 'Fotky interiéru pridáme pred otvorením.' : 'Fotky interiéru čoskoro pridáme.'}</p>
              )}
              <div className="cxe__acts">
                <Link href={info.href} className="sbtn sbtn--md">
                  {info.cta}
                </Link>
                <button ref={back} type="button" className="sbtn sbtn--md sbtn--ghost" onClick={zoomOut}>
                  Celý areál
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* časti areálu – hlavné ovládanie z klávesnice a na mobile */}
      <ul className="cxe__list">
        {zones.map((z) => (
          <li key={z.zone}>
            <button
              type="button"
              aria-pressed={open === z.zone}
              className={active === z.zone ? 'is-on' : undefined}
              onMouseEnter={enter(z.zone)}
              onMouseLeave={leave}
              onFocus={() => !open && setHover(z.zone)}
              onBlur={() => setHover(null)}
              onClick={(e) => (open === z.zone ? zoomOut() : zoomTo(z.zone, e.currentTarget))}
            >
              <strong>{z.name}</strong>
              <span className={z.soon ? 'is-soon' : undefined}>{z.soon ? 'Pripravujeme' : z.hall}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
