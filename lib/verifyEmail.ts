import 'server-only';
import { prisma } from './prisma';
import { hitLimit } from './rateLimit';
import { getRequestInfo } from './requestInfo';
import { logSecurity } from './securityLog';
import { consumeAuthToken } from './tokens';

// Volá sa zo stránky /overenie-emailu (nie je to serverová akcia dostupná z prehliadača).
export async function verifyEmailToken(token: unknown): Promise<boolean> {
  const { ip, userAgent } = await getRequestInfo();
  const limit = await hitLimit(`verify:ip:${ip}`, 30, 15 * 60);
  if (!limit.ok) return false;
  const userId = await consumeAuthToken(token, 'VERIFY_EMAIL');
  if (!userId) {
    await logSecurity({ type: 'verify-email', ok: false, reason: 'bad-token', ip, userAgent });
    return false;
  }
  await prisma.user.updateMany({ where: { id: userId, emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } });
  await logSecurity({ type: 'verify-email', ok: true, userId, ip, userAgent });
  return true;
}
