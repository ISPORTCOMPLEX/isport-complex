'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { can, requireStaff } from '@/lib/staff';
import { hitLimit } from '@/lib/rateLimit';
import { getRequestInfo } from '@/lib/requestInfo';
import { cloudinaryConfig, getResource, uploadParams, verifyUploadSignature, MAX_BYTES, MAX_VIDEO_BYTES, type MediaKind } from '@/lib/cloudinary';
import { isCategory, normalizeBlocks, normalizeCover, plainText, readMinutes, slugify, type Block, type Cover } from '@/lib/articles/blocks';

// Redakčný systém: koncepty píše redaktor (articles.write), zverejňuje administrátor (articles.publish).
// Obsah z prehliadača sa vždy znovu očistí (normalizeBlocks) – nedôverujeme ničomu, čo pošle editor.

async function audit(actorId: string, action: string, target: string, meta?: Record<string, unknown>) {
  const { ip } = await getRequestInfo();
  await prisma.auditLog.create({ data: { actorId, action, target, meta: meta ? JSON.parse(JSON.stringify(meta)) : undefined, ip } });
}

function refresh(slug?: string) {
  revalidatePath('/');
  revalidatePath('/aktuality');
  if (slug) revalidatePath(`/aktuality/${slug}`);
}

async function uniqueSlug(base: string, exceptId?: string): Promise<string> {
  const root = slugify(base);
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? root : `${root}-${i + 1}`;
    const hit = await prisma.article.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === exceptId) return slug;
  }
  return `${root}-${Date.now().toString(36)}`;
}

// ───────────── Nový článok ─────────────
export async function createArticleAction(): Promise<void> {
  const me = await requireStaff('articles.write');
  const limit = await hitLimit(`articles:create:${me.id}`, 30, 60 * 60);
  if (!limit.ok) redirect('/admin/clanky?stav=limit');
  const slug = await uniqueSlug(`novy-clanok-${new Date().toISOString().slice(0, 10)}`);
  const a = await prisma.article.create({
    data: {
      slug,
      title: '',
      body: [{ id: Math.random().toString(36).slice(2, 12), type: 'text', html: '' }],
      authorId: me.id,
      authorName: 'Redakcia I-SPORT COMPLEX',
      updatedById: me.id,
    },
    select: { id: true },
  });
  await audit(me.id, 'article.create', a.id);
  redirect(`/admin/clanky/${a.id}`);
}

// ───────────── Uloženie (automatické aj ručné) ─────────────
export type ArticleDraft = {
  title: string;
  perex: string;
  category: string;
  tags: string[];
  slug: string;
  cover: Cover | null;
  blocks: Block[];
  seoTitle: string;
  seoDescription: string;
  pinned: boolean;
  authorName: string;
};

export type SaveArticleResult = { ok: true; savedAt: string; slug: string } | { ok: false; error: string };

