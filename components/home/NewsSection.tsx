import Link from 'next/link';
import { CoverImg, VideoBadge } from '@/components/articles/ArticleCard';
import { fmtArticleDate, fmtDuration, fmtShortDate, type ArticleCard } from '@/lib/articles/queries';

// Úvod webu: pripnutý (alebo najnovší) článok veľký + ďalšie tri vedľa.
export function NewsSection({ items }: { items: ArticleCard[] }) {
  const [big, ...rest] = items;
  const side = rest.slice(0, 3);
  return (
    <section className="hn" aria-labelledby="hn-t">
      <div className="wrap">
        <div className="hn__head">
          <h2 id="hn-t" className="cond hn__title">
            Novinky
          </h2>
          <Link href="/aktuality" className="hn__all-top">
            Všetky aktuality <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className={`hn__grid${side.length ? '' : ' hn__grid--solo'}`}>
          <article className="hn__big">
            <Link href={`/aktuality/${big.slug}`} className="hn__big-link">
              <CoverImg a={big} ratio="16:10" sizes="(max-width: 900px) 100vw, 800px" priority className="hn__big-img" />
              <span className="hn__ov" aria-hidden="true" />
              <VideoBadge seconds={big.videoSeconds} />
              <span className="hn__tx">
                <span className="hn__tag">{big.pinned ? 'Dôležité' : big.categoryLabel}</span>
                <span className="hn__meta">
                  <time dateTime={big.date.toISOString()}>{fmtArticleDate(big.date)}</time> · {big.readMinutes} min čítania
                </span>
                <h3 className="cond hn__big-t">{big.title}</h3>
                {big.perex ? <span className="hn__perex">{big.perex}</span> : null}
              </span>
            </Link>
          </article>
          {side.length ? (
            <div className="hn__side">
              {side.map((a) => (
                <article key={a.id} className="hn__sm">
                  <Link href={`/aktuality/${a.slug}`} className="hn__sm-link">
                    <span className="hn__sm-img">
                      <CoverImg a={a} ratio="4:3" sizes="160px" />
                    </span>
                    <span className="hn__sm-tx">
                      <span className="hn__cat">{a.categoryLabel}</span>
                      <h3 className="hn__sm-t">{a.title}</h3>
                      <small>
                        <time dateTime={a.date.toISOString()}>{fmtShortDate(a.date)}</time>
                        {a.videoSeconds !== null ? ` · video${a.videoSeconds ? ` ${fmtDuration(a.videoSeconds)}` : ''}` : ''}
                      </small>
                    </span>
                  </Link>
                </article>
              ))}
              <Link href="/aktuality" className="hn__all">
                Všetky aktuality
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function LiveStrip({ text }: { text: string }) {
  return (
    <div className="hl">
      <div className="wrap hl__in">
        <i aria-hidden="true" />
        <span>{text}</span>
        <Link href="/rezervacia" className="hl__go">
          Rezervovať <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
