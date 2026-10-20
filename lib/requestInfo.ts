import 'server-only';
import { headers } from 'next/headers';

export async function getRequestInfo() {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  const ip = (forwarded ? forwarded.split(',')[0] : h.get('x-real-ip'))?.trim() || 'unknown';
  const userAgent = (h.get('user-agent') ?? '').slice(0, 300);
  return { ip, userAgent };
}

// Adresa webu pre odkazy v e-mailoch. Prednostne APP_URL, inak z požiadavky.
export async function getBaseUrl(): Promise<string> {
  const fixed = appUrl();
  if (fixed) return fixed;
  // Na produkcii nikdy nedôverujeme hlavičke Host (podvrhnuté odkazy v e-mailoch).
  if (process.env.NODE_ENV === 'production') {
    const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (vercel) return `https://${vercel}`;
    throw new Error('Chýba APP_URL.');
  }
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

// APP_URL môže byť zadané aj bez https:// – doplníme ho, aby z toho bola platná adresa.
export function appUrl(): string | null {
  const raw = process.env.APP_URL?.trim();
  if (!raw) return null;
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withProto).origin;
  } catch {
    return null;
  }
}
