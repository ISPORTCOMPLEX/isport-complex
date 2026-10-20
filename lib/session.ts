import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './prisma';
import { getSecret } from './secrets';
import { randomToken } from './crypto';
import { getRequestInfo } from './requestInfo';

// Relácia = podpísaný JWT v HttpOnly cookie s id relácie v databáze. Pri každom čítaní sa overí,
// že relácia nie je zrušená (odhlásenie), účet nie je zablokovaný a heslo sa odvtedy nezmenilo.

const secure = process.env.NODE_ENV === 'production';
// Predpona __Host- (len cez HTTPS): cookie nemôže nastaviť ani prepísať subdoména ani iná cesta.
const SESSION_COOKIE = secure ? '__Host-isp_session' : 'isp_session';
const PENDING_2FA_COOKIE = secure ? '__Host-isp_2fa' : 'isp_2fa';
const SESSION_DAYS = 30;
// Personál (recepcia, účtovníctvo, administrátor) sa musí prihlásiť znova po 12 hodinách.
const STAFF_SESSION_HOURS = 12;
const STAFF = ['ADMIN', 'RECEPTION', 'ACCOUNTANT'];

function key() {
  return new Uint8Array(getSecret('session'));
}

export async function createSession(userId: string): Promise<void> {
  const sid = randomToken(18);
  const { ip, userAgent } = await getRequestInfo();
  await prisma.session.create({ data: { id: sid, userId, expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000), ip, userAgent } });
  const token = await new SignJWT({ typ: 'session', sid })
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
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
      if (typeof payload.sid === 'string') await prisma.session.updateMany({ where: { id: payload.sid, revokedAt: null }, data: { revokedAt: new Date() } });
    } catch {
      // neplatná cookie – stačí ju zmazať
    }
  }
  jar.delete(SESSION_COOKIE);
  jar.delete(PENDING_2FA_COOKIE);
}

// Zruší všetky relácie používateľa v databáze (odhlásenie zo všetkých zariadení).
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
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
    if (payload.typ !== 'session' || typeof payload.sub !== 'string' || typeof payload.iat !== 'number' || typeof payload.sid !== 'string') return null;
    const session = await prisma.session.findUnique({ where: { id: payload.sid }, include: { user: true } });
    if (!session || session.revokedAt || session.expiresAt < new Date() || session.userId !== payload.sub) return null;
    const user = session.user;
    if (!user || user.bannedAt || user.deletedAt || !user.emailVerifiedAt) return null;
    if (revokedAfter(payload.iat, user.passwordChangedAt, user.sessionsRevokedAt)) return null;
    if (STAFF.includes(user.role) && Date.now() / 1000 - payload.iat > STAFF_SESSION_HOURS * 3600) return null;
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
