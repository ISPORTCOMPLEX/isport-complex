import Link from 'next/link';
import { CoverImg } from '@/components/articles/ArticleCard';
import { fmtArticleDate, fmtDuration, fmtShortDate, type ArticleCard } from '@/lib/articles/queries';

function Arrow({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="#E30613" strokeWidth="3" />
    </svg>
  );
}

const meta = (a: ArticleCard) => (a.videoSeconds !== null ? `video${a.videoSeconds ? ` ${fmtDuration(a.videoSeconds)}` : ''}` : `${a.readMinutes} min čítania`);

// Úvod: NOVINKY – veľký článok vľavo, vpravo zoznam ďalších troch s obrysovými číslami 02–04.
export function NewsSection({ items }: { items: ArticleCard[] }) {
  const [big, ...rest] = items;
  const side = rest.slice(0, 3);
  return (
    <section className="wrap nw2" aria-labelledby="nw2-t">
      <div className="sec-head">
        <div className="sec-head__l">
          <h2 id="nw2-t" className="disp sec-title">
            Novinky
          </h2>
        </div>
        {big ? (
          <Link href="/aktuality" className="more-link">
            Všetky články
            <Arrow />
          </Link>
        ) : null}
      </div>
      {big ? (
        <div className={`nw2__grid${side.length ? '' : ' is-solo'}`}>
          <Link href={`/aktuality/${big.slug}`} className="nw2__big">
            <CoverImg a={big} ratio="16:10" sizes="(max-width: 900px) 100vw, 800px" className="nw2__img" />
            <span className="nw2__ov" aria-hidden="true" />
            <span className="nw2__tx">
              <span className="tag-red">{big.pinned ? 'Dôležité' : big.categoryLabel}</span>
              <span className="disp nw2__t">{big.title}</span>
              <span className="nw2__meta">
                <time dateTime={big.date.toISOString()}>{fmtArticleDate(big.date)}</time> · {meta(big)}
              </span>
            </span>
          </Link>
          {side.length ? (
            <ol className="nw2__list">
              {side.map((a, i) => (
                <li key={a.id}>
                  <Link href={`/aktuality/${a.slug}`} className="nw2__row">
                    <span className="nw2__rtx">
                      <span className={`nw2__k${i === 0 ? ' is-red' : ''}`}>
                        {a.videoSeconds !== null ? 'Video' : a.categoryLabel} · <time dateTime={a.date.toISOString()}>{fmtShortDate(a.date)}</time>
                      </span>
                      <span className="disp nw2__rt">{a.title}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : (
        <p className="nw2__empty">Prvé články pribudnú čoskoro.</p>
      )}
    </section>
  );
}
