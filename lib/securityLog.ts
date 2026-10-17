import 'server-only';
import { prisma } from './prisma';

type Event = {
  type: 'register' | 'login' | 'login-2fa' | 'password-reset' | 'password-change' | 'verify-email' | 'account-delete' | '2fa-change' | 'sessions' | 'export';
  ok: boolean;
  reason?: string;
  email?: string | null;
  userId?: string | null;
  ip?: string;
  userAgent?: string;
};

// Zápis nikdy nezhodí hlavnú akciu.
export async function logSecurity(e: Event): Promise<void> {
  try {
    await prisma.securityEvent.create({
      data: {
        type: e.type,
        ok: e.ok,
        reason: e.reason?.slice(0, 200),
        email: e.email?.slice(0, 200) ?? null,
        userId: e.userId ?? null,
        ip: e.ip,
        userAgent: e.userAgent,
      },
    });
  } catch (err) {
    console.error('[securityLog]', err);
  }
}
