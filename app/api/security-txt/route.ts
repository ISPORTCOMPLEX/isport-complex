import { getSite } from '@/lib/siteSettings';
import { appUrl } from '@/lib/requestInfo';

// Kontakt pre hlásenie bezpečnostných chýb (RFC 9116).
export async function GET() {
  const site = await getSite();
  const contact = site.notifyEmail || site.email;
  if (!contact) return new Response('Not found', { status: 404 });
  const expires = new Date(Date.now() + 180 * 86400000).toISOString();
  const base = appUrl();
  const body = [`Contact: mailto:${contact}`, `Expires: ${expires}`, 'Preferred-Languages: sk, en', ...(base ? [`Canonical: ${base}/.well-known/security.txt`] : []), ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
}
