// Čistá kontrola domény voči zoznamu dočasných e-mailov (bez siete) – používa ju registrácia aj testy.
import { brotliDecompressSync } from 'node:zlib';
import { DISPOSABLE_PACKED } from './data';
import { ALLOW } from './allow.mjs';

const allow = new Set<string>(ALLOW);
let set: Set<string> | null = null;

// Zoznam sa rozbalí až pri prvej kontrole (raz za život servera, ~30 ms).
function list(): Set<string> {
  if (!set) set = new Set(brotliDecompressSync(Buffer.from(DISPOSABLE_PACKED, 'base64')).toString('utf8').split('\n'));
  return set;
}

export function addDisposable(domains: string[]): void {
  const s = list();
  for (const raw of domains) {
    const d = raw.trim().toLowerCase();
    if (d && !d.startsWith('#') && !allow.has(d) && /^[a-z0-9.-]+\.[a-z0-9-]{2,}$/.test(d)) s.add(d);
  }
}

export function domainAndParents(domain: string): string[] {
  const parts = domain.toLowerCase().replace(/\.$/, '').split('.');
  const out: string[] = [];
  for (let i = 0; i < parts.length - 1; i++) out.push(parts.slice(i).join('.'));
  return out;
}

export function isDisposableDomain(domain: string): boolean {
  const all = domainAndParents(domain);
  if (all.length && allow.has(all[0])) return false;
  const s = list();
  return all.some((d) => s.has(d));
}

export function disposableCount(): number {
  return list().size;
}
