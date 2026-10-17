import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './prisma';
import { getSecret } from './secrets';

// Relácia = podpísaný JWT v HttpOnly cookie. Pri každom čítaní sa overí aj v databáze:
// zablokovaný alebo zmazaný účet, zmena hesla a „odhlásiť všade“ staré relácie zneplatnia.

const SESSION_COOKIE = 'isp_session';
const PENDING_2FA_COOKIE = 'isp_2fa';
const SESSION_DAYS = 30;

const secure = process.env.NODE_ENV === 'production';

function key() {
  return new Uint8Array(getSecret('session'));
}

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ typ: 'session' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: SESSION_DAYS * 86400 });
  jar.delete(PENDING_2FA_COOKIE);
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(PENDING_2FA_COOKIE);
}

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  twoFactorEnabledAt: Date | null;
  createdAt: Date;
};

function revokedAfter(iat: number, ...dates: (Date | null)[]): boolean {
  return dates.some((d) => d !== null && Math.floor(d.getTime() / 1000) > iat);
}

// cache = v rámci jednej požiadavky sa databáza opýta len raz (hlavička + stránka).
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    if (payload.typ !== 'session' || typeof payload.sub !== 'string' || typeof payload.iat !== 'number') return null;
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.bannedAt || user.deletedAt || !user.emailVerifiedAt) return null;
    if (revokedAfter(payload.iat, user.passwordChangedAt, user.sessionsRevokedAt)) return null;
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      twoFactorEnabledAt: user.twoFactorEnabledAt,
      createdAt: user.createdAt,
    };
  } catch {
    return null;
  }
});

export async function requireUser(next = '/ucet'): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/prihlasenie?next=${encodeURIComponent(next)}`);
  return user;
}

// Medzikrok prihlásenia: heslo sedí, čaká sa na kód 2FA (platí 5 minút).
export async function setPending2fa(userId: string, next: string): Promise<void> {
  const token = await new SignJWT({ typ: '2fa', next })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key());
  const jar = await cookies();
  jar.set(PENDING_2FA_COOKIE, token, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 300 });
}

export async function getPending2fa(): Promise<{ userId: string; next: string } | null> {
  const jar = await cookies();
  const token = jar.get(PENDING_2FA_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    if (payload.typ !== '2fa' || typeof payload.sub !== 'string') return null;
    return { userId: payload.sub, next: typeof payload.next === 'string' ? payload.next : '/ucet' };
  } catch {
    return null;
  }
}
