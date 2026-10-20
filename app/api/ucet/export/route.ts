import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { hitLimit } from '@/lib/rateLimit';
import { getRequestInfo } from '@/lib/requestInfo';
import { logSecurity } from '@/lib/securityLog';

// Export osobných údajov (GDPR čl. 15 a 20). Bez hesiel, tajomstiev 2FA a interných príznakov.
export async function GET() {
  const session = await getSessionUser();
  if (!session) return new Response('Neprihlásený', { status: 401 });

  const limit = await hitLimit(`export:${session.id}`, 5, 60 * 60);
  if (!limit.ok) return new Response('Príliš veľa požiadaviek, skús to neskôr.', { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } });

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      emailVerifiedAt: true,
      termsAcceptedAt: true,
      ageConfirmedAt: true,
      marketingOptIn: true,
      twoFactorEnabledAt: true,
      passwordChangedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const events = await prisma.securityEvent.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: { type: true, ok: true, reason: true, ip: true, userAgent: true, createdAt: true },
  });

  const reservations = await prisma.booking.findMany({
    where: { userId: session.id },
    orderBy: { startsAt: 'desc' },
    select: { code: true, area: true, startsAt: true, endsAt: true, priceCents: true, status: true, paymentStatus: true, paymentMethod: true, teamName: true, contactName: true, contactPhone: true, note: true, createdAt: true, cancelledAt: true },
  });
  const { ip, userAgent } = await getRequestInfo();
  await logSecurity({ type: 'export', ok: true, userId: session.id, ip, userAgent });

  const body = JSON.stringify({ exportedAt: new Date().toISOString(), controller: 'I - SPORT COMPLEX s.r.o., Fejova 1527/2, 040 01 Košice', user, securityEvents: events, reservations }, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="isport-moje-udaje-${date}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
