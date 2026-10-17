import 'server-only';
import { sign, unsign } from './crypto';

// Honeypot: skryté pole „website“, ktoré človek nevyplní, ale jednoduchý bot áno.
// Časová pasca: odoslanie do 1 sekundy od načítania formulára sa berie ako bot.

export const HONEYPOT_FIELD = 'website';
export const STAMP_FIELD = 'form_ts';

export function createFormStamp(): string {
  return sign('form', String(Date.now()));
}

export function checkFormGuard(form: FormData): { ok: true } | { ok: false; reason: string } {
  const honey = form.get(HONEYPOT_FIELD);
  if (typeof honey === 'string' && honey.trim() !== '') return { ok: false, reason: 'honeypot' };
  const stamp = form.get(STAMP_FIELD);
  if (typeof stamp !== 'string') return { ok: false, reason: 'no-stamp' };
  const data = unsign('form', stamp);
  if (!data) return { ok: false, reason: 'bad-stamp' };
  const elapsed = Date.now() - Number(data);
  if (!Number.isFinite(elapsed) || elapsed < 1000) return { ok: false, reason: 'too-fast' };
  if (elapsed > 2 * 60 * 60 * 1000) return { ok: false, reason: 'expired' };
  return { ok: true };
}
