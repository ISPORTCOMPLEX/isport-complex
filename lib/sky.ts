// Obloha nad halou v Košiciach: poloha slnka a mesiaca, fáza mesiaca a farby oblohy podľa času a počasia.
// Astronomické vzorce podľa SunCalc (V. Agafonkin, BSD-2) – presnosť ~1° stačí na ilustráciu.
// Čisté funkcie bez prehliadača aj servera, aby sa dali testovať a počítať na oboch stranách rovnako.

export const KOSICE = { lat: 48.7164, lon: 21.2611 };

const RAD = Math.PI / 180;
const DAY_MS = 86400000;
const J1970 = 2440588;
const J2000 = 2451545;
const OBLIQ = RAD * 23.4397;

const toDays = (ms: number) => ms / DAY_MS - 0.5 + J1970 - J2000;
const rightAscension = (l: number, b: number) => Math.atan2(Math.sin(l) * Math.cos(OBLIQ) - Math.tan(b) * Math.sin(OBLIQ), Math.cos(l));
const declination = (l: number, b: number) => Math.asin(Math.sin(b) * Math.cos(OBLIQ) + Math.cos(b) * Math.sin(OBLIQ) * Math.sin(l));
const azimuthOf = (h: number, phi: number, dec: number) => Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
const altitudeOf = (h: number, phi: number, dec: number) => Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(h));
const siderealTime = (d: number, lw: number) => RAD * (280.16 + 360.9856235 * d) - lw;

function sunCoords(d: number) {
  const m = RAD * (357.5291 + 0.98560028 * d);
  const c = RAD * (1.9148 * Math.sin(m) + 0.02 * Math.sin(2 * m) + 0.0003 * Math.sin(3 * m));
  const l = m + c + RAD * 102.9372 + Math.PI;
  return { dec: declination(l, 0), ra: rightAscension(l, 0) };
}

function moonCoords(d: number) {
  const l0 = RAD * (218.316 + 13.176396 * d);
  const m = RAD * (134.963 + 13.064993 * d);
  const f = RAD * (93.272 + 13.22935 * d);
  const l = l0 + RAD * 6.289 * Math.sin(m);
  const b = RAD * 5.128 * Math.sin(f);
  return { ra: rightAscension(l, b), dec: declination(l, b), dist: 385001 - 20905 * Math.cos(m) };
}

export type Pos = { alt: number; az: number }; // v stupňoch; azimut od juhu, kladný na západ

export function sunPosition(ms: number, lat = KOSICE.lat, lon = KOSICE.lon): Pos {
  const lw = RAD * -lon;
  const phi = RAD * lat;
  const d = toDays(ms);
  const c = sunCoords(d);
  const h = siderealTime(d, lw) - c.ra;
  return { alt: altitudeOf(h, phi, c.dec) / RAD, az: azimuthOf(h, phi, c.dec) / RAD };
}

export function moonPosition(ms: number, lat = KOSICE.lat, lon = KOSICE.lon): Pos {
  const lw = RAD * -lon;
  const phi = RAD * lat;
  const d = toDays(ms);
  const c = moonCoords(d);
  const h = siderealTime(d, lw) - c.ra;
  return { alt: altitudeOf(h, phi, c.dec) / RAD, az: azimuthOf(h, phi, c.dec) / RAD };
}

// fáza: 0 nov, 0.25 prvá štvrť, 0.5 spln, 0.75 posledná štvrť; fraction = osvetlená časť 0–1
export function moonPhase(ms: number): { phase: number; fraction: number } {
  const d = toDays(ms);
  const s = sunCoords(d);
  const m = moonCoords(d);
  const sdist = 149598000;
  const phi = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra));
  const inc = Math.atan2(sdist * Math.sin(phi), m.dist - sdist * Math.cos(phi));
  const angle = Math.atan2(Math.cos(s.dec) * Math.sin(s.ra - m.ra), Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra));
  return { phase: 0.5 + (0.5 * inc * (angle < 0 ? -1 : 1)) / Math.PI, fraction: (1 + Math.cos(inc)) / 2 };
}

export function moonPhaseName(phase: number): string {
  const p = ((phase % 1) + 1) % 1;
  if (p < 0.03 || p > 0.97) return 'nov';
  if (p < 0.22) return 'dorastajúci kosák';
  if (p < 0.28) return 'prvá štvrť';
  if (p < 0.47) return 'dorastajúci mesiac';
  if (p < 0.53) return 'spln';
  if (p < 0.72) return 'cúvajúci mesiac';
  if (p < 0.78) return 'posledná štvrť';
  return 'cúvajúci kosák';
}

