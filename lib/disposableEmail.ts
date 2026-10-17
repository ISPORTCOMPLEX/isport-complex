import 'server-only';
import { promises as dns } from 'node:dns';

// Blokovanie dočasných e-mailov v troch vrstvách:
// 1. doména aj jej nadradené domény sa porovnajú so zoznamom dočasných služieb
//    (verejný komunitný zoznam obnovovaný každých 12 hodín + vstavaná záloha + vlastný zoznam),
// 2. poštový server domény (MX) sa porovná so známymi servermi dočasných služieb,
// 3. doména musí naozaj prijímať poštu (inak ide o preklep alebo vymyslenú adresu).

const LIST_URL = 'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf';
const REFRESH_MS = 12 * 60 * 60 * 1000;

const BUILTIN = [
  'mailinator.com', '10minutemail.com', 'guerrillamail.com', 'guerrillamail.net', 'sharklasers.com', 'yopmail.com',
  'temp-mail.org', 'tempmail.com', 'trashmail.com', 'getnada.com', 'dispostable.com', 'maildrop.cc', 'throwawaymail.com',
  'fakeinbox.com', 'mohmal.com', 'emailondeck.com', 'mail.tm', 'mail.gw', 'tempmail.plus', 'mintemail.com', 'spamgourmet.com',
  'mailnesia.com', 'mytemp.email', 'tempr.email', 'discard.email', 'burnermail.io', 'inboxkitten.com', 'emailfake.com',
];

// Vlastný zoznam (neskôr z administrácie). Dá sa doplniť aj premennou DISPOSABLE_EXTRA="a.sk,b.com".
const EXTRA = (process.env.DISPOSABLE_EXTRA ?? '').split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);

// Poštové servery, ktoré používajú dočasné služby aj pre nové domény.
const DISPOSABLE_MX = ['mail.tm', 'mail.gw', 'mailinator.com', 'yopmail.com', 'guerrillamail.com', 'tempmail', 'temp-mail', 'emailfake', 'mailnesia', 'dropmail'];

let cache: { set: Set<string>; at: number } | null = null;

async function loadList(): Promise<Set<string>> {
  if (cache && Date.now() - cache.at < REFRESH_MS) return cache.set;
  const set = new Set<string>([...BUILTIN, ...EXTRA]);
  try {
    const res = await fetch(LIST_URL, { signal: AbortSignal.timeout(4000), cache: 'no-store' });
    if (res.ok) {
      const text = await res.text();
      for (const line of text.split('\n')) {
        const d = line.trim().toLowerCase();
        if (d && !d.startsWith('#')) set.add(d);
      }
    }
  } catch {
    // zoznam sa nepodarilo stiahnuť – ostáva vstavaná záloha
  }
  cache = { set, at: Date.now() };
  return set;
}

function domainAndParents(domain: string): string[] {
  const parts = domain.split('.');
  const out: string[] = [];
  for (let i = 0; i < parts.length - 1; i++) out.push(parts.slice(i).join('.'));
  return out;
}

export type EmailCheck = { ok: true } | { ok: false; message: string; reason: string };

export async function checkEmailDomain(email: string): Promise<EmailCheck> {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return { ok: false, message: 'Zadaj platný e-mail.', reason: 'no-domain' };

  const list = await loadList();
  if (domainAndParents(domain).some((d) => list.has(d))) {
    return { ok: false, message: 'Dočasné e-mailové schránky nie sú povolené. Použi svoj bežný e-mail.', reason: 'disposable-list' };
  }

  let mx: { exchange: string }[] = [];
  try {
    mx = await dns.resolveMx(domain);
  } catch {
    mx = [];
  }
  if (mx.length === 0) {
    return { ok: false, message: 'Na tento e-mail sa nedá doručovať. Skontroluj, či je napísaný správne.', reason: 'no-mx' };
  }
  const hosts = mx.map((m) => m.exchange.toLowerCase());
  if (hosts.some((h) => DISPOSABLE_MX.some((bad) => h.includes(bad)) || domainAndParents(h).some((d) => list.has(d)))) {
    return { ok: false, message: 'Dočasné e-mailové schránky nie sú povolené. Použi svoj bežný e-mail.', reason: 'disposable-mx' };
  }
  return { ok: true };
}
