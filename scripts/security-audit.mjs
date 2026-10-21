// Statická bezpečnostná kontrola projektu (SAST-lite + kontrola tajomstiev). Bez závislostí.
// Spustenie:  npm run audit:static   (v priečinku projektu)
// Výsledok: zoznam nálezov; pri kritickom náleze skončí s kódom 1 (vhodné do CI).
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SKIP = new Set(['node_modules', '.next', '.git', '.vercel', 'out']);
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = path.join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else files.push(p);
  }
})(root);
const rel = (p) => path.relative(root, p).split(path.sep).join('/');
const code = files.filter((f) => /\.(ts|tsx|mjs|js)$/.test(f) && !rel(f).startsWith('tests/'));
const read = (f) => readFileSync(f, 'utf8');

const findings = [];
const add = (level, file, msg) => findings.push({ level, file, msg });

// 1) Nebezpečné API
const DANGER = [
  [/dangerouslySetInnerHTML/, 'dangerouslySetInnerHTML (riziko XSS)'],
  [/\$queryRawUnsafe|\$executeRawUnsafe/, 'Prisma *Unsafe (riziko SQL injection)'],
  [/\beval\s*\(|new Function\s*\(/, 'eval / new Function'],
  [/child_process/, 'child_process v aplikácii'],
  [/\.innerHTML\s*=/, 'priradenie innerHTML'],
];
for (const f of code) {
  if (rel(f).startsWith('scripts/')) continue; // vývojárske skripty bežia len lokálne
  // povolené vzory: HTML vždy prejde cez sanitizeInline (články) a JSON-LD cez JSON.stringify s escapovaním '<'
  const s = read(f).replace(/dangerouslySetInnerHTML=\{\{ __html: (sanitizeInline\(|JSON\.stringify\([^)]*\)\.replace\(\/<\/g)/g, 'SAFE_HTML');
  for (const [re, msg] of DANGER) if (re.test(s)) add('VYSOKÉ', rel(f), msg);
}

// 2) Každá serverová akcia musí overiť používateľa (okrem verejných formulárov)
const PUBLIC_ACTIONS = new Set(['registerAction', 'resendVerificationAction', 'loginAction', 'twoFactorLoginAction', 'forgotPasswordAction', 'resetPasswordAction', 'logoutAction', 'createInquiryAction']);
const AUTH = /requireStaff\(|requireUser\(|getSessionUser\(|await me\(\)|await staff\(|await target\(|getPending2fa\(/;
for (const f of code.filter((f) => /^'use server'/m.test(read(f)))) {
  const s = read(f);
  const parts = s.split(/\nexport async function /).slice(1);
  for (const part of parts) {
    const name = part.match(/^(\w+)/)?.[1];
    const body = part.split(/\n}\n/)[0];
    if (!PUBLIC_ACTIONS.has(name) && !AUTH.test(body)) add('KRITICKÉ', rel(f), `serverová akcia ${name} neoveruje prihláseného používateľa`);
  }
}

// 3) Každá stránka administrácie volá requireStaff
for (const f of code.filter((f) => /^app\/admin\/.*page\.tsx$/.test(rel(f)))) {
  if (!/requireStaff\('/.test(read(f))) add('KRITICKÉ', rel(f), 'stránka administrácie bez requireStaff');
}

// 3b) Žiadne inline štýly – CSP ich blokuje (style-src-attr 'none'); výnimka je komponent Dyn
for (const f of code.filter((f) => /^(app|components)\/.*\.tsx$/.test(rel(f)) && rel(f) !== 'components/Dyn.tsx')) {
  if (/\sstyle=\{/.test(read(f))) add('STREDNÉ', rel(f), 'inline style={…} – CSP ho zablokuje, použi triedu alebo <Dyn css={…}>');
}

// 4) API: overenie alebo výslovne verejný endpoint
const PUBLIC_API = new Set(['app/api/a/route.ts', 'app/api/security-txt/route.ts', 'app/api/robots/route.ts', 'app/api/humans/route.ts', 'app/api/rss/route.ts']);
for (const f of code.filter((f) => /^app\/api\/.*route\.ts$/.test(rel(f)))) {
  const s = read(f);
  if (PUBLIC_API.has(rel(f))) continue;
  // webhook platobnej brány sa overuje podpisom (parseWebhook → verifyStripeSignature)
  if (!/getSessionUser\(|CRON_SECRET|parseWebhook\(/.test(s)) add('KRITICKÉ', rel(f), 'API bez overenia');
}

// 5) Tajomstvá v súboroch projektu
const SECRET = [
  [/postgres(ql)?:\/\/[^\s"'`]+:[^\s"'`@]{6,}@/, 'pripojenie k databáze s heslom'],
  [/\bre_[A-Za-z0-9]{20,}/, 'Resend API kľúč'],
  [/AKIA[0-9A-Z]{16}/, 'AWS kľúč'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'súkromný kľúč'],
  [/\b(sk|rk)_live_[A-Za-z0-9]{10,}/, 'Stripe kľúč'],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}/, 'GitHub token'],
  [/\bnpg_[A-Za-z0-9]{10,}/, 'Neon heslo'],
];
for (const f of files) {
  const r = rel(f);
  if (/\.(png|jpg|ico|woff2?|ttf|otf|pdf|zip)$/.test(r) || r === 'scripts/security-audit.mjs') continue;
  if (/^\.env($|\.)/.test(path.basename(r)) && r !== '.env.example') continue; // lokálny .env sa do gitu nedáva (kontroluje bod 6)
  let s;
  try { s = read(f); } catch { continue; }
  for (const [re, msg] of SECRET) if (re.test(s)) add('KRITICKÉ', r, `možný únik tajomstva: ${msg}`);
}

// 6) .gitignore chráni .env
const gi = existsSync(path.join(root, '.gitignore')) ? read(path.join(root, '.gitignore')) : '';
if (!/^\.env$/m.test(gi)) add('KRITICKÉ', '.gitignore', '.env nie je v .gitignore');

// 7) Minimálne verzie s bezpečnostnými opravami
const pkg = JSON.parse(read(path.join(root, 'package.json')));
const min = { next: [16, 4, 1], react: [19, 2, 9], 'react-dom': [19, 2, 9] };
for (const [name, want] of Object.entries(min)) {
  const v = (pkg.dependencies?.[name] ?? '').replace(/^[^\d]*/, '').split('.').map(Number);
  const ok = v.length === 3 && (v[0] > want[0] || (v[0] === want[0] && (v[1] > want[1] || (v[1] === want[1] && v[2] >= want[2]))));
  if (!ok) add('VYSOKÉ', 'package.json', `${name} ${pkg.dependencies?.[name]} – minimum je ${want.join('.')} (bezpečnostné opravy)`);
}
if (!existsSync(path.join(root, 'package-lock.json'))) add('STREDNÉ', 'package-lock.json', 'chýba lock súbor – inštalácia nie je reprodukovateľná (spusti npm install a pridaj ho do gitu)');

const order = { KRITICKÉ: 0, VYSOKÉ: 1, STREDNÉ: 2, NÍZKE: 3 };
findings.sort((a, b) => order[a.level] - order[b.level]);
console.log(`Statická bezpečnostná kontrola: ${code.length} súborov kódu, ${files.length} súborov spolu`);
if (!findings.length) console.log('OK – žiadne nálezy.');
for (const x of findings) console.log(`[${x.level}] ${x.file}: ${x.msg}`);
process.exit(findings.some((x) => x.level === 'KRITICKÉ') ? 1 : 0);
