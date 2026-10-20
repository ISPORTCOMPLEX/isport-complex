import { NextResponse, type NextRequest } from 'next/server';
import { buildCsp, securityHeaders } from './lib/securityHeaders';

// Next.js 16: proxy.ts (predtým middleware.ts).
// Každá stránka dostane jednorazový nonce, spustí sa len skript, ktorý ho nesie.
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce, process.env.NODE_ENV === 'development');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  // Administrácia sa bez prihlásenia tvári ako neexistujúca stránka (404) – skenery a boti ju nenájdu.
  // Personál sa prihlási cez /prihlasenie a do administrácie vstúpi z Môj účet.
  const path = request.nextUrl.pathname;
  const signedIn = request.cookies.has('__Host-isp_session') || request.cookies.has('isp_session');
  const hideAdmin = (path === '/admin' || path.startsWith('/admin/')) && !signedIn;

  const response = hideAdmin
    ? NextResponse.rewrite(new URL('/_neexistuje', request.url), { request: { headers: requestHeaders } })
    : NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  for (const h of securityHeaders) response.headers.set(h.key, h.value);
  if (hideAdmin) response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
