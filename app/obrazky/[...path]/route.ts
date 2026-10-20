import { cloudName, imageUrl, parsePhotoPath } from '@/lib/cloudinary';

// Fotky webu cez našu doménu. Prehliadač nikdy nekontaktuje úložisko priamo, takže návštevník nevidí,
// kde sú fotky uložené. Hlavičky úložiska sa nepreposielajú, odpoveď si na 1 rok uloží CDN Vercelu
// (verzia je v adrese, nová fotka = nová adresa). Iné weby fotku nemôžu vložiť k sebe (CORP same-origin).

export const runtime = 'nodejs';

const TYPES: Record<string, string> = { avif: 'image/avif', webp: 'image/webp', jpg: 'image/jpeg' };
const MAX_BYTES = 8 * 1024 * 1024;

function notFound() {
  return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'public, max-age=60', 'X-Content-Type-Options': 'nosniff' } });
}

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const p = parsePhotoPath(path ?? []);
  const cloud = cloudName();
  if (!p || !cloud) return notFound();

  let upstream: Response;
  try {
    upstream = await fetch(imageUrl(cloud, p.publicId, p.version, p.w, p.ratio, p.fmt), { signal: AbortSignal.timeout(15000), cache: 'no-store' });
  } catch {
    return new Response('Bad gateway', { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
  const type = upstream.headers.get('content-type') ?? '';
  const len = Number(upstream.headers.get('content-length') ?? '0');
  if (!upstream.ok || !type.startsWith('image/') || len > MAX_BYTES) return notFound();
  const body = await upstream.arrayBuffer();
  if (body.byteLength > MAX_BYTES) return notFound();

  return new Response(body, {
    headers: {
      'Content-Type': TYPES[p.fmt],
      'Content-Length': String(body.byteLength),
      'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      'Content-Disposition': `inline; filename="i-sport-complex.${p.fmt}"`,
      'Cross-Origin-Resource-Policy': 'same-origin',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noimageindex',
    },
  });
}