// tvar osvetlenej časti mesiaca (severná pologuľa: dorastajúci svieti vpravo) ako SVG cesta
export function moonLitPath(cx: number, cy: number, r: number, phase: number): string {
  const p = ((phase % 1) + 1) % 1;
  const k = Math.cos(2 * Math.PI * p); // 1 nov … -1 spln
  const rx = Math.max(0.01, r * Math.abs(k));
  const f = (n: number) => n.toFixed(2);
  const top = `${f(cx)} ${f(cy - r)}`;
  const bottom = `${f(cx)} ${f(cy + r)}`;
  if (p < 0.5) {
    // svieti pravá strana: vonkajší oblúk vpravo, terminátor vpravo (kosák) alebo vľavo (dorastajúci)
    return `M${top}A${f(r)} ${f(r)} 0 0 1 ${bottom}A${f(rx)} ${f(r)} 0 0 ${k > 0 ? 0 : 1} ${top}Z`;
  }
  return `M${top}A${f(r)} ${f(r)} 0 0 0 ${bottom}A${f(rx)} ${f(r)} 0 0 ${k > 0 ? 1 : 0} ${top}Z`;
}

// ===== počasie (z Open-Meteo, spracované na serveri) =====
export type Precip = 'none' | 'rain' | 'snow' | 'sleet';
export type Weather = {
  temp: number | null; // °C
  code: number; // WMO kód
  clouds: number; // 0–1
  precip: Precip;
  intensity: 0 | 1 | 2 | 3; // 0 nič, 1 slabé, 2 mierne, 3 silné
  thunder: boolean;
  fog: boolean;
  wind: number; // km/h
  snowCover: boolean; // leží sneh
};

export const CLEAR: Weather = { temp: null, code: 0, clouds: 0, precip: 'none', intensity: 0, thunder: false, fog: false, wind: 0, snowCover: false };

// WMO kódy počasia → čo kreslíme
export function weatherFromCode(i: { code: number; clouds?: number | null; temp?: number | null; wind?: number | null; snowDepth?: number | null; rain?: number | null; snowfall?: number | null }): Weather {
  const c = Math.round(i.code);
  const lvl = (a: number[], b: number[], h: number[]): 0 | 1 | 2 | 3 => (a.includes(c) ? 1 : b.includes(c) ? 2 : h.includes(c) ? 3 : 0);
  let precip: Precip = 'none';
  let intensity: 0 | 1 | 2 | 3 = 0;
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(c)) {
    precip = 'rain';
    intensity = lvl([51, 56, 61, 80], [53, 57, 63, 66, 81], [55, 65, 67, 82]);
  } else if ([71, 73, 75, 77, 85, 86].includes(c)) {
    precip = 'snow';
    intensity = lvl([71, 77, 85], [73], [75, 86]);
  } else if (c >= 95 && c <= 99) {
    precip = 'rain';
    intensity = 3;
  }
  // dážď so snehom: zrážky pri teplote okolo nuly s nameraným snežením aj dažďom
  if (precip === 'rain' && (i.snowfall ?? 0) > 0 && (i.rain ?? 0) > 0) precip = 'sleet';
  const cloudsByCode = c >= 3 ? 1 : c === 2 ? 0.55 : c === 1 ? 0.25 : 0;
  const clouds = i.clouds == null ? cloudsByCode : Math.min(1, Math.max(0, i.clouds / 100));
  return {
    temp: i.temp ?? null,
    code: c,
    clouds: precip !== 'none' ? Math.max(clouds, 0.75) : clouds,
    precip,
    intensity,
    thunder: c >= 95 && c <= 99,
    fog: c === 45 || c === 48,
    wind: Math.max(0, i.wind ?? 0),
    snowCover: (i.snowDepth ?? 0) >= 0.01 || (precip === 'snow' && intensity >= 2),
  };
}

export function weatherLabel(w: Weather): string {
  if (w.thunder) return 'búrka';
  if (w.precip === 'snow') return w.intensity >= 3 ? 'husto sneží' : 'sneží';
  if (w.precip === 'sleet') return 'dážď so snehom';
  if (w.precip === 'rain') return w.intensity >= 3 ? 'silný dážď' : w.intensity === 1 ? 'mrholí' : 'prší';
  if (w.fog) return 'hmla';
  if (w.clouds >= 0.85) return 'zamračené';
  if (w.clouds >= 0.45) return 'polojasno';
  if (w.clouds >= 0.15) return 'skoro jasno';
  return 'jasno';
}

