import 'server-only';
import { prisma } from './prisma';

// Zdieľaný limit v databáze: pevné okno (kľúč → počet a čas vypršania), jeden atómový SQL príkaz.
// Platí rovnako pre všetky inštancie servera na Verceli.

export type LimitResult = { ok: boolean; count: number; retryAfterSec: number };

export async function hitLimit(key: string, max: number, windowSec: number): Promise<LimitResult> {
  const rows = await prisma.$queryRaw<{ count: number; expiresAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "expiresAt")
    VALUES (${key}, 1, NOW() + make_interval(secs => ${windowSec}))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."expiresAt" < NOW() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "expiresAt" = CASE WHEN "RateLimit"."expiresAt" < NOW() THEN EXCLUDED."expiresAt" ELSE "RateLimit"."expiresAt" END
    RETURNING "count", "expiresAt"`;
  const row = rows[0];
  const count = Number(row?.count ?? 1);
  const retryAfterSec = row ? Math.max(0, Math.ceil((new Date(row.expiresAt).getTime() - Date.now()) / 1000)) : windowSec;
  return { ok: count <= max, count, retryAfterSec };
}

// Jednorazové použitie (napr. CAPTCHA): true len pri prvom použití kľúča.
export async function consumeOnce(key: string, ttlSec: number): Promise<boolean> {
  const r = await hitLimit(`once:${key}`, 1, ttlSec);
  return r.ok;
}

// Len prečíta aktuálny počet (bez zvýšenia). 0 = žiadny záznam alebo vypršal.
export async function peekLimit(key: string): Promise<number> {
  const row = await prisma.rateLimit.findUnique({ where: { key } });
  return row && row.expiresAt > new Date() ? row.count : 0;
}

export async function clearLimit(key: string): Promise<void> {
  await prisma.rateLimit.deleteMany({ where: { key } });
}

// Upratovanie starých záznamov (volá cron).
export async function purgeExpiredLimits(): Promise<number> {
  const r = await prisma.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return r.count;
}

export function minutes(sec: number): number {
  return Math.max(1, Math.ceil(sec / 60));
}
