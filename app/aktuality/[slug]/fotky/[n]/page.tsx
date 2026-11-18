import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ViewerKeys } from '@/components/photos/ViewerKeys';
import { galleryImages } from '@/lib/articles/blocks';
import { articleImage } from '@/lib/articles/queries';
import { loadArticle } from '@/lib/articles/view';
import { getT } from '@/lib/i18n/server';

// Prehliadač fotiek z článku – rovnaký ako /fotky/<id>, každá fotka má vlastnú adresu.
type Props = { params: Promise<{ slug: string; n: string }>; searchParams: Promise<{ nahlad?: string }> };

async function load(slug: string, nRaw: string, nahlad?: string) {
  const r = await loadArticle(slug, nahlad === '1');
  if (!r) return null;
  const list = galleryImages(r.a.blocks);
  const n = Number.parseInt(nRaw, 10);
  if (!/^\d{1,3}$/.test(nRaw) || n < 1 || n > list.length) return null;
  const photo = articleImage(list[n - 1]);
  if (!photo) return null;
  return { ...r, list, n, photo, alt: list[n - 1].alt };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const t = await getT();
  const { slug, n } = await params;
  const r = await load(slug, n, (await searchParams).nahlad);
  if (!r) return { title: t('Fotka') };
  return { title: t('{title} – fotka {n} z {length}', { title: r.a.title, n: r.n, length: r.list.length }), description: r.alt || r.a.perex, robots: { index: false, follow: true } };
}

export default async function ArticlePhoto({ params, searchParams }: Props) {
  const t = await getT();
  const { slug, n: nRaw } = await params;
  const nahlad = (await searchParams).nahlad;
  const r = await load(slug, nRaw, nahlad);
  if (!r) notFound();
  const { a, list, n, photo, alt } = r;
  const total = list.length;
  const q = r.preview ? '?nahlad=1' : '';
  const at = (i: number) => `/aktuality/${a.slug}/fotky/${((i - 1 + total) % total) + 1}${q}`;
  const prev = at(n - 1);
  const next = at(n + 1);
  const close = `/aktuality/${a.slug}${q}`;
  const near = total > 1 ? [list[n % total], list[(n - 2 + total) % total]].map((i) => articleImage(i)).filter((p) => p !== null).map((p) => ({ src: p.src, srcSet: p.srcSet })) : [];

  return (
    <div className="pv">
      <div className="pv__top">
        <Link href={close} className="pv__btn" aria-label={t('Zavrieť a vrátiť sa na článok')}>
          <span className="pv__ic">
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </span>
          <span>{t('Späť na článok')}</span>
        </Link>
        <span className="pv__count" aria-live="polite">
          <b>{n}</b> {' '}{t('z {total}', { total })}
        
        </span>
        <span />
      </div>
      <div className="pv__stage">
        <picture className="ph" key={photo.id}>
          <source type="image/avif" srcSet={photo.avif} sizes="100vw" />
          <source type="image/webp" srcSet={photo.webp} sizes="100vw" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.src} srcSet={photo.srcSet} sizes="100vw" alt={alt || t('Fotka {n} z článku {title}', { n, title: a.title })} width={photo.width} height={photo.height} loading="eager" fetchPriority="high" decoding="async" draggable={false} className="pv__img" />
        </picture>
        {total > 1 ? (
          <>
            <Link href={prev} replace scroll={false} className="pv__nav pv__nav--prev" aria-label={t('Predchádzajúca fotka')}>
              <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link href={next} replace scroll={false} className="pv__nav pv__nav--next" aria-label={t('Ďalšia fotka')}>
              <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </>
        ) : null}
      </div>
      <div className="pv__bottom">
        <div className="pv__cap">
          <h1>{alt || a.title}</h1>
          <p>
            <Link href={close}>{a.title}</Link> · {a.categoryLabel}
          </p>
        </div>
        {total > 1 ? (
          <>
            <div className="pv__hints" aria-hidden="true">
              <span className="pv__hint">{t('← → šípky na klávesnici')}</span>
              <span className="pv__hint">{t('Esc zavrie')}</span>
            </div>
            <div className="pv__mnav">
              <Link href={prev} replace scroll={false} className="pv__nav" aria-label={t('Predchádzajúca fotka')}>
                <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <small>{t('alebo potiahni prstom')}</small>
              <Link href={next} replace scroll={false} className="pv__nav pv__nav--next" aria-label={t('Ďalšia fotka')}>
                <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </>
        ) : null}
      </div>
      <ViewerKeys prev={prev} next={next} close={close} preload={near} />
    </div>
  );
}
