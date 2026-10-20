import 'server-only';
import bcrypt from 'bcryptjs';
import { randomToken } from './crypto';

// Heslá len ako bcrypt hash (cost 10), nikdy čistý text.
const COST = 10;

export const PASSWORD_RULES = 'Aspoň 8 znakov, malé a veľké písmeno a číslica.';

export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return 'Heslo musí mať aspoň 8 znakov.';
  if (Buffer.byteLength(pw, 'utf8') > 72) return 'Heslo je príliš dlhé (max. 72 bajtov).';
  if (!/[a-z]/.test(pw)) return 'Heslo musí obsahovať malé písmeno.';
  if (!/[A-Z]/.test(pw)) return 'Heslo musí obsahovať veľké písmeno.';
  if (!/[0-9]/.test(pw)) return 'Heslo musí obsahovať číslicu.';
  return null;
}

export function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, COST);
}

// Pri neexistujúcom účte porovnáme s náhodným hashom, aby odpoveď trvala rovnako dlho.
let dummyHash: Promise<string> | null = null;

export async function verifyPassword(pw: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) {
    dummyHash ??= bcrypt.hash(randomToken(16), COST);
    await bcrypt.compare(pw, await dummyHash);
    return false;
  }
  return bcrypt.compare(pw, hash);
}

export async function randomPasswordHash(): Promise<string> {
  return hashPassword(randomToken(32));
}

// Najčastejšie heslá (aj s úpravou na naše pravidlá) – zamietneme ich hneď.
const COMMON = new Set(
  [
    'password1', 'password123', 'heslo123', 'heslo1234', 'qwerty123', 'qwertz123', 'abc12345', 'abcd1234', 'admin123', 'welcome1',
    'iloveyou1', 'monkey123', 'dragon123', 'football1', 'baseball1', 'sunshine1', 'princess1', 'letmein1', 'master123', 'hockey123',
    'hokej123', 'kosice123', 'slovakia1', 'slovensko1', 'isport123', 'passw0rd', 'p4ssword', 'zaq12wsx', '1qaz2wsx', 'test1234',
  ].map((p) => p.toLowerCase()),
);

// Pred uložením nového hesla: pravidlá + bežné heslá + heslo podobné e-mailu/menu + uniknuté heslá (Have I Been Pwned).
// HIBP: posiela sa len prvých 5 znakov odtlačku SHA-1 (k-anonymita), heslo neopustí server. Pri výpadku služby sa kontrola preskočí.
export async function passwordProblemStrong(pw: string, ctx: { email?: string; names?: string[] } = {}): Promise<string | null> {
  const basic = passwordProblem(pw);
  if (basic) return basic;
  const lower = pw.toLowerCase();
  if (COMMON.has(lower)) return 'Toto heslo je príliš bežné. Zvoľ iné.';
  const local = ctx.email?.split('@')[0]?.toLowerCase();
  if (local && local.length >= 4 && lower.includes(local)) return 'Heslo nesmie obsahovať tvoj e-mail.';
  for (const n of ctx.names ?? []) {
    const name = n.trim().toLowerCase();
    if (name.length >= 4 && lower.includes(name)) return 'Heslo nesmie obsahovať tvoje meno.';
  }
  if (/(.)\1{4,}/.test(pw)) return 'Heslo nesmie obsahovať 5 rovnakých znakov za sebou.';
  try {
    const { createHash } = await import('node:crypto');
    const hash = createHash('sha1').update(pw).digest('hex').toUpperCase();
    const res = await fetch(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`, {
      headers: { 'Add-Padding': 'true', 'User-Agent': 'isport-complex' },
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    });
    if (res.ok) {
      const suffix = hash.slice(5);
      const text = await res.text();
      for (const line of text.split('\n')) {
        const [sfx, count] = line.trim().split(':');
        if (sfx === suffix && Number(count) > 0) return 'Toto heslo sa objavilo v uniknutých databázach hesiel. Zvoľ iné.';
      }
    }
  } catch {
    // služba nedostupná – pokračujeme bez tejto kontroly
  }
  return null;
}
