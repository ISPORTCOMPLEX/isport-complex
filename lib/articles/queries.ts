import 'server-only';
import { cache } from 'react';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { cloudName, photoPath, videoPath, IMG_WIDTHS } from '@/lib/cloudinary';
import type { WebPhoto } from '@/lib/media';
import { categoryLabel, normalizeBlocks, normalizeCover, type Block, type Cover, type Img } from './blocks';

// Verejne viditeľný článok: zverejnený, alebo naplánovaný a jeho čas už nastal (netreba cron), nie v koši.
export function liveWhere(now = new Date()): Prisma.ArticleWhereInput {
  return {
    deletedAt: null,
    OR: [
      { status: 'PUBLISHED', publishedAt: { lte: now } },
      { status: 'SCHEDULED', publishAt: { lte: now } },
    ],
  };
}

// Dátum zverejnenia pre zobrazenie a radenie (pri naplánovanom je to publishAt).
export const shownDate = (a: { publishedAt: Date | null; publishAt: Date | null; createdAt: Date }) => a.publishedAt ?? a.publishAt ?? a.createdAt;

// Fotka z článku vo formáte, ktorý používajú komponenty fotiek (adresy na našej doméne).
export function articleImage(i: Img & { alt?: string }, ratio?: string): WebPhoto | null {
  if (!cloudName()) return null;
  const widths = IMG_WIDTHS.filter((w) => w <= Math.max(i.width, 480));
  const set = (fmt: 'avif' | 'webp' | 'jpg') => widths.map((w) => `${photoPath(i.publicId, i.version, w, ratio, fmt)} ${w}w`).join(', ');
  return {
    id: i.publicId,
    alt: i.alt || 'Fotka z I-SPORT COMPLEX Košice',
    width: i.width,
    height: i.height,
    src: photoPath(i.publicId, i.version, 1200, ratio, 'jpg'),
    srcSet: set('jpg'),
    avif: set('avif'),
    webp: set('webp'),
    thumb: photoPath(i.publicId, i.version, 480, ratio, 'webp'),
  };
}

export const videoSrc = (v: Img) => videoPath(v.publicId, v.version, 'mp4');
export const videoPoster = (v: Img) => videoPath(v.publicId, v.version, 'jpg');

export type ArticleCard = {
  id: string;
  slug: string;
  title: string;
  perex: string;
  category: string;
  categoryLabel: string;
  date: Date;
  readMinutes: number;
  cover: Cover | null;
  pinned: boolean;
  videoSeconds: number | null; // článok s videom – značka „Video 1:24“
};

const cardSelect = {
  id: true,
  slug: true,
  title: true,
  perex: true,
  category: true,
  publishedAt: true,
  publishAt: true,
  createdAt: true,
  readMinutes: true,
  cover: true,
  pinned: true,
  body: true,
} as const;

function toCard(a: {
  id: string;
  slug: string;
  title: string;
  perex: string;
  category: string;
  publishedAt: Date | null;
  publishAt: Date | null;
  createdAt: Date;
  readMinutes: number;
  cover: unknown;
  pinned: boolean;
  body: unknown;
}): ArticleCard {
  const blocks = normalizeBlocks(a.body);
  const v = blocks.find((b) => b.type === 'video' || b.type === 'youtube');
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    perex: a.perex,
    category: a.category,
    categoryLabel: categoryLabel(a.category),
    date: shownDate(a),
    readMinutes: a.readMinutes,
    cover: normalizeCover(a.cover),
    pinned: a.pinned,
    videoSeconds: v ? (v.type === 'video' ? v.video.duration : 0) : null,
  };
}

const PER_PAGE = 9;

export async function listArticles(category: string | null, page: number) {
  const where: Prisma.ArticleWhereInput = { ...liveWhere(), ...(category ? { category } : {}) };
  const [total, rows] = await Promise.all([
    prisma.article.count({ where }),
    prisma.article.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }, { publishAt: 'desc' }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: cardSelect,
    }),
  ]);
  return { total, pages: Math.max(1, Math.ceil(total / PER_PAGE)), items: rows.map(toCard) };
}

// Úvodná stránka: pripnutý (alebo najnovší) článok + ďalšie tri.
export const homeArticles = cache(async (): Promise<ArticleCard[]> => {
  try {
    const rows = await prisma.article.findMany({
      where: liveWhere(),
      orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }, { publishAt: 'desc' }],
      take: 4,
      select: cardSelect,
    });
    return rows.map(toCard);
  } catch {
    return []; // tabuľka ešte neexistuje (pred prisma db push) – úvod funguje ďalej
  }
});

export type FullArticle = ArticleCard & {
  blocks: Block[];
  tags: string[];
  authorName: string;
  updatedAt: Date;
  seoTitle: string | null;
  seoDescription: string | null;
  status: string;
};

export const articleBySlug = cache(async (slug: string, includeDrafts = false): Promise<FullArticle | null> => {
  if (!/^[a-z0-9-]{1,90}$/.test(slug)) return null;
  const a = await prisma.article.findFirst({
    where: includeDrafts ? { slug, deletedAt: null } : { slug, ...liveWhere() },
    select: { ...cardSelect, tags: true, authorName: true, updatedAt: true, seoTitle: true, seoDescription: true, status: true },
  });
  if (!a) return null;
  return { ...toCard(a), blocks: normalizeBlocks(a.body), tags: a.tags, authorName: a.authorName, updatedAt: a.updatedAt, seoTitle: a.seoTitle, seoDescription: a.seoDescription, status: a.status };
});

export async function relatedArticles(id: string, category: string): Promise<ArticleCard[]> {
  const rows = await prisma.article.findMany({
    where: { ...liveWhere(), id: { not: id } },
    orderBy: [{ publishedAt: 'desc' }],
    take: 12,
    select: cardSelect,
  });
  const cards = rows.map(toCard);
  return [...cards.filter((c) => c.category === category), ...cards.filter((c) => c.category !== category)].slice(0, 3);
}

export function fmtArticleDate(d: Date): string {
  return d.toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bratislava' });
}

export function fmtShortDate(d: Date): string {
  return d.toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'Europe/Bratislava' });
}

export function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
