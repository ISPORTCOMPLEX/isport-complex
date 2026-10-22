// Aktualizácia zoznamu dočasných e-mailových domén (spusti raz za čas: npm run disposable:update).
// Spojí 4 verejné komunitné zoznamy, odstráni bežných poskytovateľov (gmail, azet, seznam…)
// a zapíše skomprimovaný zoznam do lib/disposable/data.ts. Ten je súčasťou webu – funguje aj bez internetu.
//
// Zdroje (licencie CC0 / MIT / BSD):
//  - github.com/disposable-email-domains/disposable-email-domains
//  - github.com/disposable/disposable-email-domains
//  - github.com/FGRibreau/mailchecker
//  - github.com/7c/fakefilter
//
// Bez internetu: node scripts/update-disposable.mjs --local <súbor> [<súbor> …]
import { writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { brotliCompressSync, constants } from 'node:zlib';
import { ALLOW } from '../lib/disposable/allow.mjs';

const SOURCES = [
  'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf',
  'https://raw.githubusercontent.com/disposable/disposable-email-domains/master/domains.txt',
  'https://raw.githubusercontent.com/FGRibreau/mailchecker/master/list.txt',
  'https://raw.githubusercontent.com/7c/fakefilter/main/txt/data.txt',
];

const args = process.argv.slice(2);
const local = args[0] === '--local' ? args.slice(1) : null;

const texts = [];
if (local) {
  for (const f of local) texts.push(await readFile(f, 'utf8'));
} else {
  for (const url of SOURCES) {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    texts.push(await res.text());
    console.log('stiahnuté', url);
  }
}

const allow = new Set(ALLOW);
const set = new Set();
for (const t of texts) {
  for (const line of t.split(/\r?\n/)) {
    const d = line.trim().toLowerCase();
    if (!d || d.startsWith('#')) continue;
    if (!/^[a-z0-9.-]+\.[a-z0-9-]{2,}$/.test(d) || d.length > 253) continue;
    if (allow.has(d)) continue;
    set.add(d);
  }
}
if (set.size < 5000) throw new Error(`Podozrivo málo domén (${set.size}) – zoznam sa neuložil.`);

const list = [...set].sort().join('\n');
const packed = brotliCompressSync(Buffer.from(list), { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_LGWIN]: 24 } }).toString('base64');
const stamp = new Date().toISOString().slice(0, 10);
writeFileSync(
  new URL('../lib/disposable/data.ts', import.meta.url),
  `// VYGENEROVANÉ skriptom scripts/update-disposable.mjs – neupravuj ručne.\n// ${set.size} domén dočasných e-mailov, stav k ${stamp}. Brotli + base64.\nexport const DISPOSABLE_COUNT = ${set.size};\nexport const DISPOSABLE_DATE = '${stamp}';\nexport const DISPOSABLE_PACKED =\n  '${packed}';\n`,
);
console.log(`Uložené: ${set.size} domén → lib/disposable/data.ts`);
