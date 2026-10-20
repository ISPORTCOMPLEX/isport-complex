import 'server-only';
import type { TokenType } from '@prisma/client';
import { prisma } from './prisma';
import { randomToken, sha256 } from './crypto';

// Jednorazové odkazy z e-mailov. Do e-mailu ide náhodný token, v databáze je len jeho odtlačok,
// takže ani únik databázy neumožní odkaz použiť. Nový odkaz zruší staré odkazy rovnakého typu.

export const TOKEN_TTL: Record<TokenType, number> = {
  VERIFY_EMAIL: 24 * 60 * 60 * 1000,
  RESET_PASSWORD: 60 * 60 * 1000,
  LOGIN_LINK: 15 * 60 * 1000, // rezervované pre prihlásenie odkazom z e-mailu (zatiaľ nepoužité)
};

export async function createAuthToken(userId: string, type: TokenType): Promise<string> {
  const token = randomToken(32);
  await prisma.$transaction([
    prisma.authToken.deleteMany({ where: { userId, type } }),
    prisma.authToken.create({
      data: { userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + TOKEN_TTL[type]) },
    }),
  ]);
  return token;
}

function cleanToken(token: unknown): string | null {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{20,100}$/.test(token) ? token : null;
}

// Len overí, či je odkaz platný (na zobrazenie formulára), nespotrebuje ho.
export async function peekAuthToken(token: unknown, type: TokenType): Promise<string | null> {
  const t = cleanToken(token);
  if (!t) return null;
  const row = await prisma.authToken.findUnique({ where: { tokenHash: sha256(t) } });
  if (!row || row.type !== type || row.usedAt || row.expiresAt < new Date()) return null;
  return row.userId;
}

// Spotrebuje odkaz atómovo – ten istý odkaz sa nedá použiť dvakrát ani pri súbežných požiadavkách.
export async function consumeAuthToken(token: unknown, type: TokenType): Promise<string | null> {
  const t = cleanToken(token);
  if (!t) return null;
  const tokenHash = sha256(t);
  const r = await prisma.authToken.updateMany({
    where: { tokenHash, type, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (r.count !== 1) return null;
  const row = await prisma.authToken.findUnique({ where: { tokenHash } });
  return row?.userId ?? null;
}
