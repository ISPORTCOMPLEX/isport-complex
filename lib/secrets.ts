import 'server-only';
import { createHmac } from 'node:crypto';

// Samostatný kľúč pre každý účel. Únik jedného tak neprelomí všetko naraz.
// Ak samostatná premenná chýba, kľúč sa odvodí z AUTH_SECRET cez HMAC s názvom účelu.

type Purpose = 'session' | 'two-factor' | 'captcha' | 'form' | 'unsubscribe' | 'ticket' | 'guest-link' | 'analytics';

const ENV_BY_PURPOSE: Record<Purpose, string> = {
  session: 'SESSION_SECRET',
  'two-factor': 'TWO_FACTOR_SECRET',
  captcha: 'CAPTCHA_SECRET',
  form: 'FORM_SECRET',
  unsubscribe: 'UNSUBSCRIBE_SECRET',
  ticket: 'TICKET_SECRET',
  'guest-link': 'GUEST_LINK_SECRET',
  analytics: 'ANALYTICS_SECRET',
};

function masterSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error('Chýba AUTH_SECRET (aspoň 32 znakov). Doplň ho do .env a do Vercelu.');
  }
  return s;
}

export function getSecret(purpose: Purpose): Buffer {
  const own = process.env[ENV_BY_PURPOSE[purpose]];
  if (own && own.length >= 32) return Buffer.from(own, 'utf8');
  return createHmac('sha256', masterSecret()).update(`isport:${purpose}`).digest();
}
