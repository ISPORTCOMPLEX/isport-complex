// Bezpečnostné testy jadra (bez databázy): presmerovania, vstupy, 2FA, šifrovanie, podpisy, formuláre, zber analytiky.
// Spustenie:  npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeRedirect } from '../lib/safeRedirect.ts';
import { isEmail, isName, isPhone, normalizeEmail } from '../lib/validate.ts';
import { verifyTotp, generateSecret, normalizeBackupCode, generateBackupCodes } from '../lib/totp.ts';
import { encrypt, decrypt, sign, unsign, safeEqual, keyedHash, sha256 } from '../lib/crypto.ts';
import { checkFormGuard, createFormStamp, HONEYPOT_FIELD, STAMP_FIELD } from '../lib/formGuard.ts';
import { isBot, device } from '../lib/analytics/ua.ts';
import { passwordProblem } from '../lib/password.ts';
import { buildCsp, securityHeaders } from '../lib/securityHeaders.ts';
import { isCrossSite } from '../lib/sameSite.ts';
import { signParams, imageUrl } from '../lib/cloudinary.ts';

test('open redirect: povolené len cesty v rámci webu', () => {
  for (const bad of ['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', '/\r\nSet-Cookie:x', '\\\\evil.com', '/\tevil', '', 'evil', 'http:/evil.com'])
    assert.equal(safeRedirect(bad), '/ucet', `prešlo: ${JSON.stringify(bad)}`);
  assert.equal(safeRedirect('/rezervacia?datum=2026-10-20#x'), '/rezervacia?datum=2026-10-20#x');
  assert.equal(safeRedirect('/a/../admin'), '/admin');
  assert.equal(safeRedirect(undefined), '/ucet');
  assert.ok(!/[\r\n]/.test(safeRedirect('/%0d%0aSet-Cookie:x')), 'zakódované CR/LF ostanú zakódované');
  assert.equal(safeRedirect('/' + 'a'.repeat(600)), '/ucet');
});

test('validácia vstupov', () => {
  assert.ok(isEmail('jan@klub.sk'));
  for (const e of ['jan', 'jan@', '@x.sk', 'a b@x.sk', 'x@y.z', `${'a'.repeat(250)}@x.sk`]) assert.ok(!isEmail(e), e);
  assert.equal(normalizeEmail('  Jan@Klub.SK '), 'jan@klub.sk');
  assert.ok(isName('Ľubomír'));
  assert.ok(!isName('<script>'));
  assert.ok(!isName('Robert"); DROP TABLE'));
  assert.ok(isPhone('+421901234567'));
  assert.ok(!isPhone('+421 90; rm'));
});

test('heslo: pravidlá a limit 72 bajtov pre bcrypt', () => {
  assert.ok(passwordProblem('kratke'));
  assert.ok(passwordProblem('vsetkomale1'));
  assert.equal(passwordProblem('Silne-Heslo-2026'), null);
  assert.ok(passwordProblem('Aa1' + 'ž'.repeat(40)), 'viac ako 72 bajtov musí byť odmietnuté');
});

test('TOTP podľa RFC 6238 a ochrana proti opakovanému použitiu', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'; // "12345678901234567890"
  const realNow = Date.now;
  try {
    Date.now = () => 59_000; // RFC 6238: T=59 s → 94287082 → posledných 6 číslic 287082
    assert.equal(verifyTotp(secret, '287082', null), 1);
    assert.equal(verifyTotp(secret, '287082', 1), null, 'ten istý krok sa nesmie použiť znova');
    assert.equal(verifyTotp(secret, '000000', null), null);
    assert.equal(verifyTotp(secret, '28708', null), null);
  } finally {
    Date.now = realNow;
  }
  assert.match(generateSecret(), /^[A-Z2-7]{32}$/);
});

test('záložné kódy 2FA: odtlačok so serverovým kľúčom, nie holý SHA-256', () => {
  const { codes, hashes } = generateBackupCodes();
  assert.equal(codes.length, 8);
  assert.equal(new Set(codes).size, 8);
  for (const [i, c] of codes.entries()) {
    assert.match(c, /^[0-9A-F]{5}-[0-9A-F]{5}$/);
    assert.equal(hashes[i], keyedHash(normalizeBackupCode(c)));
    assert.notEqual(hashes[i], sha256(c));
  }
  assert.equal(normalizeBackupCode(' abcde fghij '), 'ABCDE-FGHIJ');
});

