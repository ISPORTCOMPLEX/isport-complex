import 'server-only';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getSecret } from './secrets';

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

// Kryptograficky náhodný token do URL (bez Math.random).
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// Podpísaná hodnota: "dáta.podpis" (HMAC-SHA256).
export function sign(purpose: 'captcha' | 'form', data: string): string {
  const mac = createHmac('sha256', getSecret(purpose)).update(data).digest('base64url');
  return `${data}.${mac}`;
}

export function unsign(purpose: 'captcha' | 'form', signed: string): string | null {
  const i = signed.lastIndexOf('.');
  if (i <= 0) return null;
  const data = signed.slice(0, i);
  const expected = sign(purpose, data);
  return safeEqual(expected, signed) ? data : null;
}

// HMAC-SHA256 s tajným kľúčom – odtlačok, ktorý sa bez kľúča nedá hrubou silou dopočítať (záložné kódy 2FA).
export function keyedHash(data: string): string {
  return createHmac('sha256', getSecret('two-factor')).update(`backup:${data}`).digest('hex');
}

// AES-256-GCM pre citlivé údaje v databáze (napr. tajomstvo 2FA).
function aesKey(): Buffer {
  return createHash('sha256').update(getSecret('two-factor')).digest();
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', aesKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decrypt(payload: string): string {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', aesKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
