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

// Úvod: NOVINKY ako titulka NHL.com – veľký hlavný článok s titulkom na fotke, pod ním tri karty
// a vedľa textový zoznam „Hlavné správy“. Pri malom počte článkov ide všetko do zoznamu.
export async function NewsSection({ items }: { items: ArticleCard[] }) {
  const t = await getT();
  const [lead, ...rest] = items;
  const cards = rest.length >= 4 ? rest.slice(0, 3) : [];
  const list = rest.length >= 4 ? rest.slice(3, 11) : rest;
  return (
    <section className="lite nw5" aria-labelledby="nw5-t">
      <div className="wrap">
        <div className="shd">
          <h2 id="nw5-t" className="disp shd__t">
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
          <div className={`nw5__box${list.length ? '' : ' is-solo'}`}>
            <div className="nw5__main">
              <Link href={`/aktuality/${lead.slug}`} className="nw5__lead">
                <CoverImg a={lead} ratio="16:9" sizes="(max-width: 1000px) 100vw, 860px" className="nw5__img" />
                <span className="nw5__ov" aria-hidden="true" />
                <span className="nw5__ltx">
                  <Chip a={lead} />
                  <span className="nw5__lt">{lead.title}</span>
                  {lead.perex ? <span className="nw5__lp">{lead.perex}</span> : null}
                </span>
              </Link>
              {cards.length ? (
                <ul className="nw5__cards">
                  {cards.map((a) => (
                    <li key={a.id}>
                      <Link href={`/aktuality/${a.slug}`} className="nw5__card">
                        <span className="nw5__cim">
                          <CoverImg a={a} ratio="16:10" sizes="(max-width: 700px) 100vw, 290px" className="nw5__img" />
                        </span>
                        <span className="nw5__ct">{a.title}</span>
                        <span className="nw5__meta">
                          <span className={`nw5__k is-${tone(a)}`}>{a.videoSeconds !== null ? t('Video') : a.pinned ? t('Dôležité') : t(a.categoryLabel)}</span>
                          {' · '}
                          <time dateTime={a.date.toISOString()}>{fmtArticleDate(a.date, t)}</time>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            {list.length ? (
              <aside className="nw5__side" aria-labelledby="nw5-h">
                <h3 id="nw5-h" className="nw5__sh">
                  {t('Hlavné správy')}
                </h3>
                <ul className="nw5__list">
                  {list.map((a) => (
                    <li key={a.id}>
                      <Link href={`/aktuality/${a.slug}`}>
                        {a.videoSeconds !== null ? (
                          <span className="nw5__vid" aria-label={t('Video')}>
                            ▶
                          </span>
                        ) : null}
                        {a.title}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href="/aktuality" className="nw5__all">
                  {t('Všetky aktuality')} <span aria-hidden="true">→</span>
                </Link>
              </aside>
            ) : null}
          </div>
        ) : (
          <p className="nw5__empty">{t('Prvé články pribudnú čoskoro.')}</p>
        )}
      </div>
    </section>
  );
}