// ===== scéna: kde je slnko/mesiac v obrázku a aké sú farby =====
type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const toHex = (c: RGB) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// výška slnka (°) → farba oblohy hore, pri obzore a hmlistý pás pri obzore
const SKY_KEYS: { alt: number; top: string; mid: string; low: string }[] = [
  { alt: -18, top: '#0D1626', mid: '#0B111C', low: '#0A0E16' },
  { alt: -10, top: '#101A33', mid: '#1A2244', low: '#2B2A4F' },
  { alt: -4, top: '#1B2A55', mid: '#4A3F72', low: '#C8645A' },
  { alt: 1, top: '#2B4A86', mid: '#7A6F9E', low: '#F29A5C' },
  { alt: 8, top: '#2F64AD', mid: '#6E9FD6', low: '#F3C98E' },
  { alt: 20, top: '#2A63B0', mid: '#5E9BDB', low: '#A9D3F2' },
  { alt: 90, top: '#2457A4', mid: '#4F8FD6', low: '#9CCBF0' },
];

export type Scene = {
  phase: 'night' | 'twilight' | 'day';
  sky: { top: string; mid: string; low: string };
  dayness: number; // 0 noc … 1 deň
  sun: { x: number; y: number; visible: boolean; color: string; glow: number };
  moon: { x: number; y: number; visible: boolean; phase: number; fraction: number; opacity: number };
  stars: number; // viditeľnosť hviezd 0–1
  lights: boolean; // vonkajšie svetlá (ihrisko, mesto)
};

// Obzor v obrázku: strechy hál a mesto. Slnko a mesiac vychádzajú „spoza“ budov – výška 0° leží na streche pod nimi.
function rawHorizon(x: number): number {
  if (x >= 30 && x <= 870) return 165 + 135 * ((x - 450) / 420) ** 2 - 16; // oblúková strecha haly 1
  if (x >= 1200 && x <= 1580) return 270; // hala 2
  return 440; // mesto pri ihrisku a po stranách
}
export function horizonY(x: number): number {
  let sum = 0;
  for (let i = -6; i <= 6; i++) sum += rawHorizon(x + i * 12);
  return sum / 13;
}
// pohľad na juh: azimut −120° (východ) → ľavý okraj, +120° (západ) → pravý okraj; 65° výšky je hore (y 30)
const skyXY = (p: Pos) => {
  const x = 800 + (Math.max(-130, Math.min(130, p.az)) / 120) * 760;
  const h = horizonY(x);
  const alt = Math.max(-12, Math.min(70, p.alt));
  return { x, y: alt >= 0 ? h - (alt / 65) * (h - 30) : h - alt * 6 };
};

export function scene(ms: number, w: Weather = CLEAR): Scene {
  const sp = sunPosition(ms);
  const mp = moonPosition(ms);
  const mph = moonPhase(ms);
  let i = 0;
  while (i < SKY_KEYS.length - 2 && sp.alt > SKY_KEYS[i + 1].alt) i++;
  const a = SKY_KEYS[i];
  const b = SKY_KEYS[i + 1];
  const t = clamp01((sp.alt - a.alt) / (b.alt - a.alt));
  let top = mix(hex(a.top), hex(b.top), t);
  let mid = mix(hex(a.mid), hex(b.mid), t);
  let low = mix(hex(a.low), hex(b.low), t);
  const dayness = clamp01((sp.alt + 8) / 16);
  // oblačnosť: obloha šedne (cez deň svetlejšia šedá, v noci tmavá)
  const grey = w.clouds * (w.precip !== 'none' || w.thunder ? 0.92 : 0.78);
  const g = (l: number): RGB => [l, l + 4, l + 10];
  const gTop = g(26 + dayness * 70);
  const gMid = g(30 + dayness * 95);
  const gLow = g(34 + dayness * 110);
  top = mix(top, gTop, grey);
  mid = mix(mid, gMid, grey);
  low = mix(low, gLow, grey);
  if (w.thunder) {
    top = mix(top, [20, 22, 30], 0.4);
    mid = mix(mid, [30, 32, 40], 0.4);
  }
  const s = skyXY(sp);
  const m = skyXY(mp);
  const sunLow = clamp01(sp.alt / 12);
  return {
    phase: sp.alt > 4 ? 'day' : sp.alt > -8 ? 'twilight' : 'night',
    sky: { top: toHex(top), mid: toHex(mid), low: toHex(low) },
    dayness,
    sun: { ...s, visible: sp.alt > -3, color: toHex(mix([255, 120, 60], [255, 244, 214], sunLow)), glow: clamp01(1 - w.clouds * 0.9) },
    moon: { ...m, visible: mp.alt > -3 && mph.fraction > 0.02, phase: mph.phase, fraction: mph.fraction, opacity: clamp01((1 - dayness * 0.6) * (1 - w.clouds * 0.85)) },
    stars: clamp01((-sp.alt - 6) / 8) * clamp01(1 - w.clouds * 1.1),
    lights: sp.alt < 3 || (w.clouds > 0.9 && (w.precip !== 'none' || w.fog)),
  };
}
