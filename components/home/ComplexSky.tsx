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
  return Array.from({ length: 46 }, (_, i) => ({ x: Math.round(r() * 1600), y: Math.round(10 + r() * 330), s: r() < 0.15 ? 1.7 : r() < 0.5 ? 1.2 : 0.8, d: i % 3 }));
})();

// silueta mesta za ihriskom
const SKYLINE = (() => {
  const r = rng(7);
  let x = 0;
  let d = '';
  while (x < 1600) {
    const w = [34, 42, 50, 58, 70][Math.floor(r() * 5)];
    const h = [60, 80, 95, 110, 130, 70][Math.floor(r() * 6)];
    d += `M${x} 560V${560 - h}H${x + w}V560`;
    x += w + [0, 6, 10][Math.floor(r() * 3)];
  }
  return d;
})();
const WINDOWS = (() => {
  const r = rng(3);
  return Array.from({ length: 26 }, () => ({ x: Math.round(880 + r() * 320), y: Math.round(455 + r() * 85), o: [0.3, 0.45, 0.6][Math.floor(r() * 3)] }));
})();

// oblaky: pozícia, veľkosť a rýchlosť (trieda s dĺžkou animácie)
const CLOUDS = [
  { x: 140, y: 70, s: 1.15 },
  { x: 980, y: 46, s: 0.9 },
  { x: 560, y: 120, s: 1.3 },
  { x: 1360, y: 150, s: 1.05 },
  { x: 320, y: 200, s: 0.8 },
  { x: 1180, y: 230, s: 0.95 },
  { x: 760, y: 34, s: 0.75 },
  { x: 40, y: 260, s: 1 },
  { x: 1500, y: 60, s: 0.85 },
  { x: 880, y: 180, s: 1.2 },
];

function Cloud({ x, y, s, fill, opacity, i }: { x: number; y: number; s: number; fill: string; opacity: number; i: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className={`cxv-cloud cxv-cl${i % 5}`}>
        <g fill={fill} opacity={opacity.toFixed(2)}>
          <ellipse cx="0" cy="0" rx="70" ry="20" />
          <circle cx="-30" cy="-12" r="22" />
          <circle cx="6" cy="-22" r="30" />
          <circle cx="40" cy="-8" r="20" />
        </g>
      </g>
    </g>
  );
}

const hexToRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a: string, b: string, t: number) => {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
};

export function ComplexSky({ s, w }: { s: Scene; w: Weather }) {
  const storm = w.precip !== 'none' || w.thunder;
  const cloudCount = Math.round(w.clouds * CLOUDS.length);
  const cloudFill = mixHex(mixHex('#2A3446', '#F1F5F9', s.dayness), mixHex('#1E2430', '#8D98A5', s.dayness), storm ? 0.85 : w.clouds > 0.8 ? 0.5 : 0);
  const cloudOpacity = 0.55 + s.dayness * 0.35 + (storm ? 0.1 : 0);
  const city = mixHex('#121B28', '#5A7090', s.dayness * 0.85);
  const dome = mixHex('#111A26', '#536886', s.dayness * 0.85);
  const r = 15;
  const twilightGlow = s.phase === 'twilight' ? 1 - w.clouds * 0.7 : 0;
  return (
    <g className="cxv-skylayer">
      <defs>
        <linearGradient id="cxv-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={s.sky.top} />
          <stop offset=".55" stopColor={s.sky.mid} />
          <stop offset=".8" stopColor={s.sky.low} />
          <stop offset="1" stopColor={s.sky.low} />
        </linearGradient>
        <radialGradient id="cxv-sunglow">
          <stop offset="0" stopColor={s.sun.color} stopOpacity=".55" />
          <stop offset=".35" stopColor={s.sun.color} stopOpacity=".18" />
          <stop offset="1" stopColor={s.sun.color} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cxv-moonglow">
          <stop offset="0" stopColor="#E4ECF4" stopOpacity=".22" />
          <stop offset="1" stopColor="#E4ECF4" stopOpacity="0" />
        </radialGradient>
        <clipPath id="cxv-moonlit">
          <path d={moonLitPath(s.moon.x, s.moon.y, r, s.moon.phase)} />
        </clipPath>
      </defs>
      <rect x="-200" y="-100" width="2000" height="700" fill="url(#cxv-sky)" />

      {s.stars > 0.02 ? (
        <g opacity={s.stars.toFixed(2)}>
          {STARS.map((st, i) => (
            <circle key={i} cx={st.x} cy={st.y} r={st.s} fill="#D8E2EC" className={`cxv-star cxv-d${st.d}`} />
          ))}
        </g>
      ) : null}

      {twilightGlow > 0 ? <ellipse cx={Math.max(100, Math.min(1500, s.sun.x))} cy="400" rx="620" ry="190" fill="url(#cxv-sunglow)" opacity={twilightGlow.toFixed(2)} /> : null}

      {s.sun.visible ? (
        <g className="cxv-sun">
          <circle cx={s.sun.x} cy={s.sun.y} r="120" fill="url(#cxv-sunglow)" opacity={s.sun.glow.toFixed(2)} />
          <circle cx={s.sun.x} cy={s.sun.y} r="22" fill={s.sun.color} opacity={Math.max(0.08, s.sun.glow).toFixed(2)} />
        </g>
      ) : null}

      {s.moon.visible && s.moon.opacity > 0.03 ? (
        <g className="cxv-moon" opacity={s.moon.opacity.toFixed(2)}>
          <circle cx={s.moon.x} cy={s.moon.y} r="70" fill="url(#cxv-moonglow)" opacity={s.moon.fraction.toFixed(2)} />
          <circle cx={s.moon.x} cy={s.moon.y} r={r} fill="#3A4558" opacity=".35" />
          <path d={moonLitPath(s.moon.x, s.moon.y, r, s.moon.phase)} fill="#E8EEF5" />
          <g clipPath="url(#cxv-moonlit)" fill="#C3CDD8" opacity=".55">
            <circle cx={s.moon.x - 5} cy={s.moon.y - 4} r="3.2" />
            <circle cx={s.moon.x + 5} cy={s.moon.y + 5} r="2.2" />
            <circle cx={s.moon.x + 3} cy={s.moon.y - 7} r="1.5" />
          </g>
        </g>
      ) : null}

      {CLOUDS.slice(0, cloudCount).map((c, i) => (
        <Cloud key={i} i={i} x={c.x} y={c.y + (storm ? 20 : 0)} s={c.s * (storm ? 1.25 : 1)} fill={cloudFill} opacity={Math.min(1, cloudOpacity)} />
      ))}

      <path d={SKYLINE} fill={city} />
      <path d="M1022 560V420H1044V560ZM1026 420L1033 336L1040 420Z" fill={dome} />
      <path d="M1033 336V326M1029 330H1037" stroke={mixHex('#2A3646', '#7B8DA6', s.dayness)} strokeWidth="1.5" />
      {s.dayness < 0.85 ? (
        <g opacity={(1 - s.dayness).toFixed(2)}>
          {WINDOWS.map((wn, i) => (
            <rect key={i} x={wn.x} y={wn.y} width="3" height="4" fill="#FFB020" opacity={wn.o} />
          ))}
        </g>
      ) : null}
    </g>
  );
}
