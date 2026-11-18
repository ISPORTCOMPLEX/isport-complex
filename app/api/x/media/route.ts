// Fotky z príspevkov siete X cez našu doménu (náhľad príspevku v článku).
// Povolené sú len cesty na pbs.twimg.com s fotkami príspevkov, profilovými fotkami a náhľadmi videí.

export const runtime = 'nodejs';

const MAX_BYTES = 6 * 1024 * 1024;
const PATH = /^(?:media|profile_images|ext_tw_video_thumb|amplify_video_thumb|tweet_video_thumb)\/[\w./-]+?\.(?:jpg|jpeg|png|webp)$/i;

function notFound() {
  return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' } });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const p = url.searchParams.get('p') ?? '';
  if (!PATH.test(p) || p.includes('..')) return notFound();
  const size = url.searchParams.get('s') === 'small' ? 'small' : 'medium';
  const src = p.startsWith('media/') ? `https://pbs.twimg.com/${p.replace(/\.(jpe?g|png|webp)$/i, '')}?format=${p.split('.').pop()}&name=${size}` : `https://pbs.twimg.com/${p}`;
  let upstream: Response;
  try {
    upstream = await fetch(src, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
  } catch {
    return new Response('Bad gateway', { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
  const type = upstream.headers.get('content-type') ?? '';
  if (!upstream.ok || !/^image\/(jpeg|png|webp)$/.test(type)) return notFound();
  const body = await upstream.arrayBuffer();
  if (body.byteLength > MAX_BYTES) return notFound();
  return new Response(body, {
    headers: {
      'Content-Type': type,
      'Content-Length': String(body.byteLength),
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
