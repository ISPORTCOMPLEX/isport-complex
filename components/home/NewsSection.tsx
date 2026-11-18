import Link from 'next/link';
import { CoverImg } from '@/components/articles/ArticleCard';
import { CATEGORIES } from '@/lib/articles/blocks';
import { fmtArticleDate, fmtDuration, type ArticleCard } from '@/lib/articles/queries';

const meta = (a: ArticleCard) => (a.videoSeconds !== null ? `video${a.videoSeconds ? ` ${fmtDuration(a.videoSeconds)}` : ''}` : `${a.readMinutes} ${a.readMinutes === 1 ? 'minúta' : a.readMinutes <= 4 ? 'minúty' : 'minút'} čítania`);
// farebné štítky kategórií ako na športových weboch (červená, modrá, žltá, tmavá)
const tone = (a: ArticleCard) => (a.pinned ? 'red' : ({ novinky: 'red', turnaje: 'blue', kempy: 'yellow', oznamy: 'ink' } as Record<string, string>)[a.category] ?? 'red');

function Chip({ a }: { a: ArticleCard }) {
  return <span className={`cat cat--${tone(a)}`}>{a.pinned ? 'Dôležité' : a.categoryLabel}</span>;
}

// Úvod: NOVINKY ako redakčná titulka – hlavný článok, vedľa dva s fotkou, pod nimi rad štyroch krátkych.
export function NewsSection({ items }: { items: ArticleCard[] }) {
  const [lead, ...rest] = items;
  const tiles = rest.slice(0, 2);
  const small = rest.slice(2, 6);
  return (
    <section className="lite lite--white nw3" aria-labelledby="nw3-t">
      <div className="wrap">
        <div className="shd">
          <h2 id="nw3-t" className="disp shd__t">
            Novinky
          </h2>
          {lead ? (
            <nav className="nw3__cats" aria-label="Kategórie noviniek">
              <Link href="/aktuality" className="is-on">
                Všetko
              </Link>
              {CATEGORIES.map((c) => (
                <Link key={c.key} href={`/aktuality?kategoria=${c.key}`}>
                  {c.label}
                </Link>
              ))}
            </nav>
          ) : null}
          <span className="shd__line" aria-hidden="true" />
          {lead ? (
            <Link href="/aktuality" className="shd__more">
              Všetky články
            </Link>
          ) : null}
        </div>
        {lead ? (
          <>
            <div className={`nw3__top${tiles.length ? '' : ' is-solo'}`}>
              <Link href={`/aktuality/${lead.slug}`} className="nw3__lead">
                <CoverImg a={lead} ratio="16:10" sizes="(max-width: 900px) 100vw, 760px" className="nw3__img" />
                <span className="nw3__ov" aria-hidden="true" />
                <span className="nw3__ltx">
                  <Chip a={lead} />
                  <span className="disp nw3__lt">{lead.title}</span>
                  <span className="nw3__meta">
                    <time dateTime={lead.date.toISOString()}>{fmtArticleDate(lead.date)}</time>, {meta(lead)}
                  </span>
                </span>
              </Link>
              {tiles.length ? (
                <div className="nw3__tiles">
                  {tiles.map((a) => (
                    <Link key={a.id} href={`/aktuality/${a.slug}`} className="nw3__tile">
                      <span className="nw3__tim">
                        <CoverImg a={a} ratio="4:3" sizes="(max-width: 900px) 40vw, 200px" className="nw3__img" />
                      </span>
                      <span className="nw3__ttx">
                        <Chip a={a} />
                        <span className="disp nw3__tt">{a.title}</span>
                        <time className="nw3__meta" dateTime={a.date.toISOString()}>
                          {fmtArticleDate(a.date)}
                        </time>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
            {small.length ? (
              <ul className="nw3__row">
                {small.map((a) => (
                  <li key={a.id}>
                    <Link href={`/aktuality/${a.slug}`} className="nw3__sm">
                      <span className={`nw3__k is-${tone(a)}`}>{a.videoSeconds !== null ? 'Video' : a.pinned ? 'Dôležité' : a.categoryLabel}</span>
                      <span className="disp nw3__st">{a.title}</span>
                      <time className="nw3__meta" dateTime={a.date.toISOString()}>
                        {fmtArticleDate(a.date)}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <p className="nw3__empty">Prvé články pribudnú čoskoro.</p>
        )}
      </div>
    </section>
  );
}
