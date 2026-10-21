import Link from 'next/link';
import { CloudImage } from '@/components/CloudImage';
import { articleImage, fmtDuration, fmtShortDate, type ArticleCard as Card } from '@/lib/articles/queries';

export function VideoBadge({ seconds }: { seconds: number | null }) {
  if (seconds === null) return null;
  return (
    <span className="ac__vid">
      <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 4v16l13-8z" fill="currentColor" />
      </svg>
      Video{seconds > 0 ? ` ${fmtDuration(seconds)}` : ''}
    </span>
  );
}

export function CoverImg({ a, ratio, sizes, priority, className }: { a: Card; ratio: string; sizes: string; priority?: boolean; className?: string }) {
  const p = a.cover ? articleImage(a.cover, ratio) : null;
  if (p) return <CloudImage photo={{ ...p, alt: a.cover?.alt || '' }} sizes={sizes} priority={priority} className={className} />;
  return (
    <span className={`ac__noimg ${className ?? ''}`} aria-hidden="true">
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M10 32h44M32 10v44" stroke="currentColor" strokeWidth="2" />
      </svg>
    </span>
  );
}

// Karta článku v mriežke
export function ArticleCard({ a }: { a: Card }) {
  return (
    <article className="ac">
      <Link href={`/aktuality/${a.slug}`} className="ac__link">
        <span className="ac__img">
          <CoverImg a={a} ratio="16:10" sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 400px" />
          <VideoBadge seconds={a.videoSeconds} />
        </span>
        <span className="ac__body">
          <span className="ac__cat">{a.categoryLabel}</span>
          <h3 className="ac__title">{a.title}</h3>
          {a.perex ? <span className="ac__perex">{a.perex}</span> : null}
          <span className="ac__meta">
            <time dateTime={a.date.toISOString()}>{fmtShortDate(a.date)}</time> · {a.readMinutes} min čítania
          </span>
        </span>
      </Link>
    </article>
  );
}
