import { createHmac } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { getSecret } from '@/lib/secrets';
import { hitLimit } from '@/lib/rateLimit';
import { getSessionUser } from '@/lib/session';
import { browser, device, isBot, os, sourceOf } from '@/lib/analytics/ua';
import { todayIso } from '@/lib/booking/time';

// Zber návštevnosti (bez cookies). Ukladá cestu, doménu odkazu, typ zariadenia a krajinu.
// IP adresa sa nikdy neukladá – použije sa len na denný hash návštevníka a limit.
export const dynamic = 'force-dynamic';

const SKIP = /^\/(admin|api|_next)(\/|$)/;
const noContent = () => new Response(null, { status: 204 });

function cleanPath(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.length > 300) return null;
  const p = raw.split('?')[0].split('#')[0];
  if (SKIP.test(p)) return null;
  // Kódy rezervácií a tokeny v URL nahradíme, aby sa neukladali.
  return p.replace(/ISP-[A-Z0-9]{6}/g, ':kod').replace(/[A-Za-z0-9_-]{24,}/g, ':token') || '/';
}

function host(raw: unknown, self: string): string | null {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const h = new URL(raw).hostname.replace(/^www\./, '').slice(0, 100);
    return h && h !== self ? h : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const ua = (req.headers.get('user-agent') ?? '').slice(0, 300);
  if (isBot(ua) || req.headers.get('sec-gpc') === '1' || req.headers.get('dnt') === '1') return noContent();
  const origin = req.headers.get('origin');
  const selfHost = new URL(req.url).hostname.replace(/^www\./, '');
  if (origin && new URL(origin).hostname.replace(/^www\./, '') !== selfHost) return noContent();

  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > 2000) return noContent();
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return noContent();
  }

  const raw = req.headers.get('x-vercel-forwarded-for') ?? req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for') ?? '';
  const ip = raw.split(',')[0]?.trim() || 'unknown';
  const limit = await hitLimit(`a:${ip}`, 90, 60);
  if (!limit.ok) return noContent();

  // Ukončenie zobrazenia: doplní čas strávený na stránke.
  if (body.t === 'leave') {
    const id = typeof body.id === 'string' && /^[a-z0-9]{20,40}$/.test(body.id) ? body.id : null;
    const d = typeof body.d === 'number' && Number.isFinite(body.d) ? Math.round(Math.min(Math.max(body.d, 0), 30 * 60000)) : null;
    if (id && d !== null) await prisma.pageView.updateMany({ where: { id, durationMs: null, createdAt: { gt: new Date(Date.now() - 3600000) } }, data: { durationMs: d } });
    return noContent();
  }

  const path = cleanPath(body.p);
  if (!path) return noContent();
  const refHost = host(body.r, selfHost);
  const utm = typeof body.u === 'string' && /^[\w.-]{1,40}$/.test(body.u) ? body.u : null;
  const salt = createHmac('sha256', getSecret('analytics')).update(todayIso()).digest();
  const visitor = createHmac('sha256', salt).update(`${ip}|${ua}`).digest('base64url').slice(0, 22);
  const country = (req.headers.get('x-vercel-ip-country') ?? '').slice(0, 2).toUpperCase() || null;
  const user = await getSessionUser().catch(() => null);
  if (user && user.role !== 'CUSTOMER') return noContent(); // personál neskresľuje štatistiky

  const view = await prisma.pageView.create({
    data: { path, referrer: refHost, source: sourceOf(refHost, utm), visitor, device: device(ua), browser: browser(ua), os: os(ua), country, loggedIn: Boolean(user) },
    select: { id: true },
  });
  return Response.json({ id: view.id });
}
