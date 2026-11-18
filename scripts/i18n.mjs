// Kontrola a údržba prekladov.
//
//   node scripts/i18n.mjs          – vypíše chýbajúce preklady a obnoví lib/i18n/clientKeys.ts
//   node scripts/i18n.mjs --check  – len kontrola (pre test): chyba, ak niečo chýba alebo clientKeys nesedí
//   node scripts/i18n.mjs --missing <jazyk> – vypíše chýbajúce kľúče ako JSON (na doplnenie prekladu)
//
// Kľúčom prekladu je slovenský text v kóde: t('…'), tr('…'), t.n(n, '…|…|…') a msg('…').

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIRS = ['app', 'components', 'lib'];
const LOCALES = ['en', 'cs', 'de', 'hu'];

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(f) && !p.includes(`${path.sep}i18n${path.sep}`)) out.push(p);
  }
  return out;
}

// Reťazec v jednoduchých úvodzovkách s escapovaním (tak ich píše kód).
const STR = String.raw`'((?:[^'\\]|\\.)*)'`;
const RE = new RegExp(String.raw`(?<![\w.$])(?:tr?|msg)\(\s*${STR}|(?<![\w$])tr?\.n\(\s*[^,]+,\s*${STR}`, 'g');
const unescape = (s) => s.replace(/\\n/g, '\n').replace(/\\(.)/g, '$1');

export function collect() {
  const files = DIRS.flatMap((d) => walk(path.join(ROOT, d)));
  const byFile = new Map();
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const keys = new Set();
    for (const m of src.matchAll(RE)) keys.add(unescape(m[1] ?? m[2]));
    byFile.set(f, { src, keys });
  }
  // klientske súbory: 'use client' + všetko, čo importujú (rekurzívne)
  const isClient = (src) => /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*['"]use client['"]/.test(src);
  const resolve = (from, spec) => {
    let base;
    if (spec.startsWith('@/')) base = path.join(ROOT, spec.slice(2));
    else if (spec.startsWith('.')) base = path.join(path.dirname(from), spec);
    else return null;
    for (const e of ['.tsx', '.ts', '/index.ts', '/index.tsx']) if (byFile.has(base + e)) return base + e;
    return null;
  };
  const queue = [...byFile].filter(([, v]) => isClient(v.src)).map(([f]) => f);
  const client = new Set(queue);
  while (queue.length) {
    const f = queue.pop();
    for (const m of byFile.get(f).src.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
      const r = resolve(f, m[1]);
      // serverové akcie ('use server') bežia na serveri – ich texty klient nepotrebuje
      if (r && !client.has(r) && !/^\s*['"]use server['"]/.test(byFile.get(r).src)) {
        client.add(r);
        queue.push(r);
      }
    }
  }
  const all = new Set();
  const clientKeys = new Set();
  for (const [f, v] of byFile) {
    for (const k of v.keys) {
      all.add(k);
      if (client.has(f)) clientKeys.add(k);
    }
  }
  return { all: [...all].sort(), clientKeys: [...clientKeys].sort() };
}

function loadDict(l) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'lib/i18n/messages', `${l}.json`), 'utf8'));
}

function clientKeysSource(keys) {
  return `// Vygenerované: node scripts/i18n.mjs – texty, ktoré používajú klientske komponenty.\n// Len tieto preklady sa posielajú do prehliadača (zvyšok ostáva na serveri).\nexport const CLIENT_KEYS: readonly string[] = ${JSON.stringify(keys, null, 2)};\n`;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const { all, clientKeys } = collect();
  const arg = process.argv[2];
  if (arg === '--missing') {
    const l = process.argv[3];
    const d = loadDict(l);
    const miss = all.filter((k) => d[k] === undefined);
    fs.writeFileSync(1, JSON.stringify(miss, null, 1) + '\n');
  } else {
  let bad = 0;
  for (const l of LOCALES) {
    const d = loadDict(l);
    const miss = all.filter((k) => d[k] === undefined);
    const plural = all.filter((k) => k.includes('|') && d[k] !== undefined && d[k].split('|').length !== (l === 'cs' ? 3 : 2));
    const vars = all.filter((k) => d[k] !== undefined && [...k.matchAll(/\{(\w+)\}/g)].some((m) => !d[k].includes(`{${m[1]}}`)));
    if (miss.length || plural.length || vars.length) bad++;
    console.log(`${l}: ${all.length - miss.length}/${all.length}${miss.length ? ` – chýba ${miss.length}` : ''}${plural.length ? ` – zlý počet tvarov: ${plural.length}` : ''}${vars.length ? ` – chýbajú {premenné}: ${vars.slice(0, 3).join(' | ')}` : ''}`);
  }
  const file = path.join(ROOT, 'lib/i18n/clientKeys.ts');
  const want = clientKeysSource(clientKeys);
  if (arg === '--check') {
    if (fs.readFileSync(file, 'utf8') !== want) {
      console.log('lib/i18n/clientKeys.ts nie je aktuálny – spusti: node scripts/i18n.mjs');
      bad++;
    }
    process.exit(bad ? 1 : 0);
  }
  fs.writeFileSync(file, want);
  console.log(`klientske texty: ${clientKeys.length} z ${all.length}`);
  }
}
