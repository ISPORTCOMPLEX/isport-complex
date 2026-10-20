import { prisma } from '@/lib/prisma';
import { safeEqual } from '@/lib/crypto';
import { purgeExpiredLimits } from '@/lib/rateLimit';
import { getBaseUrl } from '@/lib/requestInfo';
import { bookingRows } from '@/lib/booking/format';
import { addDays, hallTime, todayIso } from '@/lib/booking/time';
import { sendBookingReminderEmail } from '@/lib/email';

// Denná údržba (Vercel Cron, 1× denne): pripomienky na zajtrajšie rezervácie,
// uzavretie odohraných rezervácií a upratanie starých limitov a odkazov.
// Volať sa dá len s tajným kľúčom CRON_SECRET (Vercel ho posiela sám).
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') ?? '';
  if (!secret || secret.length < 16 || !safeEqual(auth, `Bearer ${secret}`)) return new Response('Unauthorized', { status: 401 });

  const now = new Date();
  const tomorrow = addDays(todayIso(now), 1);
  const from = hallTime(tomorrow, 0);
  const to = hallTime(addDays(tomorrow, 1), 0);
  const base = await getBaseUrl();

  const upcoming = await prisma.booking.findMany({
    where: { status: 'CONFIRMED', reminderSentAt: null, startsAt: { gte: from, lt: to } },
    include: { user: { select: { email: true, firstName: true, deletedAt: true } } },
  });
  let reminders = 0;
  for (const b of upcoming) {
    const to = b.user && !b.user.deletedAt ? b.user.email : b.guestEmail;
    if (!to) continue;
    try {
      await sendBookingReminderEmail(to, b.user?.firstName ?? b.contactName.split(' ')[0], b.user ? `${base}/rezervacia/${b.code}` : `${base}/rezervacia`, bookingRows(b));
      await prisma.booking.update({ where: { id: b.id }, data: { reminderSentAt: new Date() } });
      reminders++;
    } catch (err) {
      console.error('[cron:reminder]', b.code, err);
    }
  }

  const completed = await prisma.booking.updateMany({ where: { status: 'CONFIRMED', endsAt: { lt: now }, checkedInAt: { not: null } }, data: { status: 'COMPLETED' } });
  const limits = await purgeExpiredLimits();
  const tokens = await prisma.authToken.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 7 * 86400000) } } });

  return Response.json({ ok: true, reminders, completed: completed.count, limits, tokens: tokens.count });
}
