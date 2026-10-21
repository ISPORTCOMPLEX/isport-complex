import Link from 'next/link';
import { CloudImage } from '@/components/CloudImage';
import { CoverImg } from '@/components/articles/ArticleCard';
import { fmtArticleDate, fmtDuration, fmtShortDate, type ArticleCard } from '@/lib/articles/queries';
import type { WebPhoto } from '@/lib/media';
import type { IceToday } from '@/lib/booking/iceToday';

export type NewsFallback = { ice: IceToday; photos: { lad: WebPhoto | null; cennik: WebPhoto | null; kluby: WebPhoto | null; skyboxy: WebPhoto | null } };

const eur = (v: number) => `${v.toLocaleString('sk-SK')} €`;

function Img({ p, sizes, className, priority }: { p: WebPhoto | null; sizes: string; className?: string; priority?: boolean }) {
  return p ? <CloudImage photo={{ ...p, alt: '' }} sizes={sizes} className={className} priority={priority} /> : <span className={`mm__noimg ${className ?? ''}`} aria-hidden="true" />;
}

function Side({ href, img, cat, title, small, video }: { href: string; img: React.ReactNode; cat: string; title: string; small: React.ReactNode; video?: number | null }) {
  return (
    <article className="hn__sm">
      <Link href={href} className="hn__sm-link">
        <span className="hn__sm-img">
          {img}
          {video !== undefined && video !== null ? (
            <span className="hn__v">
              <i aria-hidden="true">
                <svg width="8" height="8" viewBox="0 0 24 24">
                  <path d="M7 4v16l13-8z" fill="currentColor" />
                </svg>
              </i>
              {video ? fmtDuration(video) : 'Video'}
            </span>
          ) : null}
        </span>
        <span className="hn__sm-tx">
          <span className="hn__cat">{cat}</span>
          <h3 className="hn__sm-t">{title}</h3>
          <small>{small}</small>
        </span>
      </Link>
    </article>
  );
}

// Úvod webu: NOVINKY vždy navrchu. S článkami: hlavný veľký + ďalšie tri.
// Kým nie je zverejnený žiadny článok, ukáže sa to najdôležitejšie z haly (skutočné údaje, nič vymyslené).
export function NewsSection({ items, fallback }: { items: ArticleCard[]; fallback: NewsFallback }) {
  const has = items.length > 0;
  const [big, ...rest] = items;
  const side = rest.slice(0, 3);
  const { ice, photos } = fallback;

  return (
    <section className="hn" aria-labelledby="hn-t">
      <div className="wrap">
        <div className="hn__head">
          <h2 id="hn-t" className="cond hn__title">
            Novinky
          </h2>
          <p className="hn__intro">
            {has ? 'Turnaje, nábor, kempy a všetko, čo sa deje v hale.' : 'Prvé články pribudnú čoskoro. Dovtedy tu je to najdôležitejšie z haly.'}
            {has ? (
              <Link href="/aktuality">
                Všetky aktuality <span aria-hidden="true">→</span>
              </Link>
            ) : null}
          </p>
        </div>
        <div className="hn__grid">
          {has ? (
            <article className="hn__big">
              <Link href={`/aktuality/${big.slug}`} className="hn__big-link">
                <CoverImg a={big} ratio="16:10" sizes="(max-width: 1000px) 100vw, 800px" priority className="hn__big-img" />
                <span className="hn__ov" aria-hidden="true" />
                <span className="hn__tx">
                  <span className="hn__tag">{big.pinned ? 'Dôležité' : big.categoryLabel}</span>
                  <span className="hn__meta">
                    <time dateTime={big.date.toISOString()}>{fmtArticleDate(big.date)}</time> · {big.videoSeconds !== null ? `video${big.videoSeconds ? ` ${fmtDuration(big.videoSeconds)}` : ''}` : `${big.readMinutes} min čítania`}
                  </span>
                  <h3 className="cond hn__big-t">{big.title}</h3>
                  {big.perex ? <span className="hn__perex">{big.perex}</span> : null}
                  <span className="hn__read">
                    Čítať článok <span aria-hidden="true">→</span>
                  </span>
                </span>
              </Link>
            </article>
          ) : (
            <article className="hn__big">
              <Link href="/rezervacia" className="hn__big-link">
                <Img p={photos.lad} sizes="(max-width: 1000px) 100vw, 800px" priority className="hn__big-img" />
                <span className="hn__ov" aria-hidden="true" />
                <span className="hn__tx">
                  <span className="hn__tag">{ice.day === 'zajtra' ? 'Ľad zajtra' : 'Ľad dnes'}</span>
                  <span className="hn__meta">{ice.hours.length ? `Voľné ${ice.hours.slice(0, 4).join(' · ')}${ice.hours.length > 4 ? ' a ďalšie' : ''}` : 'Voľné časy nájdeš v rezervácii'}</span>
                  <h3 className="cond hn__big-t">Ľad na prenájom v Košiciach</h3>
                  <span className="hn__perex">Celá tréningová plocha pre kluby, školy, firmy aj partie. Voľné hodiny vidíš hneď, potvrdenie s QR kódom máš v telefóne.</span>
                  <span className="hn__read">
                    Rezervovať ľad <span aria-hidden="true">→</span>
                  </span>
                </span>
              </Link>
            </article>
          )}

          <div className="hn__side">
            {has
              ? side.map((a) => (
                  <Side
                    key={a.id}
                    href={`/aktuality/${a.slug}`}
                    img={<CoverImg a={a} ratio="4:3" sizes="170px" />}
                    cat={a.categoryLabel}
                    title={a.title}
                    video={a.videoSeconds}
                    small={
                      <>
                        <time dateTime={a.date.toISOString()}>{fmtShortDate(a.date)}</time> · {a.videoSeconds !== null ? 'video' : `${a.readMinutes} min`}
                      </>
                    }
                  />
                ))
              : null}
            {!has ? (
              <>
                <Side href="/cennik" img={<Img p={photos.cennik} sizes="170px" />} cat="Cenník" title={`Mimo špičky ${eur(ice.offPeak)}, špička a víkend ${eur(ice.peak)} za hodinu`} small={<>Ceny a pravidlá →</>} />
                <Side href="/pre-kluby" img={<Img p={photos.kluby} sizes="170px" />} cat="Pre kluby" title="Sezónny prenájom s pevnými časmi a faktúrou" small={<>Poslať dopyt →</>} />
                <Side href="/bufet-skyboxy" img={<Img p={photos.skyboxy} sizes="170px" />} cat="Skyboxy a bufet" title="Sledujte tréning v teple nad ľadovou plochou" small={<>Viac o komplexe →</>} />
              </>
            ) : null}
            <Link href={has ? '/aktuality' : '/fotky'} className="hn__all">
              {has ? 'Všetky aktuality' : 'Pozrieť fotky haly'} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LiveStrip({ ice }: { ice: IceToday }) {
  return (
    <div className="hl">
      <div className="wrap hl__in">
        <i aria-hidden="true" />
        <span>
          {ice.hours.length ? (
            <>
              <b>{ice.day === 'zajtra' ? 'Dnes plno. Ľad zajtra:' : 'Ľad dnes:'}</b> voľné {ice.hours.slice(0, 3).join(', ')}
              {ice.hours.length > 3 ? ' a ďalšie' : ''}
            </>
          ) : (
            <>
              <b>Ľad:</b> najbližšie voľné časy nájdeš v rezervácii
            </>
          )}
        </span>
        <Link href="/rezervacia" className="hl__go">
          Rezervovať <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
