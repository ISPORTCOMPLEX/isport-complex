'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ComplexArt } from '@/components/home/ComplexArt';
import { ComplexSky } from '@/components/home/ComplexSky';
import { ComplexWeather } from '@/components/home/ComplexWeather';
import { CLEAR, scene, type Weather } from '@/lib/sky';

// Príbeh pri posúvaní: hala sa „postaví“ v piatich krokoch – ľad, mantinely, svetlá, tím, celý areál.
// Sekcia je vysoká, ilustrácia ostáva prilepená a krok sa mení podľa posunu. Bez JavaScriptu a pri
// „obmedziť pohyb“ sa ukáže rovno hotový areál so všetkými textami pod sebou.
const STEPS = [
  ['Ľad', 'Celá plocha s mantinelmi, upravená pred každým blokom.'],
  ['Mantinely a sklo', 'Plnohodnotné mantinely s ochranným sklom, bránky pripravené.'],
  ['Svetlá', 'Rovnomerné osvetlenie celej plochy, tabuľa so skóre.'],
  ['Tvoj tím', 'Celá plocha je len vaša, šatňa je v cene.'],
  ['Celý areál', 'Skyboxy, bufet, ihrisko a hala 2 – všetko na jednom mieste.'],
] as const;
const FROM = [60, 240, 640, 330];
const TO = [0, 0, 1600, 700];
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function ScrollStory({ now: initialNow, weather = CLEAR }: { now: number; weather?: Weather }) {
  const root = useRef<HTMLElement | null>(null);
  const svg = useRef<SVGSVGElement | null>(null);
  const [on, setOn] = useState(false);
  const [step, setStep] = useState(4);
  const [now, setNow] = useState(initialNow);
  const sky = useMemo(() => scene(now, weather), [now, weather]);

  useEffect(() => {
    setNow(Date.now());
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setOn(true);
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = root.current;
      const s = svg.current;
      if (!el || !s) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = Math.max(0, Math.min(1, -r.top / Math.max(1, total)));
      const st = Math.min(4, Math.floor(p * 5));
      setStep(st);
      const z = ease(Math.max(0, Math.min(1, (p - 0.8) / 0.2)));
      s.setAttribute('viewBox', FROM.map((v, i) => (v + (TO[i] - v) * z).toFixed(1)).join(' '));
      s.style.setProperty('--z', z.toFixed(3));
      el.style.setProperty('--p', p.toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={root} className={`sty${on ? ' sty--on' : ''} sty--s${step}`} aria-label="Hala krok za krokom">
      <div className="sty__pin">
        <div className="wrap sty__in">
          <div className="sty__tx">
            {STEPS.map(([h, p], i) => (
              <div key={h} className={`sty__step${i === step ? ' is-on' : ''}`}>
                <b className="sty__n">
                  {String(i + 1).padStart(2, '0')} / 05
                </b>
                <h2 className="disp sty__h">{h}</h2>
                <p className="sty__p">{p}</p>
              </div>
            ))}
            <div className="sty__dots" aria-hidden="true">
              {STEPS.map(([h], i) => (
                <span key={h} className={i <= step ? 'is-on' : undefined} />
              ))}
            </div>
          </div>
          <div className={`cx__art cxe__art sty__art ph-${sky.phase}${sky.lights ? ' lights-on' : ''}`} aria-hidden="true">
            <svg ref={svg} viewBox={on ? FROM.join(' ') : TO.join(' ')} preserveAspectRatio="xMidYMid meet" focusable="false">
              <ComplexArt sky={<ComplexSky s={sky} w={weather} />} front={<ComplexWeather s={sky} w={weather} />} />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
