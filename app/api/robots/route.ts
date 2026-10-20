import { appUrl } from '@/lib/requestInfo';

// robots.txt – pokyny pre vyhľadávače. Neverejné časti tu zámerne nevypisujeme (neprezrádzame ich adresy);
// chráni ich prihlásenie, 404 pre neprihlásených a hlavička X-Robots-Tag: noindex.
export function GET() {
  const base = appUrl() ?? 'http://localhost:3000';
  const body = [
    '# ─────────────────────────────────────────────',
    '#  I-SPORT COMPLEX · Košice',
    '#  Web navrhol a vytvoril Matúš Bereš',
    '#  matusvanberes@gmail.com',
    `#  Ľudia, nie roboty: ${base}/humans.txt`,
    '# ─────────────────────────────────────────────',
    '',
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${base}/sitemap.xml`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
