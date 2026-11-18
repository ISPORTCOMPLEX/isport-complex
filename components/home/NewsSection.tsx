import Link from 'next/link';
import { CoverImg } from '@/components/articles/ArticleCard';
import { CATEGORIES } from '@/lib/articles/blocks';
import { fmtArticleDate, fmtDuration, type ArticleCard } from '@/lib/articles/queries';
import { getT } from '@/lib/i18n/server';
import type { T } from '@/lib/i18n/translate';

const meta = (a: ArticleCard, t: T) => (a.videoSeconds !== null ? `${t('video')}${a.videoSeconds ? ` ${fmtDuration(a.videoSeconds)}` : ''}` : t.n(a.readMinutes, '{n} minúta čítania|{n} minúty čítania|{n} minút čítania'));
// farebné štítky kategórií ako na športových weboch (červená, modrá, žltá, tmavá)
const tone = (a: ArticleCard) => (a.pinned ? 'red' : ({ novinky: 'red', turnaje: 'blue', kempy: 'yellow', oznamy: 'ink' } as Record<string, string>)[a.category] ?? 'red');

async function Chip({ a }: { a: ArticleCard }) {
  const t = await getT();
  return <span className={`cat cat--${tone(a)}`}>{a.pinned ? t('Dôležité') : t(a.categoryLabel)}</span>;
}

// Úvod: NOVINKY ako titulka športového webu – hlavný článok (fotka, titulok, perex), vedľa zoznam najnovších
// s náhľadmi, pod nimi rad štyroch kariet s fotkou. Čitateľné titulky (bez zúženého písma), čisté biele pozadie.
export async function NewsSection({ items }: { items: ArticleCard[] }) {
  const t = await getT();
  const [lead, ...rest] = items;
  const side = rest.slice(0, 3);
  const row = rest.slice(3, 7);
  return (
    <section className="lite lite--white nw4" aria-labelledby="nw4-t">
      <div className="wrap">
        <div className="shd">
          <h2 id="nw4-t" className="disp shd__t">
            {t('Novinky')}
          </h2>
          <span className="shd__line" aria-hidden="true" />
          {lead ? (
            <Link href="/aktuality" className="shd__more">
              {t('Všetky články')}
            </Link>
          ) : null}
        </div>
        {lead ? (
          <nav className="nw4__cats" aria-label={t('Kategórie noviniek')}>
            {CATEGORIES.map((c) => (
              <Link key={c.key} href={`/aktuality?kategoria=${c.key}`}>
                {t(c.label)}
              </Link>
            ))}
          </nav>
        ) : null}
        {lead ? (
          <>
            <div className={`nw4__top${side.length ? '' : ' is-solo'}`}>
              <Link href={`/aktuality/${lead.slug}`} className="nw4__lead">
                <span className="nw4__lim">
                  <CoverImg a={lead} ratio="16:9" sizes="(max-width: 1000px) 100vw, 820px" className="nw4__img" />
                </span>
                <span className="nw4__ltx">
                  <Chip a={lead} />
                  <span className="nw4__lt">{lead.title}</span>
                  {lead.perex ? <span className="nw4__lp">{lead.perex}</span> : null}
                  <span className="nw4__meta">
                    <time dateTime={lead.date.toISOString()}>{fmtArticleDate(lead.date, t)}</time> · {meta(lead, t)}
                  </span>
                </span>
              </Link>
              {side.length ? (
                <div className="nw4__side">
                  <h3 className="nw4__sh">{t('Najnovšie')}</h3>
                  <ul className="nw4__list">
                    {side.map((a) => (
                      <li key={a.id}>
                        <Link href={`/aktuality/${a.slug}`} className="nw4__it">
                          <span className="nw4__tim">
                            <CoverImg a={a} ratio="4:3" sizes="128px" className="nw4__img" />
                          </span>
                          <span className="nw4__itx">
                            <span className={`nw4__k is-${tone(a)}`}>{a.videoSeconds !== null ? t('Video') : a.pinned ? t('Dôležité') : t(a.categoryLabel)}</span>
                            <span className="nw4__tt">{a.title}</span>
                            <time className="nw4__meta" dateTime={a.date.toISOString()}>
                              {fmtArticleDate(a.date, t)}
                            </time>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            {row.length ? (
              <ul className="nw4__row">
                {row.map((a) => (
                  <li key={a.id}>
                    <Link href={`/aktuality/${a.slug}`} className="nw4__card">
                      <span className="nw4__cim">
                        <CoverImg a={a} ratio="16:9" sizes="(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 300px" className="nw4__img" />
                      </span>
                      <span className={`nw4__k is-${tone(a)}`}>{a.videoSeconds !== null ? t('Video') : a.pinned ? t('Dôležité') : t(a.categoryLabel)}</span>
                      <span className="nw4__tt">{a.title}</span>
                      <time className="nw4__meta" dateTime={a.date.toISOString()}>
                        {fmtArticleDate(a.date, t)}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <p className="nw4__empty">{t('Prvé články pribudnú čoskoro.')}</p>
        )}
      </div>
    </section>
  );
}
