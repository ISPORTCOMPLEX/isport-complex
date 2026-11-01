import { NextResponse, type NextRequest } from 'next/server';
import { getSite } from '@/lib/siteSettings';

// Jeden odkaz pre QR kód v pätičke: iPhone → App Store, Android → Google Play, inak hlavná stránka.
export async function GET(req: NextRequest) {
  const { apps } = await getSite();
  const ua = req.headers.get('user-agent') ?? '';
  const target = /iphone|ipad|ipod/i.test(ua) && apps.ios ? apps.ios : /android/i.test(ua) && apps.android ? apps.android : apps.ios || apps.android || '/';
  return NextResponse.redirect(target.startsWith('/') ? new URL(target, req.url) : target, 302);
}
