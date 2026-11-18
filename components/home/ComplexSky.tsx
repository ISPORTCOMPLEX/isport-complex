'use client';

import { moonLitPath, type Scene, type Weather } from '@/lib/sky';

// Obloha za halami: farby podľa výšky slnka, slnko a mesiac na skutočnej pozícii (Košice), fáza mesiaca,
// hviezdy, oblaky podľa oblačnosti a silueta mesta. Všetko sú SVG atribúty – žiadne inline štýly (CSP).

// deterministický „náhodný“ generátor – rovnaký výsledok na serveri aj v prehliadači (hydratácia)
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STARS = (() => {
  const r = rng(11);
  return Array.from({ length: 46 }, (_, i) => ({ x: Math.round(r() * 1600), y: Math.round(10 + r() * 300), s: r() < 0.15 ? 1.5 : r() < 0.5 ? 1.1 : 0.7, d: i % 3 }));
})();

const hexToRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a: string, b: string, t: number) => {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
};

// Pozadie makety: tmavé „štúdio“, ktoré v noci stmavne. Slnko a mesiac (so skutočnou fázou) idú po oblohe
// podľa času v Košiciach, ale len ako jemné svetlá – maketa ostáva v popredí.
export function ComplexSky({ s, w }: { s: Scene; w: Weather }) {
  const top = mixHex('#03070C', '#1B2F45', s.dayness);
  const low = mixHex('#05090F', '#0E1B2B', s.dayness);
  const r = 13;
  const clear = 1 - w.clouds * 0.75;
  return (
    <g className="cxv-skylayer">
      <defs>
        <linearGradient id="cxv-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={low} />
        </linearGradient>
        <radialGradient id="cxv-spot" cx=".5" cy=".62" r=".6">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={(0.05 + s.dayness * 0.07).toFixed(3)} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cxv-sunglow">
          <stop offset="0" stopColor={s.sun.color} stopOpacity=".5" />
          <stop offset=".4" stopColor={s.sun.color} stopOpacity=".12" />
          <stop offset="1" stopColor={s.sun.color} stopOpacity="0" />
        </radialGradient>
        <clipPath id="cxv-moonlit">
          <path d={moonLitPath(s.moon.x, s.moon.y, r, s.moon.phase)} />
        </clipPath>
      </defs>
      <rect x="-200" y="-100" width="2000" height="900" fill="url(#cxv-sky)" />
      <rect x="-200" y="-100" width="2000" height="900" fill="url(#cxv-spot)" />
      {s.stars > 0.02 && clear > 0.3 ? (
        <g opacity={(s.stars * clear * 0.8).toFixed(2)}>
          {STARS.map((st, i) => (
            <circle key={i} cx={st.x} cy={st.y} r={st.s} fill="#D8E2EC" className={`cxv-star cxv-d${st.d}`} />
          ))}
        </g>
      ) : null}
      {s.sun.visible && clear > 0.2 ? (
        <g className="cxv-sun" opacity={(clear * 0.9).toFixed(2)}>
          <circle cx={s.sun.x} cy={s.sun.y} r="90" fill="url(#cxv-sunglow)" />
          <circle cx={s.sun.x} cy={s.sun.y} r="13" fill={s.sun.color} opacity={Math.max(0.3, s.sun.glow).toFixed(2)} />
        </g>
      ) : null}
      {s.moon.visible && s.moon.opacity > 0.03 && clear > 0.2 ? (
        <g className="cxv-moon" opacity={(s.moon.opacity * clear).toFixed(2)}>
          <circle cx={s.moon.x} cy={s.moon.y} r={r} fill="#3A4558" opacity=".35" />
          <path d={moonLitPath(s.moon.x, s.moon.y, r, s.moon.phase)} fill="#E8EEF5" />
        </g>
      ) : null}
    </g>
  );
}
