import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleCard, CoverImg, VideoBadge } from '@/components/articles/ArticleCard';
import { CATEGORIES, isCategory, categoryLabel } from '@/lib/articles/blocks';
import { fmtArticleDate, listArticles } from '@/lib/articles/queries';
import { getT } from '@/lib/i18n/server';

type Props = { searchParams: Promise<{ kategoria?: string; strana?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const t = await getT();
  const sp = await searchParams;
  const cat = sp.kategoria && isCategory(sp.kategoria) ? sp.kategoria : null;
  const page = Math.max(1, Number.parseInt(sp.strana ?? '1', 10) || 1);
  return {
    title: cat ? t('Aktuality – {categoryLabel}', { categoryLabel: t(categoryLabel(cat)) }) : t('Aktuality'),
    description: t('Novinky z I-SPORT COMPLEX Košice: turnaje a zápasy, kempy a nábor detí, oznamy a zmeny otváracích hodín.'),
    alternates: { canonical: `/aktuality${cat ? `?kategoria=${cat}` : ''}`, types: { 'application/rss+xml': '/aktuality/rss.xml' } },
    robots: page > 1 ? { index: false, follow: true } : undefined,
  };
}

const href = (cat: string | null, page = 1) => {
  const q = new URLSearchParams();
  if (cat) q.set('kategoria', cat);
  if (page > 1) q.set('strana', String(page));
  const s = q.toString();
  return `/aktuality${s ? `?${s}` : ''}`;
};

export default async function NewsPage({ searchParams }: Props) {
  const t = await getT();
  const sp = await searchParams;
  const cat = sp.kategoria && isCategory(sp.kategoria) ? sp.kategoria : null;
  const page = Math.max(1, Math.min(500, Number.parseInt(sp.strana ?? '1', 10) || 1));
  let data: Awaited<ReturnType<typeof listArticles>>;
  try {
    data = await listArticles(cat, page);
  } catch {
    data = { total: 0, pages: 1, items: [] };
  }
  const [feat, ...rest] = page === 1 ? data.items : [null, ...data.items];

  return (
    <div className="nw">
      <div className="nw__band">
        <div className="wrap nw__band-in">
          <h1 className="cond nw__h1">{t('Aktuality')}</h1>
          <p>{t('Novinky z haly, turnaje, kempy, nábor detí a zmeny otváracích hodín.')}</p>
        </div>
      </div>
      <div className="wrap nw__in">
        <nav className="nw__chips" aria-label={t('Kategórie aktualít')}>
          <Link href={href(null)} aria-current={cat === null ? 'page' : undefined}>
            {t('Všetko')}
          </Link>
          {CATEGORIES.map((c) => (
            <Link key={c.key} href={href(c.key)} aria-current={cat === c.key ? 'page' : undefined}>
              {t(c.label)}
            </Link>
          ))}
        </nav>

        {data.items.length === 0 ? (
          <div className="nw__empty">
            <h2 className="cond">{t('Zatiaľ tu nič nie je')}</h2>
            <p>{cat ? t('V tejto kategórii ešte nie sú žiadne články.') : t('Prvé aktuality pribudnú čoskoro.')}</p>
            {cat ? (
              <Link href="/aktuality" className="ulink">
                {t('Všetky aktuality')}
              </Link>
            ) : null}
          </div>
        ) : null}

        {feat ? (
          <article className="nw__feat">
            <Link href={`/aktuality/${feat.slug}`} className="nw__feat-link">
              <span className="nw__feat-img">
                <CoverImg a={feat} ratio="4:3" sizes="(max-width: 900px) 100vw, 700px" priority />
                <VideoBadge seconds={feat.videoSeconds} />
              </span>
              <span className="nw__feat-tx">
                <span className="ac__cat">{t(feat.categoryLabel)}</span>
                <span className="ac__meta">
                  <time dateTime={feat.date.toISOString()}>{fmtArticleDate(feat.date, t)}</time> {' '}{t('· {readMinutes} min čítania', { readMinutes: feat.readMinutes })} 
                </span>
                <h2 className="cond nw__feat-t">{feat.title}</h2>
                {feat.perex ? <span className="nw__feat-p">{feat.perex}</span> : null}
                <span className="nw__more">
                  {t('Čítať článok')}{' '}<span aria-hidden="true">→</span>
                </span>
              </span>
            </Link>
          </article>
        ) : null}

        {rest.length ? (
          <div className="nw__grid">
            <h2 className="sr-only">{page === 1 ? t('Ďalšie články') : t('Články – strana {page}', { page })}</h2>
            {rest.map((a) => (a ? <ArticleCard key={a.id} a={a} /> : null))}
          </div>
        ) : null}

        {data.pages > 1 ? (
          <nav className="nw__pg" aria-label={t('Stránkovanie')}>
            {page > 1 ? (
              <Link href={href(cat, page - 1)} aria-label={t('Predchádzajúca strana')}>
                ←
              </Link>
            ) : null}
            {Array.from({ length: data.pages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === data.pages || Math.abs(p - page) <= 2)
              .map((p, i, arr) => (
                <span key={p} className="nw__pg-g">
                  {i > 0 && p - arr[i - 1] > 1 ? <span aria-hidden="true">…</span> : null}
                  <Link href={href(cat, p)} aria-current={p === page ? 'page' : undefined} aria-label={t('Strana {p}', { p })}>
                    {p}
                  </Link>
                </span>
              ))}
            {page < data.pages ? (
              <Link href={href(cat, page + 1)} aria-label={t('Ďalšia strana')}>
                →
              </Link>
            ) : null}
          </nav>
        ) : null}
        <p className="nw__rss">
          <a href="/aktuality/rss.xml">{t('RSS kanál aktualít')}</a>
        </p>
      </div>
    </div>
  );
}
