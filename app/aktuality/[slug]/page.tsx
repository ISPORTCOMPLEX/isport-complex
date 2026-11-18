import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { after } from 'next/server';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { appUrl } from '@/lib/requestInfo';
import { CloudImage } from '@/components/CloudImage';
import { ArticleBody } from '@/components/articles/ArticleBody';
import { ArticleCard } from '@/components/articles/ArticleCard';
import { Share } from '@/components/articles/Share';
import { articleImage, fmtArticleDate, fmtShortDate, relatedArticles } from '@/lib/articles/queries';
import { loadArticle } from '@/lib/articles/view';
import { getT } from '@/lib/i18n/server';
import { msg } from '@/lib/i18n/translate';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ nahlad?: string }> };

const STATUS: Record<string, string> = { DRAFT: msg('koncept'), SCHEDULED: msg('naplánovaný'), ARCHIVED: msg('stiahnutý'), PUBLISHED: msg('zverejnený') };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const tr = await getT();
  const r = await loadArticle((await params).slug, (await searchParams).nahlad === '1');
  if (!r) return { title: tr('Článok sa nenašiel') };
  const { a } = r;
  const og = a.cover ? articleImage(a.cover, '2:1') : null;
  const title = a.seoTitle || a.title;
  const description = a.seoDescription || a.perex || undefined;
  return {
    title,
    description,
    alternates: { canonical: `/aktuality/${a.slug}` },
    robots: r.preview ? { index: false, follow: false } : undefined,
    openGraph: {
      type: 'article',
      title,
      description,
      url: `/aktuality/${a.slug}`,
      publishedTime: a.date.toISOString(),
      modifiedTime: a.updatedAt.toISOString(),
      section: a.categoryLabel,
      tags: a.tags,
      images: og ? [{ url: og.src, width: 1200, height: 600, alt: a.cover?.alt || a.title }] : undefined,
    },
    twitter: { card: og ? 'summary_large_image' : 'summary' },
  };
}

export default async function ArticlePage({ params, searchParams }: Props) {
  const tr = await getT();
  const r = await loadArticle((await params).slug, (await searchParams).nahlad === '1');
  if (!r) notFound();
  const { a, preview } = r;
  const base = appUrl() ?? 'http://localhost:3000';
  const url = `${base}/aktuality/${a.slug}`;
  const cover = a.cover ? articleImage(a.cover, '2:1') : null;
  const related = await relatedArticles(a.id, a.category).catch(() => []);
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  if (!preview) {
    // počítadlo zobrazení až po odoslaní stránky – nespomalí ju
    after(async () => {
      await prisma.article.update({ where: { id: a.id }, data: { views: { increment: 1 } } }).catch(() => undefined);
    });
  }

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: a.title.slice(0, 110),
    description: a.perex || undefined,
    datePublished: a.date.toISOString(),
    dateModified: a.updatedAt.toISOString(),
    image: cover ? [`${base}${cover.src}`] : undefined,
    author: { '@type': 'Organization', name: a.authorName },
    publisher: { '@type': 'Organization', name: tr('I-SPORT COMPLEX s.r.o.'), logo: { '@type': 'ImageObject', url: `${base}/icon.svg` } },
    mainEntityOfPage: url,
    articleSection: a.categoryLabel,
    keywords: a.tags.join(', ') || undefined,
  };

  return (
    <div className="ar">
      {preview ? (
        <div className="ar__preview" role="status">
          {tr('Náhľad – článok je')}{' '}{STATUS[a.status] ? tr(STATUS[a.status]) : a.status}{tr(', návštevníci ho')}{' '}{a.status === 'PUBLISHED' ? tr('vidia') : tr('zatiaľ nevidia')}.
        </div>
      ) : null}
      <div className="wrap ar__wrap">
        <nav className="ar__crumbs" aria-label={tr('Omrvinková navigácia')}>
          <Link href="/">{tr('Komplex')}</Link>
          <span aria-hidden="true">/</span>
          <Link href="/aktuality">{tr('Aktuality')}</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/aktuality?kategoria=${a.category}`}>{tr(a.categoryLabel)}</Link>
        </nav>
        <header className="ar__head">
          <p className="ar__kick">
            <Link href={`/aktuality?kategoria=${a.category}`} className="ac__cat">
              {tr(a.categoryLabel)}
            </Link>
            <span className="ac__meta">
              <time dateTime={a.date.toISOString()}>{fmtArticleDate(a.date, tr)}</time> {' '}{tr('· {readMinutes} min čítania', { readMinutes: a.readMinutes })} 
            </span>
          </p>
          <h1 className="cond ar__h1">{a.title}</h1>
          {a.perex ? <p className="ar__lead">{a.perex}</p> : null}
          <div className="ar__by">
            <div className="ar__au">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.svg" alt="" width={44} height={44} />
              <div>
                <b>{a.authorName}</b>
                <span>{tr('Aktualizované {fmtShortDate}', { fmtShortDate: fmtShortDate(a.updatedAt, tr) })}</span>
              </div>
            </div>
            <Share url={url} title={a.title} />
          </div>
        </header>
      </div>

      {cover ? (
        <figure className="ar__hero">
          <CloudImage photo={{ ...cover, alt: a.cover?.alt || '' }} sizes="(max-width: 1280px) 100vw, 1216px" priority className="ar__hero-img" />
          {a.cover?.caption ? <figcaption>{a.cover.caption}</figcaption> : null}
        </figure>
      ) : null}

      <article className="ar__body" aria-label={a.title}>
        <ArticleBody slug={a.slug} blocks={a.blocks} title={a.title} />
        {a.tags.length ? (
          <ul className="ar__tags" aria-label={tr('Štítky')}>
            {a.tags.map((t) => (
              <li key={t}>#{t}</li>
            ))}
          </ul>
        ) : null}
      </article>

      {related.length ? (
        <section className="ar__rel" aria-labelledby="ar-rel">
          <div className="wrap">
            <div className="ar__rel-h">
              <h2 id="ar-rel" className="cond">
                {tr('Ďalšie aktuality')}
              </h2>
              <Link href="/aktuality" className="nw__more">
                {tr('Všetky aktuality')}{' '}<span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="nw__grid">
              {related.map((c) => (
                <ArticleCard key={c.id} a={c} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
    </div>
  );
}
