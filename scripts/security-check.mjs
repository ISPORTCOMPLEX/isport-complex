// Dynamická bezpečnostná kontrola nasadeného webu (DAST-lite). Iba čítanie, nič nemení a nezaťažuje server.
// Spustenie (PowerShell, v priečinku projektu):  node scripts/security-check.mjs https://isport-complex.vercel.app
const base = (process.argv[2] ?? '').replace(/\/$/, '');
if (!/^https:\/\//.test(base)) {
  console.error('Zadaj adresu webu: node scripts/security-check.mjs https://isport-complex.vercel.app');
  process.exit(2);
}
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });
const get = (p, init = {}) => fetch(base + p, { redirect: 'manual', ...init });

try {
  // 1) HTTPS a presmerovanie z HTTP
  const http = await fetch(base.replace('https://', 'http://') + '/', { redirect: 'manual' }).catch(() => null);
  check('HTTP sa presmeruje na HTTPS', !!http && [301, 302, 307, 308].includes(http.status) && (http.headers.get('location') ?? '').startsWith('https://'), http ? `${http.status} → ${http.headers.get('location')}` : 'bez odpovede');

  // 2) Hlavičky na úvodnej stránke
  const home = await get('/');
  const h = (k) => home.headers.get(k) ?? '';
  check('Úvod odpovedá 200', home.status === 200, String(home.status));
  const csp = h('content-security-policy');
  check('CSP: nonce + strict-dynamic', /script-src[^;]*'nonce-[^']+'[^;]*'strict-dynamic'/.test(csp), csp.slice(0, 120));
  check('CSP: bez unsafe-eval', !csp.includes('unsafe-eval'));
  const styleSrc = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('style-src ')) ?? '';
  check('CSP: style-src bez unsafe-inline', styleSrc !== '' && !styleSrc.includes('unsafe-inline'), styleSrc);
  check("CSP: frame-ancestors 'none'", csp.includes("frame-ancestors 'none'"));
  check("CSP: object-src 'none'", csp.includes("object-src 'none'"));
  check('HSTS aspoň 1 rok', /max-age=(\d+)/.test(h('strict-transport-security')) && Number(h('strict-transport-security').match(/max-age=(\d+)/)[1]) >= 31536000, h('strict-transport-security'));
  check('X-Content-Type-Options: nosniff', h('x-content-type-options') === 'nosniff');
  check('X-Frame-Options: DENY', h('x-frame-options') === 'DENY');
  check('Referrer-Policy', h('referrer-policy') === 'strict-origin-when-cross-origin', h('referrer-policy'));
  check('Permissions-Policy', h('permissions-policy').includes('microphone=()'), h('permissions-policy'));
  check('Bez X-Powered-By', !home.headers.has('x-powered-by'));
  check('Dynamická stránka sa necacheuje verejne', !/public/.test(h('cache-control')), h('cache-control'));
  check('Verejná stránka nenastavuje cookies', !home.headers.get('set-cookie'), home.headers.get('set-cookie') ?? '');

  // 3) Administrácia a API bez prihlásenia
  const admin = await get('/admin');
  check('/admin bez prihlásenia → 404 (administrácia je skrytá)', admin.status === 404, String(admin.status));
  const adminSub = await get('/admin/rezervacie');
  check('/admin/rezervacie bez prihlásenia → 404', adminSub.status === 404, String(adminSub.status));
  const adminEx = await get('/api/admin/export');
  check('/api/admin/export bez prihlásenia → 404', adminEx.status === 404, String(adminEx.status));
  const cross = await get('/api/admin/export', { headers: { 'sec-fetch-site': 'cross-site' } });
  check('/api/admin/export z cudzieho webu → 403', cross.status === 403, String(cross.status));
  const ucet = await get('/api/ucet/export');
  check('/api/ucet/export bez prihlásenia → 401', ucet.status === 401, String(ucet.status));
  const cron = await get('/api/cron/denne');
  check('/api/cron/denne bez tajného kľúča → 401', cron.status === 401, String(cron.status));
  const cronBad = await get('/api/cron/denne', { headers: { authorization: 'Bearer zle-heslo-zle-heslo' } });
  check('/api/cron/denne so zlým kľúčom → 401', cronBad.status === 401, String(cronBad.status));
  const ics = await get('/api/rezervacia/ISP-AAAAAA/ics');
  check('Kalendár rezervácie bez prihlásenia → 401', ics.status === 401, String(ics.status));
  const det = await get('/rezervacia/ISP-AAAAAA');
  check('Detail rezervácie bez prihlásenia → presmerovanie', [302, 303, 307, 308].includes(det.status), String(det.status));

  // 4) Chyby neprezrádzajú technické detaily
  const nf = await get('/neexistuje-' + Date.now());
  const nfText = await nf.text();
  check('Neexistujúca stránka → 404', nf.status === 404, String(nf.status));
  check('404 bez výpisu chyby (stack trace)', !/at \w+ \(|node_modules|Error:/.test(nfText));

  // 5) Analytika neprijme cudzí pôvod
  const a = await fetch(base + '/api/a', { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130 Safari/537.36' }, body: '{"t":"view","p":"/"}' });
  check('Analytika odmietne cudzí pôvod (204 bez zápisu)', a.status === 204, String(a.status));

  // 6) security.txt a robots
  const st = await get('/.well-known/security.txt');
  check('/.well-known/security.txt existuje', st.status === 200, String(st.status));
  const robots = await (await get('/robots.txt')).text();
  check('robots.txt neprezrádza neverejné cesty', !/admin|ucet|api|prihlasenie/i.test(robots), robots.slice(0, 120));

  // 7) Zdrojové mapy nie sú verejné
  const html = await (await get('/')).text();
  const js = html.match(/\/_next\/static\/[^"']+\.js/)?.[0];
  if (js) {
    const map = await get(js + '.map');
    check('Zdrojové mapy (.map) nie sú verejné', map.status === 404 || map.status === 403, `${js}.map → ${map.status}`);
  }
} catch (err) {
  console.error('Kontrolu sa nepodarilo dokončiť:', err.message);
  process.exit(2);
}

let fail = 0;
for (const r of results) {
  if (!r.ok) fail++;
  console.log(`${r.ok ? 'OK  ' : 'CHYBA'}  ${r.name}${r.detail ? `   (${r.detail})` : ''}`);
}
console.log(`\n${results.length - fail} z ${results.length} kontrol prešlo.`);
process.exit(fail ? 1 : 0);
