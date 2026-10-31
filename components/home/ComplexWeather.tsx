import type { ReactNode } from 'react';
import type { Scene, Weather } from '@/lib/sky';
import { rng } from '@/components/home/ComplexSky';

// Počasie pred halami: dážď, sneh, dážď so snehom, búrka s bleskami, hmla a snehová pokrývka.
// Zrážky padajú len vonku – maska vyreže haly (rez je „vnútri“) aj zem. Pohyb je CSS (dlaždica sa posúva dole).

const H = 700;
type Drop = { x: number; y: number; l: number };
type Flake = { x: number; y: number; r: number };

const drops = (n: number, seed: number): Drop[] => {
  const r = rng(seed);
  return Array.from({ length: n }, () => ({ x: Math.round(r() * 1700 - 50), y: Math.round(r() * H), l: Math.round(12 + r() * 12) }));
};
const flakes = (n: number, seed: number, min: number, max: number): Flake[] => {
  const r = rng(seed);
  return Array.from({ length: n }, () => ({ x: Math.round(r() * 1700 - 50), y: Math.round(r() * H), r: +(min + r() * (max - min)).toFixed(1) }));
};

const RAIN = { 1: drops(70, 21), 2: drops(130, 22), 3: drops(210, 23) } as const;
const SNOW_FAR = { 1: flakes(40, 31, 1, 1.8), 2: flakes(70, 32, 1, 1.8), 3: flakes(110, 33, 1, 1.8) } as const;
const SNOW_NEAR = { 1: flakes(26, 41, 2, 3.2), 2: flakes(46, 42, 2, 3.4), 3: flakes(80, 43, 2.2, 3.6) } as const;
const SPLASH = (() => {
  const r = rng(51);
  return Array.from({ length: 16 }, (_, i) => ({ x: Math.round(20 + r() * 1560), d: i % 4 }));
})();

function Tile({ children, cls }: { children: ReactNode; cls: string }) {
  // dve kópie nad sebou – posun o výšku scény vytvorí nekonečný pád
  return (
    <g className={cls}>
      <g>{children}</g>
      <g transform={`translate(0 ${-H})`}>{children}</g>
    </g>
  );
}

export function ComplexWeather({ s, w }: { s: Scene; w: Weather }) {
  const lvl = (w.intensity || 1) as 1 | 2 | 3;
  const rain = w.precip === 'rain' || w.precip === 'sleet';
  const snow = w.precip === 'snow' || w.precip === 'sleet';
  const slant = Math.min(24, 4 + w.wind * 0.55);
  const rainColor = s.dayness > 0.5 ? '#C9D8E6' : '#9FB6CC';
  return (
    <g className="cxv-wx" aria-hidden="true">
      <defs>
        <mask id="cxv-out" maskUnits="userSpaceOnUse" x="-200" y="-100" width="2000" height="900">
          <rect x="-200" y="-100" width="2000" height="900" fill="#FFFFFF" />
          <path d="M40 562V300C200 120 700 120 860 300V562Z" fill="#000000" />
          <rect x="1206" y="286" width="368" height="276" fill="#000000" />
          <rect x="-200" y="561" width="2000" height="400" fill="#000000" />
        </mask>
        <linearGradient id="cxv-fogband" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C7D0D9" stopOpacity="0" />
          <stop offset=".6" stopColor="#C7D0D9" stopOpacity=".5" />
          <stop offset="1" stopColor="#C7D0D9" stopOpacity=".2" />
        </linearGradient>
      </defs>

      {/* cez deň je zem svetlejšia */}
      <rect x="-200" y="565" width="2000" height="300" fill="#4A5868" opacity={(s.dayness * 0.32).toFixed(2)} />

      {w.snowCover ? (
        <g className="cxv-snowcover" fill="#F2F6FA">
          <path d="M26 306C190 110 710 110 874 306" stroke="#F2F6FA" strokeWidth="6" fill="none" strokeLinecap="round" />
          <rect x="1204" y="281" width="372" height="7" rx="3.5" />
          <rect x="-200" y="557" width="2000" height="8" />
          <path d="M912 515L1168 515L1196 560L884 560Z" opacity=".78" />
          <rect x="876" y="318" width="32" height="4" rx="2" /><rect x="1172" y="318" width="32" height="4" rx="2" />
          <ellipse cx="20" cy="489" rx="15" ry="5" /><ellipse cx="875" cy="511" rx="10" ry="3.5" /><ellipse cx="1206" cy="509" rx="10" ry="3.5" /><ellipse cx="1592" cy="496" rx="13" ry="4.5" />
        </g>
      ) : null}

      {w.fog ? (
        <g className="cxv-fog" mask="url(#cxv-out)">
          <rect x="-200" y="330" width="2000" height="240" fill="url(#cxv-fogband)" />
          <rect x="-200" y="420" width="2000" height="160" fill="url(#cxv-fogband)" className="cxv-fog2" />
        </g>
      ) : null}

      <g mask="url(#cxv-out)">
        {rain ? (
          <g transform={`skewX(${-slant})`}>
            <Tile cls={`cxv-rain cxv-rain-${lvl}`}>
              <path d={(w.precip === 'sleet' ? RAIN[1] : RAIN[lvl]).map((d) => `M${d.x} ${d.y}v${d.l}`).join('')} stroke={rainColor} strokeWidth="1.4" strokeLinecap="round" opacity=".6" />
            </Tile>
          </g>
        ) : null}
        {snow ? (
          <>
            <g className="cxv-sway cxv-sway-a">
              <Tile cls={`cxv-snow cxv-snow-far cxv-snow-${lvl}`}>
                {(w.precip === 'sleet' ? SNOW_FAR[1] : SNOW_FAR[lvl]).map((f, i) => (
                  <circle key={i} cx={f.x} cy={f.y} r={f.r} fill="#E9EFF5" opacity=".6" />
                ))}
              </Tile>
            </g>
            <g className="cxv-sway cxv-sway-b">
              <Tile cls={`cxv-snow cxv-snow-near cxv-snow-${lvl}`}>
                {(w.precip === 'sleet' ? SNOW_NEAR[1] : SNOW_NEAR[lvl]).map((f, i) => (
                  <circle key={i} cx={f.x} cy={f.y} r={f.r} fill="#FFFFFF" opacity=".92" />
                ))}
              </Tile>
            </g>
          </>
        ) : null}
      </g>

      {rain && w.precip === 'rain' ? (
        <g fill="none" stroke={rainColor} strokeWidth="1" opacity=".55">
          {SPLASH.map((p, i) => (
            <ellipse key={i} cx={p.x} cy="566" rx="6" ry="1.6" className={`cxv-splash cxv-d${p.d % 3}`} />
          ))}
        </g>
      ) : null}

      {w.thunder ? (
        <g>
          <rect x="-200" y="-100" width="2000" height="700" fill="#E8F0FF" className="cxv-flash" />
          <path d="M1290 40L1262 120H1284L1250 210L1310 104H1286L1314 40Z" fill="#FFF6C8" className="cxv-bolt" />
        </g>
      ) : null}
    </g>
  );
}
