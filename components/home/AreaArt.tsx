import { kosiceWeather } from '@/lib/weather';
import { ZoneHero } from '@/components/home/ZoneHero';
import type { Zone } from '@/components/home/ComplexExplorer';

// Ilustrácia areálu do úvodného pásu podstránky (rovnaký čas a počasie ako na hlavnej stránke).
export async function AreaArt({ zone = 'all', bare = false }: { zone?: Zone | 'all'; bare?: boolean }) {
  const weather = await kosiceWeather();
  return <ZoneHero zone={zone} now={Date.now()} weather={weather} bare={bare} />;
}
