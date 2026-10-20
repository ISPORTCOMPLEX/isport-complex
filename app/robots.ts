import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/requestInfo';

// Vyhľadávače: povolené všetko verejné. Neverejné časti (účet, administrácia, API) tu zámerne nevypisujeme,
// aby robots.txt neprezrádzal ich adresy – chráni ich prihlásenie, 404 pre neprihlásených a hlavička X-Robots-Tag: noindex.
export default function robots(): MetadataRoute.Robots {
  const base = appUrl() ?? 'http://localhost:3000';
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${base}/sitemap.xml`,
  };
}