export async function saveArticleAction(id: string, draft: ArticleDraft, reason: 'autosave' | 'save' = 'autosave'): Promise<SaveArticleResult> {
  const me = await requireStaff('articles.write');
  const limit = await hitLimit(`articles:save:${me.id}`, 1200, 60 * 60);
  if (!limit.ok) return { ok: false, error: 'Príliš veľa ukladaní. Počkaj chvíľu.' };
  const a = await prisma.article.findUnique({ where: { id: String(id).slice(0, 40) } });
  if (!a || a.deletedAt) return { ok: false, error: 'Článok sa nenašiel.' };
  // zverejnený článok smie meniť len ten, kto smie zverejňovať
  if (a.status !== 'DRAFT' && !can(me.role, 'articles.publish')) return { ok: false, error: 'Zverejnený článok môže upraviť len administrátor.' };

  const title = plainText(String(draft?.title ?? '')).slice(0, 160);
  const perex = plainText(String(draft?.perex ?? '')).slice(0, 400);
  const blocks = normalizeBlocks(draft?.blocks);
  const cover = normalizeCover(draft?.cover);
  const category = isCategory(String(draft?.category)) ? String(draft.category) : 'novinky';
  const tags = (Array.isArray(draft?.tags) ? draft.tags : [])
    .map((t) => plainText(String(t)).toLowerCase().slice(0, 30))
    .filter(Boolean)
    .slice(0, 12);
  const wantSlug = slugify(String(draft?.slug || title || a.slug));
  const slug = wantSlug === a.slug ? a.slug : await uniqueSlug(wantSlug, a.id);
  const authorName = plainText(String(draft?.authorName ?? '')).slice(0, 80) || 'Redakcia I-SPORT COMPLEX';
  const pinned = can(me.role, 'articles.publish') ? Boolean(draft?.pinned) : a.pinned;

  const data = {
    title,
    perex,
    category,
    tags: [...new Set(tags)],
    slug,
    cover: cover ? (JSON.parse(JSON.stringify(cover)) as Prisma.InputJsonValue) : Prisma.DbNull,
    body: JSON.parse(JSON.stringify(blocks)),
    seoTitle: plainText(String(draft?.seoTitle ?? '')).slice(0, 70) || null,
    seoDescription: plainText(String(draft?.seoDescription ?? '')).slice(0, 170) || null,
    pinned,
    authorName,
    readMinutes: readMinutes(title, perex, blocks),
    updatedById: me.id,
  };
  await prisma.$transaction(async (tx) => {
    if (pinned && !a.pinned) await tx.article.updateMany({ where: { pinned: true, id: { not: a.id } }, data: { pinned: false } });
    await tx.article.update({ where: { id: a.id }, data });
    const lastRev = await tx.articleRevision.findFirst({ where: { articleId: a.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
    const due = reason === 'save' || !lastRev || Date.now() - lastRev.createdAt.getTime() > 10 * 60 * 1000;
    if (due) {
      await tx.articleRevision.create({ data: { articleId: a.id, title, perex, body: data.body, cover: cover ? JSON.parse(JSON.stringify(cover)) : undefined, reason, createdById: me.id } });
      // držíme posledných 50 verzií
      const old = await tx.articleRevision.findMany({ where: { articleId: a.id }, orderBy: { createdAt: 'desc' }, skip: 50, select: { id: true } });
      if (old.length) await tx.articleRevision.deleteMany({ where: { id: { in: old.map((r) => r.id) } } });
    }
  });
  if (a.status !== 'DRAFT') refresh(slug);
  if (slug !== a.slug && a.status !== 'DRAFT') revalidatePath(`/aktuality/${a.slug}`);
  return { ok: true, savedAt: new Date().toISOString(), slug };
}

// ───────────── Zverejnenie, plánovanie, stiahnutie ─────────────
export type PublishResult = { ok: true; status: string; slug: string } | { ok: false; error: string };

export async function publishArticleAction(id: string, when: string | null): Promise<PublishResult> {
  const me = await requireStaff('articles.publish');
  const a = await prisma.article.findUnique({ where: { id: String(id).slice(0, 40) } });
  if (!a || a.deletedAt) return { ok: false, error: 'Článok sa nenašiel.' };
  if (a.title.trim().length < 3) return { ok: false, error: 'Doplň nadpis článku.' };
  if (normalizeBlocks(a.body).length === 0) return { ok: false, error: 'Článok je prázdny.' };
  let at: Date | null = null;
  if (when) {
    at = new Date(when);
    if (Number.isNaN(at.getTime())) return { ok: false, error: 'Neplatný dátum.' };
    if (at.getTime() > Date.now() + 366 * 86400000) return { ok: false, error: 'Naplánovať sa dá najviac rok dopredu.' };
  }
  const scheduled = at !== null && at.getTime() > Date.now() + 60_000;
  await prisma.article.update({
    where: { id: a.id },
    data: scheduled ? { status: 'SCHEDULED', publishAt: at, publishedAt: null } : { status: 'PUBLISHED', publishedAt: a.publishedAt ?? new Date(), publishAt: null },
  });
  await prisma.articleRevision.create({ data: { articleId: a.id, title: a.title, perex: a.perex, body: (a.body ?? []) as Prisma.InputJsonValue, cover: (a.cover ?? undefined) as Prisma.InputJsonValue | undefined, reason: 'publish', createdById: me.id } });
  await audit(me.id, scheduled ? 'article.schedule' : 'article.publish', a.id, { slug: a.slug, at: at?.toISOString() });
  refresh(a.slug);
  return { ok: true, status: scheduled ? 'SCHEDULED' : 'PUBLISHED', slug: a.slug };
}

export async function unpublishArticleAction(id: string): Promise<PublishResult> {
  const me = await requireStaff('articles.publish');
  const a = await prisma.article.findUnique({ where: { id: String(id).slice(0, 40) } });
  if (!a) return { ok: false, error: 'Článok sa nenašiel.' };
  await prisma.article.update({ where: { id: a.id }, data: { status: 'DRAFT', publishAt: null, pinned: false } });
  await audit(me.id, 'article.unpublish', a.id, { slug: a.slug });
  refresh(a.slug);
  return { ok: true, status: 'DRAFT', slug: a.slug };
}

// Kôš: článok zmizne z webu, dá sa obnoviť. Natrvalo sa maže až z koša.
export async function trashArticleAction(form: FormData): Promise<void> {
  const me = await requireStaff('articles.publish');
  const id = String(form.get('id') ?? '').slice(0, 40);
  const op = String(form.get('op') ?? 'trash');
  const a = await prisma.article.findUnique({ where: { id } });
  if (!a) redirect('/admin/clanky');
  if (op === 'restore') {
    await prisma.article.update({ where: { id }, data: { deletedAt: null, status: 'DRAFT' } });
    await audit(me.id, 'article.restore', id);
  } else if (op === 'delete' && a.deletedAt) {
    await prisma.article.delete({ where: { id } });
    await audit(me.id, 'article.delete', id, { slug: a.slug, title: a.title });
  } else {
    await prisma.article.update({ where: { id }, data: { deletedAt: new Date(), pinned: false } });
    await audit(me.id, 'article.trash', id, { slug: a.slug });
  }
  refresh(a.slug);
  redirect(op === 'trash' ? '/admin/clanky?stav=kos' : '/admin/clanky?tab=kos');
}

// ───────────── História verzií ─────────────
export type RevisionRow = { id: string; createdAt: string; reason: string; title: string };

export async function listRevisionsAction(id: string): Promise<RevisionRow[]> {
  await requireStaff('articles.write');
  const rows = await prisma.articleRevision.findMany({ where: { articleId: String(id).slice(0, 40) }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, createdAt: true, reason: true, title: true } });
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

export async function loadRevisionAction(revId: string): Promise<{ title: string; perex: string; blocks: Block[]; cover: Cover | null } | null> {
  await requireStaff('articles.write');
  const r = await prisma.articleRevision.findUnique({ where: { id: String(revId).slice(0, 40) } });
  if (!r) return null;
  return { title: r.title, perex: r.perex, blocks: normalizeBlocks(r.body), cover: normalizeCover(r.cover) };
}

// ───────────── Nahrávanie fotiek a videí do článkov ─────────────
export type ArticleSign = { ok: true; url: string; fields: Record<string, string | number>; maxBytes: number } | { ok: false; error: string };

export async function signArticleUploadAction(kind: MediaKind): Promise<ArticleSign> {
  const me = await requireStaff('articles.write');
  const cfg = cloudinaryConfig();
  if (!cfg) return { ok: false, error: 'Cloudinary nie je nastavené.' };
  const k: MediaKind = kind === 'video' ? 'video' : 'image';
  const limit = await hitLimit(`articles:sign:${me.id}`, 200, 60 * 60);
  if (!limit.ok) return { ok: false, error: 'Príliš veľa nahrávaní za hodinu.' };
  const { url, fields } = uploadParams(cfg, 'clanky', k);
  return { ok: true, url, fields, maxBytes: k === 'video' ? MAX_VIDEO_BYTES : MAX_BYTES };
}

export type MediaInfo = { ok: true; publicId: string; version: number; width: number; height: number; duration: number } | { ok: false; error: string };

export async function verifyArticleMediaAction(kind: MediaKind, publicId: string, version: number, signature: string): Promise<MediaInfo> {
  await requireStaff('articles.write');
  const cfg = cloudinaryConfig();
  if (!cfg) return { ok: false, error: 'Cloudinary nie je nastavené.' };
  const k: MediaKind = kind === 'video' ? 'video' : 'image';
  const id = String(publicId ?? '').slice(0, 300);
  const v = Number(version);
  if (!/^isport\/clanky\/[\w./-]+$/.test(id) || id.includes('..') || !Number.isInteger(v) || !/^[a-f0-9]{40}$/.test(String(signature))) return { ok: false, error: 'Neplatné údaje o súbore.' };
  if (!verifyUploadSignature(cfg, id, v, String(signature))) return { ok: false, error: 'Podpis súboru nesedí.' };
  const r = await getResource(cfg, id, k);
  if (!r || r.public_id !== id) return { ok: false, error: 'Súbor sa v úložisku nenašiel.' };
  return { ok: true, publicId: r.public_id, version: r.version, width: r.width, height: r.height, duration: Math.round(r.duration ?? 0) };
}
