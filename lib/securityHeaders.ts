// Bezpečnostné hlavičky – rovnaké v proxy.ts aj v next.config.ts (poistka).
// Content-Security-Policy s nonce sa nastavuje len v proxy.ts, lebo nonce je pre každú požiadavku iný.

export const securityHeaders: { key: string; value: string }[] = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    // camera=(self) – skenovanie QR na recepcii, payment=(self) – Apple Pay a Google Pay
    value: 'camera=(self), microphone=(), geolocation=(), payment=(self), usb=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // preload až s vlastnou doménou a po overení, že všetky subdomény bežia na HTTPS
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  { key: 'Origin-Agent-Cluster', value: '?1' },
];

// uploads: len administrácia fotiek smie posielať súbory do úložiska (inde sa jeho adresa v CSP neobjaví)
export function buildCsp(nonce: string, isDev: boolean, uploads = false): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // Štýly len zo súborov webu alebo s nonce. Atribúty style="…" sú zakázané úplne – vypočítané rozmery
    // (grafy, kalendár) nastavuje komponent Dyn cez element.style po načítaní, čo CSP nebráni.
    // Nový kód: žiadne style={{…}} – použi triedu v globals.css alebo <Dyn css={{…}}>.
    "style-src 'self'",
    `style-src-elem 'self' 'nonce-${nonce}'`,
    "style-src-attr 'none'",
    // fotky idú cez našu doménu (/obrazky/…), úložisko prehliadač nekontaktuje
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${uploads ? ' https://api.cloudinary.com' : ''}${isDev ? ' ws: wss:' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    // Stripe Checkout: po odoslaní rezervácie presmerujeme na platobnú stránku brány
    "form-action 'self' https://checkout.stripe.com",
    "frame-ancestors 'none'",
    // jediné vložené okno: mapa Google, a to až po kliknutí návštevníka (components/LocationMap.tsx)
    // Google pre EÚ najprv presmeruje na consent.google.com – bez neho by mapa ostala prázdna
    "frame-src https://maps.google.com https://www.google.com https://consent.google.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self' blob:",
  ];
  if (!isDev) directives.push('upgrade-insecure-requests');
  return directives.join('; ');
}
