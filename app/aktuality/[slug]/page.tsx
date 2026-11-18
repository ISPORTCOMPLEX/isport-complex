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
import { articleImage, fmtArticleDate, fmtShortDate, homeArticles, relatedArticles } from '@/lib/articles/queries';
import { loadArticle } from '@/lib/articles/view';
import { getT } from '@/lib/i18n/server';
import { msg } from '@/lib/i18n/translate';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ nahlad?: string }> };

// farebný štítok kategórie (rovnako ako v Novinkách na úvode)
const TONE: Record<string, string> = { novinky: 'red', turnaje: 'blue', kempy: 'yellow', oznamy: 'ink' };

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
  const [related, latest] = await Promise.all([relatedArticles(a.id, a.category).catch(() => []), homeArticles().catch(() => [])]);
  const rail = latest.filter((x) => x.id !== a.id).slice(0, 5);
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
    <div className="nart">
      {preview ? (
        <div className="ar__preview" role="status">
          {tr('Náhľad – článok je')}{' '}{STATUS[a.status] ? tr(STATUS[a.status]) : a.status}{tr(', návštevníci ho')}{' '}{a.status === 'PUBLISHED' ? tr('vidia') : tr('zatiaľ nevidia')}.
        </div>
      ) : null}
      <div className="wrap nart__grid">
        <article className="nart__main" aria-labelledby="nart-h1">
          <nav className="nart__crumbs" aria-label={tr('Omrvinková navigácia')}>
            <Link href="/">{tr('Komplex')}</Link>
            <span aria-hidden="true">›</span>
            <Link href="/aktuality">{tr('Aktuality')}</Link>
          </nav>
          <header className="nart__head">
            <Link href={`/aktuality?kategoria=${a.category}`} className={`cat cat--${a.pinned ? 'red' : (TONE[a.category] ?? 'red')}`}>
              {a.pinned ? tr('Dôležité') : tr(a.categoryLabel)}
            </Link>
            <h1 id="nart-h1" className="nart__h1">
              {a.title}
            </h1>
            {a.perex ? <p className="nart__lead">{a.perex}</p> : null}
            <div className="nart__by">
              <span className="nart__logo" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon.svg" alt="" width={40} height={40} />
              </span>
              <span className="nart__meta">
                <b>{a.authorName}</b>
                <span>
                  <time dateTime={a.date.toISOString()}>{fmtArticleDate(a.date, tr)}</time>
                  {' · '}
                  {tr('{readMinutes} min čítania', { readMinutes: a.readMinutes })}
                </span>
              </span>
              <Share url={url} title={a.title} />
            </div>
          </header>

          {cover ? (
            <figure className="nart__hero">
              <CloudImage photo={{ ...cover, alt: a.cover?.alt || '' }} sizes="(max-width: 1000px) 100vw, 820px" priority className="nart__hero-img" />
              {a.cover?.caption ? <figcaption>{a.cover.caption}</figcaption> : null}
            </figure>
          ) : null}

          <div className="nart__body">
            <ArticleBody slug={a.slug} blocks={a.blocks} title={a.title} />
            {a.tags.length ? (
              <ul className="nart__tags" aria-label={tr('Štítky')}>
                {a.tags.map((t) => (
                  <li key={t}>#{t}</li>
                ))}
              </ul>
            ) : null}
            <p className="nart__upd">{tr('Aktualizované {fmtShortDate}', { fmtShortDate: fmtShortDate(a.updatedAt, tr) })}</p>
          </div>
        </article>

        <aside className="nart__rail" aria-label={tr('Najnovšie aktuality')}>
          {rail.length ? (
            <section className="nart__box">
              <h2 className="nart__boxh">{tr('Najnovšie')}</h2>
              <ul className="nart__list">
                {rail.map((c) => {
                  const img = c.cover ? articleImage(c.cover, '4:3') : null;
                  return (
                    <li key={c.id}>
                      <Link href={`/aktuality/${c.slug}`} className="nart__item">
                        <span className="nart__thumb">{img ? <CloudImage photo={{ ...img, alt: '' }} sizes="96px" /> : <span className="nart__noimg" aria-hidden="true" />}</span>
                        <span className="nart__it">
                          <b>{c.title}</b>
                          <time dateTime={c.date.toISOString()}>{fmtShortDate(c.date, tr)}</time>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <Link href="/aktuality" className="nart__all">
                {tr('Všetky aktuality')} <span aria-hidden="true">→</span>
              </Link>
            </section>
          ) : null}
          <section className="nart__promo">
            <span className="nart__promo-k">{tr('Ľad na prenájom')}</span>
            <b className="disp">{tr('Tvoj ľad. Tvoj čas.')}</b>
            <span>{tr('Celá plocha pre tvoj tím, šatňa v cene. Rezervácia online za minútu.')}</span>
            <Link href="/rezervacia" className="sbtn sbtn--block">
              {tr('Rezervovať ľad')}
            </Link>
          </section>
        </aside>
      </div>

      {related.length ? (
        <section className="nart__rel nw-lite" aria-labelledby="ar-rel">
          <div className="wrap">
            <div className="shd">
              <h2 id="ar-rel" className="disp shd__t">
                {tr('Ďalšie aktuality')}
              </h2>
              <span className="shd__line" aria-hidden="true" />
              <Link href="/aktuality" className="shd__more">
                {tr('Všetky aktuality')}
              </Link>
            </div>
            <div className="nw__grid nart__relgrid">
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
