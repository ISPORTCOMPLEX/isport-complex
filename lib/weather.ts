import 'server-only';
import { CLEAR, KOSICE, weatherFromCode, type Weather } from '@/lib/sky';

// Aktuálne počasie v Košiciach z Open-Meteo (bez kľúča, bez osobných údajov). Volá sa len zo servera a výsledok
// sa drží 15 minút v cache Next.js – návštevník nevolá cudzí server a CSP sa nemení. Pri chybe ilustrácia ostane jasná.
const URL_ =
  'https://api.open-meteo.com/v1/forecast' +
  `?latitude=${KOSICE.lat}&longitude=${KOSICE.lon}` +
  '&current=temperature_2m,weather_code,cloud_cover,rain,showers,snowfall,snow_depth,wind_speed_10m' +
  '&timezone=Europe%2FBratislava';

type Current = { temperature_2m?: number; weather_code?: number; cloud_cover?: number; rain?: number; showers?: number; snowfall?: number; snow_depth?: number; wind_speed_10m?: number };

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function parseOpenMeteo(json: unknown): Weather | null {
  const cur = (json as { current?: Current } | null)?.current;
  const code = num(cur?.weather_code);
  if (!cur || code === null || code < 0 || code > 99) return null;
  return weatherFromCode({
    code,
    clouds: num(cur.cloud_cover),
    temp: num(cur.temperature_2m),
    wind: num(cur.wind_speed_10m),
    snowDepth: num(cur.snow_depth),
    rain: (num(cur.rain) ?? 0) + (num(cur.showers) ?? 0),
    snowfall: num(cur.snowfall),
  });
}

export async function kosiceWeather(): Promise<Weather> {
  try {
    const res = await fetch(URL_, { next: { revalidate: 900 }, signal: AbortSignal.timeout(2500), headers: { accept: 'application/json' } });
    if (!res.ok) return CLEAR;
    return parseOpenMeteo(await res.json()) ?? CLEAR;
  } catch {
    return CLEAR;
  }
}
