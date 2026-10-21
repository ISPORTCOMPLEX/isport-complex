import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/requestInfo';
import { prisma } from '@/lib/prisma';
import { liveWhere } from '@/lib/articles/queries';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl() ?? 'http://localhost:3000';
  const pages: MetadataRoute.Sitemap = ['', '/aktuality', '/ladova-plocha', '/ihrisko', '/fitness-wellness', '/bufet-skyboxy', '/cennik', '/pre-kluby', '/kontakt', '/fotky', '/rezervacia', '/obchodne-podmienky', '/ochrana-osobnych-udajov', '/vyhlasenie-o-pristupnosti'].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: p === '/aktuality' ? ('daily' as const) : ('weekly' as const),
    priority: p === '' ? 1 : p === '/aktuality' ? 0.8 : 0.6,
  }));
  let articles: { slug: string; updatedAt: Date }[] = [];
  try {
    articles = await prisma.article.findMany({ where: liveWhere(), select: { slug: true, updatedAt: true }, orderBy: { publishedAt: 'desc' }, take: 5000 });
  } catch {
    /* tabuľka ešte neexistuje */
  }
  return [...pages, ...articles.map((a) => ({ url: `${base}/aktuality/${a.slug}`, lastModified: a.updatedAt, changeFrequency: 'monthly' as const, priority: 0.5 }))];
}
