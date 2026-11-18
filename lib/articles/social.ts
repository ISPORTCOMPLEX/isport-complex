import 'server-only';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

// Reakcie (páči sa / nepáči sa) a komentáre pod článkami.
// Tabuľky si web vytvorí sám pri prvom použití – rovnako, ako by ich vytvoril `prisma db push`
// (rovnaké názvy stĺpcov, indexov aj väzieb), takže neskoršie `db push` už nič nemení.

export const VOTER_COOKIE = 'isp_v';
export const COMMENT_MAX = 1000;

const DDL = [
  () => prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "ArticleReaction" ("id" TEXT NOT NULL, "articleId" TEXT NOT NULL, "voter" TEXT NOT NULL, "value" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ArticleReaction_pkey" PRIMARY KEY ("id"))`,
  () => prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "ArticleReaction_articleId_voter_key" ON "ArticleReaction"("articleId", "voter")`,
  () => prisma.$executeRaw`DO $$ BEGIN ALTER TABLE "ArticleReaction" ADD CONSTRAINT "ArticleReaction_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  () => prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "ArticleComment" ("id" TEXT NOT NULL, "articleId" TEXT NOT NULL, "userId" TEXT NOT NULL, "body" TEXT NOT NULL, "hiddenAt" TIMESTAMP(3), "hiddenBy" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ArticleComment_pkey" PRIMARY KEY ("id"))`,
  () => prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "ArticleComment_articleId_createdAt_idx" ON "ArticleComment"("articleId", "createdAt")`,
  () => prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "ArticleComment_userId_idx" ON "ArticleComment"("userId")`,
  () => prisma.$executeRaw`DO $$ BEGIN ALTER TABLE "ArticleComment" ADD CONSTRAINT "ArticleComment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  () => prisma.$executeRaw`DO $$ BEGIN ALTER TABLE "ArticleComment" ADD CONSTRAINT "ArticleComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

let ready: Promise<void> | null = null;
export function ensureSocialTables(): Promise<void> {
  ready ??= (async () => {
    for (const run of DDL) await run();
  })().catch((e) => {
    ready = null; // pri ďalšej požiadavke skúsi znova
    throw e;
  });
  return ready;
}

export type CommentView = { id: string; name: string; initial: string; body: string; date: Date; mine: boolean };
export type Social = { likes: number; dislikes: number; mine: -1 | 0 | 1; comments: CommentView[]; ok: boolean };

// „Matúš Bereš“ → „Matúš B.“ (celé priezvisko sa verejne neukazuje)
export const publicName = (first: string, last: string) => `${first.trim()} ${last.trim() ? `${last.trim().charAt(0)}.` : ''}`.trim();

export async function voterKeys(userId: string | null): Promise<string[]> {
  const anon = (await cookies()).get(VOTER_COOKIE)?.value;
  const keys: string[] = [];
  if (userId) keys.push(`u:${userId}`);
  if (anon && /^[\w-]{16,64}$/.test(anon)) keys.push(`a:${anon}`);
  return keys;
}

export async function reactionCounts(articleId: string) {
  const rows = await prisma.articleReaction.groupBy({ by: ['value'], where: { articleId }, _count: { _all: true } });
  return { likes: rows.find((r) => r.value === 1)?._count._all ?? 0, dislikes: rows.find((r) => r.value === -1)?._count._all ?? 0 };
}

export async function loadSocial(articleId: string, userId: string | null): Promise<Social> {
  try {
    await ensureSocialTables();
    const keys = await voterKeys(userId);
    const [counts, mineRow, rows] = await Promise.all([
      reactionCounts(articleId),
      keys.length ? prisma.articleReaction.findFirst({ where: { articleId, voter: { in: keys } }, orderBy: { createdAt: 'desc' }, select: { value: true } }) : null,
      prisma.articleComment.findMany({
        where: { articleId, hiddenAt: null, user: { deletedAt: null, bannedAt: null } },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: { id: true, body: true, createdAt: true, userId: true, user: { select: { firstName: true, lastName: true } } },
      }),
    ]);
    return {
      ...counts,
      mine: mineRow?.value === 1 ? 1 : mineRow?.value === -1 ? -1 : 0,
      ok: true,
      comments: rows.map((c) => ({ id: c.id, name: publicName(c.user.firstName, c.user.lastName), initial: (c.user.firstName.trim().charAt(0) || '?').toUpperCase(), body: c.body, date: c.createdAt, mine: c.userId === userId })),
    };
  } catch {
    return { likes: 0, dislikes: 0, mine: 0, comments: [], ok: false };
  }
}