test('AES-256-GCM: šifrovanie, náhodné IV a odhalenie úpravy', () => {
  const a = encrypt('tajomstvo-2fa');
  const b = encrypt('tajomstvo-2fa');
  assert.notEqual(a, b);
  assert.equal(decrypt(a), 'tajomstvo-2fa');
  const buf = Buffer.from(a, 'base64');
  buf[buf.length - 1] ^= 1;
  assert.throws(() => decrypt(buf.toString('base64')));
});

test('podpisy HMAC: falošný podpis neprejde', () => {
  const s = sign('form', 'data');
  assert.equal(unsign('form', s), 'data');
  assert.equal(unsign('form', s.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A'))), null);
  assert.equal(unsign('captcha', s), null, 'kľúče pre rôzne účely sa nesmú zameniť');
  assert.ok(safeEqual('abc', 'abc'));
  assert.ok(!safeEqual('abc', 'abd'));
  assert.ok(!safeEqual('abc', 'abcd'));
});

test('ochrana formulárov pred botmi', () => {
  const f = (o: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(o)) fd.set(k, v);
    return fd;
  };
  assert.deepEqual(checkFormGuard(f({ [HONEYPOT_FIELD]: 'http://spam', [STAMP_FIELD]: createFormStamp() })), { ok: false, reason: 'honeypot' });
  assert.deepEqual(checkFormGuard(f({ [STAMP_FIELD]: createFormStamp() })), { ok: false, reason: 'too-fast' });
  assert.deepEqual(checkFormGuard(f({ [STAMP_FIELD]: 'x.y' })), { ok: false, reason: 'bad-stamp' });
  assert.deepEqual(checkFormGuard(f({})), { ok: false, reason: 'no-stamp' });
  const old = sign('form', String(Date.now() - 5000));
  assert.deepEqual(checkFormGuard(f({ [STAMP_FIELD]: old })), { ok: true });
});

test('bezpečnostné hlavičky a CSP', () => {
  const csp = buildCsp('abc', false);
  for (const d of ["default-src 'self'", "script-src 'self' 'nonce-abc' 'strict-dynamic'", "object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'"]) assert.ok(csp.includes(d), d);
  assert.ok(!csp.includes('unsafe-eval'), 'produkcia bez unsafe-eval');
  const keys = Object.fromEntries(securityHeaders.map((h) => [h.key, h.value]));
  assert.equal(keys['X-Content-Type-Options'], 'nosniff');
  assert.equal(keys['X-Frame-Options'], 'DENY');
  assert.match(keys['Strict-Transport-Security'], /max-age=\d{8}/);
});

test('GET sťahovania odmietnu požiadavku z cudzieho webu', () => {
  assert.ok(isCrossSite(new Request('https://x/', { headers: { 'sec-fetch-site': 'cross-site' } })));
  assert.ok(!isCrossSite(new Request('https://x/', { headers: { 'sec-fetch-site': 'same-origin' } })));
});

test('analytika: roboty sa nemerajú', () => {
  assert.ok(isBot('Googlebot/2.1'));
  assert.ok(isBot('curl/8.0'));
  assert.ok(isBot(''));
  assert.ok(!isBot('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'));
  assert.equal(device('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile'), 'mobile');
});

test('Cloudinary: podpis podľa dokumentácie a bezpečná adresa', () => {
  // príklad z dokumentácie Cloudinary (Authentication signatures)
  assert.equal(
    signParams({ eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop', public_id: 'sample_image', timestamp: 1315060510 }, 'abcd'),
    'bfd09f95f331f558cbd1320e67aa8d488770583e',
  );
  const u = imageUrl('demo', 'isport/bufet/a b', 3, 800, '16:10');
  assert.equal(u, 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_fill,g_auto,ar_16:10,w_800/v3/isport/bufet/a%20b');
});

test('CSP povoľuje len Cloudinary navyše', () => {
  const csp = buildCsp('n', false);
  assert.ok(csp.includes("img-src 'self' data: blob: https://res.cloudinary.com"));
  assert.ok(csp.includes("connect-src 'self' https://api.cloudinary.com"));
});
