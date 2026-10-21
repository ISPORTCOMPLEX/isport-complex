import { cloudName, parseVideoPath, videoSourceUrl } from '@/lib/cloudinary';

// Videá z článkov cez našu doménu (návštevník nevidí, kde sú uložené). Podporuje posúvanie vo videu
// (HTTP Range) – prehliadač si pýta len časti súboru, odpoveď sa streamuje, nič sa nedrží v pamäti.

export const runtime = 'nodejs';

const PASS = ['content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag'];

function notFound() {
  return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'public, max-age=60' } });
}

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const v = parseVideoPath(path ?? []);
  const cloud = cloudName();
  if (!v || !cloud) return notFound();

  const headers: Record<string, string> = {};
  const range = req.headers.get('range');
  if (v.ext === 'mp4' && range && /^bytes=\d*-\d*$/.test(range)) headers.Range = range;

  let upstream: Response;
  try {
    upstream = await fetch(videoSourceUrl(cloud, v.publicId, v.version, v.ext), { headers, signal: AbortSignal.timeout(30000), cache: 'no-store' });
  } catch {
    return new Response('Bad gateway', { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
  const type = upstream.headers.get('content-type') ?? '';
  if (!(upstream.ok || upstream.status === 206) || !(type.startsWith('video/') || type.startsWith('image/'))) return notFound();

  const out = new Headers({
    'Content-Type': v.ext === 'mp4' ? 'video/mp4' : 'image/jpeg',
    'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
    'Content-Disposition': `inline; filename="i-sport-complex.${v.ext}"`,
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex',
  });
  for (const h of PASS) {
    const val = upstream.headers.get(h);
    if (val) out.set(h, val);
  }
  if (v.ext === 'mp4') out.set('Accept-Ranges', 'bytes');
  return new Response(upstream.body, { status: upstream.status, headers: out });
}
