// RSS kanál aktualít – verejný, dostupný na /aktuality/rss.xml (prepis v next.config.ts).
import { prisma } from '@/lib/prisma';
import { appUrl } from '@/lib/requestInfo';
import { categoryLabel } from '@/lib/articles/blocks';
import { liveWhere, shownDate } from '@/lib/articles/queries';

export const revalidate = 600;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function GET() {
  const base = appUrl() ?? 'http://localhost:3000';
  let rows: { slug: string; title: string; perex: string; category: string; publishedAt: Date | null; publishAt: Date | null; createdAt: Date }[] = [];
  try {
    rows = await prisma.article.findMany({
      where: liveWhere(),
      orderBy: [{ publishedAt: 'desc' }, { publishAt: 'desc' }],
      take: 30,
      select: { slug: true, title: true, perex: true, category: true, publishedAt: true, publishAt: true, createdAt: true },
    });
  } catch {
    /* tabuľka ešte neexistuje */
  }
  const items = rows
    .map((a) => {
      const link = `${base}/aktuality/${a.slug}`;
      return `<item><title>${esc(a.title)}</title><link>${link}</link><guid isPermaLink="true">${link}</guid><pubDate>${shownDate(a).toUTCString()}</pubDate><category>${esc(categoryLabel(a.category))}</category><description>${esc(a.perex)}</description></item>`;
    })
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>I-SPORT COMPLEX – aktuality</title><link>${base}/aktuality</link><atom:link href="${base}/aktuality/rss.xml" rel="self" type="application/rss+xml"/><description>Novinky zo športového komplexu v Košiciach</description><language>sk</language>${items}</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=600, s-maxage=600' } });
}
