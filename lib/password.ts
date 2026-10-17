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
