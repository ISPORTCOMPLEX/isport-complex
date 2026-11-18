'use server';

import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { hitLimit, minutes } from '@/lib/rateLimit';
import { getRequestInfo } from '@/lib/requestInfo';
import { getSessionUser } from '@/lib/session';
import { can } from '@/lib/staff';
import { liveWhere } from '@/lib/articles/queries';
import { COMMENT_MAX, VOTER_COOKIE, ensureSocialTables, reactionCounts, voterKeys } from '@/lib/articles/social';
import { getT } from '@/lib/i18n/server';

export type ReactState = { likes: number; dislikes: number; mine: -1 | 0 | 1; error?: string };
export type CommentState = { error?: string; ok?: number; body?: string };

const isId = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9]{10,40}$/i.test(v);

// Páči sa / nepáči sa – môže aj neprihlásený návštevník (jeden hlas na prehliadač), prihlásený má hlas pri účte.
// Opätovné kliknutie na ten istý palec hlas zruší.
export async function reactAction(articleId: string, value: number): Promise<ReactState> {
  const t = await getT();
  const empty: ReactState = { likes: 0, dislikes: 0, mine: 0 };
  if (!isId(articleId) || (value !== 1 && value !== -1)) return { ...empty, error: t('Neplatná požiadavka.') };
  await ensureSocialTables();
  const article = await prisma.article.findFirst({ where: { id: articleId, ...liveWhere() }, select: { id: true } });
  if (!article) return { ...empty, error: t('Článok sa nenašiel.') };
  const { ip } = await getRequestInfo();
  const limit = await hitLimit(`react:ip:${ip}`, 60, 60 * 60);
  if (!limit.ok) return { ...(await reactionCounts(articleId)), mine: 0, error: t('Priveľa kliknutí. Skús to o chvíľu.') };

  const user = await getSessionUser();
  const jar = await cookies();
  let anon = jar.get(VOTER_COOKIE)?.value;
  if (!user && !(anon && /^[\w-]{16,64}$/.test(anon))) {
    anon = randomUUID();
    jar.set(VOTER_COOKIE, anon, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 400 });
  }
  const voter = user ? `u:${user.id}` : `a:${anon}`;
  // hlas daný pred prihlásením (z tohto prehliadača) sa pri prihlásenom zlúči do účtu
  const keys = await voterKeys(user?.id ?? null);
  const old = await prisma.articleReaction.findMany({ where: { articleId, voter: { in: [...new Set([...keys, voter])] } }, select: { id: true, voter: true, value: true } });
  const current = old.find((r) => r.voter === voter) ?? old[0];
  const toggleOff = current?.value === value;
  await prisma.$transaction([
    prisma.articleReaction.deleteMany({ where: { id: { in: old.map((r) => r.id) } } }),
    ...(toggleOff ? [] : [prisma.articleReaction.create({ data: { articleId, voter, value } })]),
  ]);
  return { ...(await reactionCounts(articleId)), mine: toggleOff ? 0 : (value as 1 | -1) };
}

// Nový komentár – len prihlásený používateľ s overeným e-mailom (getSessionUser iných nepustí).
export async function commentAction(_prev: CommentState, form: FormData): Promise<CommentState> {
  const t = await getT();
  const user = await getSessionUser();
  const articleId = form.get('articleId');
  const raw = String(form.get('body') ?? '');
  const body = raw
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!user) return { error: t('Komentovať môžu len prihlásení používatelia.'), body: raw.slice(0, COMMENT_MAX) };
  if (!isId(articleId)) return { error: t('Neplatná požiadavka.') };
  if (body.length < 2) return { error: t('Napíš aspoň pár slov.'), body: raw };
  if (body.length > COMMENT_MAX) return { error: t('Komentár môže mať najviac {n} znakov.', { n: COMMENT_MAX }), body: raw.slice(0, COMMENT_MAX) };
  await ensureSocialTables();
  const article = await prisma.article.findFirst({ where: { id: articleId, ...liveWhere() }, select: { id: true } });
  if (!article) return { error: t('Článok sa nenašiel.') };
  const short = await hitLimit(`comment:user:${user.id}`, 5, 10 * 60);
  if (!short.ok) return { error: t('Píšeš príliš rýchlo. Skús to o {minutes} min.', { minutes: minutes(short.retryAfterSec) }), body };
  const day = await hitLimit(`comment:day:${user.id}`, 40, 24 * 60 * 60);
  if (!day.ok) return { error: t('Dnes si už pridal veľa komentárov. Skús to zajtra.'), body };
  // rovnaký text dvakrát za sebou (dvojklik, opakované odoslanie) sa neuloží znova
  const last = await prisma.articleComment.findFirst({ where: { articleId, userId: user.id }, orderBy: { createdAt: 'desc' }, select: { body: true, createdAt: true } });
  if (last && last.body === body && Date.now() - last.createdAt.getTime() < 10 * 60 * 1000) return { ok: Date.now() };
  await prisma.articleComment.create({ data: { articleId, userId: user.id, body } });
  return { ok: Date.now() };
}

// Zmazanie komentára – autor svoj vlastný, redakcia (oprávnenie písať články) hocijaký.
export async function deleteCommentAction(id: string): Promise<{ ok: boolean }> {
  const user = await getSessionUser();
  if (!user || !isId(id)) return { ok: false };
  await ensureSocialTables();
  const c = await prisma.articleComment.findUnique({ where: { id }, select: { userId: true, hiddenAt: true } });
  if (!c || c.hiddenAt) return { ok: false };
  const staff = can(user.role, 'articles.write');
  if (c.userId !== user.id && !staff) return { ok: false };
  await prisma.articleComment.update({ where: { id }, data: { hiddenAt: new Date(), hiddenBy: c.userId === user.id ? 'autor' : `redakcia:${user.id}` } });
  return { ok: true };
}
