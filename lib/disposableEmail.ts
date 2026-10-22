import 'server-only';
import { promises as dns } from 'node:dns';
import { isDisposableDomain, addDisposable, domainAndParents } from './disposable/check';

// Blokovanie dočasných e-mailov pri registrácii – štyri vrstvy:
// 1. vstavaný zoznam ~100 000 domén dočasných služieb (4 komunitné zoznamy, súčasť webu – funguje aj bez internetu),
//    doplnený o najnovší verejný zoznam obnovovaný každých 12 hodín a vlastný zoznam DISPOSABLE_EXTRA,
// 2. kontroluje sa doména aj všetky nadradené domény (abc.mailinator.com),
// 3. poštový server domény (MX) sa porovná so zoznamom a so známymi servermi dočasných služieb
//    (zachytí aj úplne nové domény, ktoré ešte nie sú v žiadnom zozname),
// 4. doména musí naozaj prijímať poštu (inak ide o preklep alebo vymyslenú adresu).

const LIST_URL = 'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf';
const REFRESH_MS = 12 * 60 * 60 * 1000;

// Vlastný zoznam: premenná DISPOSABLE_EXTRA="a.sk,b.com" vo Verceli.
const EXTRA = (process.env.DISPOSABLE_EXTRA ?? '').split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);

// Poštové servery, ktoré používajú dočasné služby aj pre nové domény.
const DISPOSABLE_MX = ['mail.tm', 'mail.gw', 'mailinator.com', 'yopmail.com', 'guerrillamail.com', 'tempmail', 'temp-mail', 'emailfake', 'mailnesia', 'dropmail', 'mailpoof', 'tempmailo', 'mohmal', 'maildrop', 'harakirimail', 'inboxkitten'];

let refreshedAt = 0;

async function refresh(): Promise<void> {
  if (Date.now() - refreshedAt < REFRESH_MS) return;
  refreshedAt = Date.now();
  addDisposable(EXTRA);
  try {
    const res = await fetch(LIST_URL, { signal: AbortSignal.timeout(4000), cache: 'no-store' });
    if (res.ok) addDisposable((await res.text()).split('\n'));
  } catch {
    // zoznam sa nepodarilo stiahnuť – stačí vstavaný zoznam
  }
}

export type EmailCheck = { ok: true } | { ok: false; message: string; reason: string };
const BLOCKED = 'Dočasné e-mailové schránky nie sú povolené. Použi svoj bežný e-mail.';

export async function checkEmailDomain(email: string): Promise<EmailCheck> {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return { ok: false, message: 'Zadaj platný e-mail.', reason: 'no-domain' };

  await refresh();
  if (isDisposableDomain(domain)) return { ok: false, message: BLOCKED, reason: 'disposable-list' };

  let mx: { exchange: string }[] = [];
  try {
    mx = await dns.resolveMx(domain);
  } catch {
    mx = [];
  }
  if (mx.length === 0) {
    return { ok: false, message: 'Na tento e-mail sa nedá doručovať. Skontroluj, či je napísaný správne.', reason: 'no-mx' };
  }
  const hosts = mx.map((m) => m.exchange.toLowerCase().replace(/\.$/, ''));
  if (hosts.some((h) => DISPOSABLE_MX.some((bad) => h.includes(bad)) || domainAndParents(h).some((d) => isDisposableDomain(d)))) {
    return { ok: false, message: BLOCKED, reason: 'disposable-mx' };
  }
  return { ok: true };
}
