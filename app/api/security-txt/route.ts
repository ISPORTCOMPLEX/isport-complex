import { getSite } from '@/lib/siteSettings';
import { appUrl } from '@/lib/requestInfo';

// Kontakt pre hlásenie bezpečnostných chýb (RFC 9116).
export async function GET() {
  const site = await getSite();
  const email = site.notifyEmail || site.email;
  const base = appUrl();
  // bez vyplneného e-mailu odkážeme na kontaktný formulár – súbor musí existovať vždy
  const contact = email ? `mailto:${email}` : `${base ?? 'https://isport-complex.vercel.app'}/kontakt`;
  const expires = new Date(Date.now() + 180 * 86400000).toISOString();
  const body = [`Contact: ${contact}`, `Expires: ${expires}`, 'Preferred-Languages: sk, en', ...(base ? [`Canonical: ${base}/.well-known/security.txt`] : []), ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
}
