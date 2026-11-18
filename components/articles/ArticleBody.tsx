import Link from 'next/link';
import { CloudImage } from '@/components/CloudImage';
import { sanitizeInline, xHandle, type Block } from '@/lib/articles/blocks';
import { articleImage, fmtDuration, videoPoster, videoSrc } from '@/lib/articles/queries';
import { YouTube } from './YouTube';
import { getT } from '@/lib/i18n/server';
import { getXPost, type XPost } from '@/lib/articles/xpost';

// Telo článku z blokov. Text sa pred vykreslením ešte raz očistí (aj keby sa do databázy dostalo niečo cudzie).
export async function ArticleBody({ slug, blocks, title }: { slug: string; blocks: Block[]; title: string }) {
  const t = await getT();
  // náhľady príspevkov z X načítame naraz (server, s vyrovnávacou pamäťou)
  const xposts = new Map<string, XPost | null>(
    await Promise.all(blocks.filter((b) => b.type === 'xpost').map(async (b) => [b.id, await getXPost((b as { url: string }).url)] as const)),
  );
  const fmtX = new Intl.DateTimeFormat(t.intl, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' });
  let n = 0; // poradie fotky v prehliadači /aktuality/<slug>/fotky/<n>
  const viewer = (i: number) => `/aktuality/${slug}/fotky/${i}`;
  return (
    <div className="ab">
      {blocks.map((b) => {
        switch (b.type) {
          case 'text':
            return b.html ? <div key={b.id} className="ab__p" dangerouslySetInnerHTML={{ __html: sanitizeInline(b.html) }} /> : null;
          case 'heading':
            return b.text ? (
              <h2 key={b.id} className="ab__h2">
                {b.text}
              </h2>
            ) : null;
          case 'image': {
            const i = ++n;
            const p = articleImage({ ...b.img, alt: b.alt });
            if (!p) return null;
            return (
              <figure key={b.id} className="ab__fig">
                <Link href={viewer(i)} className="ab__zoom" aria-label={t('Zväčšiť fotku{v}', { v: b.alt ? `: ${b.alt}` : '' })}>
                  <CloudImage photo={{ ...p, alt: b.alt }} sizes="(max-width: 800px) 100vw, 760px" />
                </Link>
                {b.caption ? <figcaption>{b.caption}</figcaption> : null}
              </figure>
            );
          }
          case 'gallery': {
            const start = n + 1;
            n += b.images.length;
            const shown = b.images.slice(0, 5);
            const more = b.images.length - shown.length;
            return (
              <figure key={b.id} className={`ab__gal ab__gal--${Math.min(shown.length, 5)}`}>
                <ul>
                  {shown.map((im, k) => {
                    const p = articleImage(im, '4:3');
                    if (!p) return null;
                    return (
                      <li key={im.publicId}>
                        <Link href={viewer(start + k)} aria-label={t('Fotka {v} z {length}{v2}', { v: k + 1, length: b.images.length, v2: im.alt ? `: ${im.alt}` : '' })}>
                          <CloudImage photo={{ ...p, alt: im.alt }} sizes="(max-width: 800px) 50vw, 380px" />
                          {k === shown.length - 1 && more > 0 ? (
                            <span className="ab__more" aria-hidden="true">
                              +{more}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <figcaption>
                  {b.caption ? `${b.caption} · ` : ''}
                  <Link href={viewer(start)}>{t('Galéria · {length} fotiek', { length: b.images.length })} </Link>
                </figcaption>
              </figure>
            );
          }
          case 'video':
            return (
              <figure key={b.id} className="ab__fig">
                <video className="ab__video" src={videoSrc(b.video)} poster={videoPoster(b.video)} controls preload="none" playsInline width={b.video.width} height={b.video.height} controlsList="nodownload" />
                {b.caption || b.video.duration ? (
                  <figcaption>
                    {b.caption}
                    {b.caption && b.video.duration ? ' · ' : ''}
                    {b.video.duration ? t('Video {fmtDuration}', { fmtDuration: fmtDuration(b.video.duration) }) : ''}
                  </figcaption>
                ) : null}
              </figure>
            );
          case 'youtube':
            return (
              <figure key={b.id} className="ab__fig">
                <YouTube id={b.youtubeId} title={b.caption || title} />
                {b.caption ? <figcaption>{b.caption}</figcaption> : null}
              </figure>
            );
          case 'xpost': {
            const x = xposts.get(b.id) ?? null;
            const author = x?.name || b.author;
            const handle = x?.handle || xHandle(b.url);
            const text = x?.text || b.text;
            const date = x?.date ? fmtX.format(x.date) : b.date;
            return (
              <figure key={b.id} className="ab__xp">
                <a href={b.url} target="_blank" rel="noopener noreferrer nofollow" className="ab__xp-card">
                  <span className="ab__xp-head">
                    {x?.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={x.avatar} alt="" width={44} height={44} className="ab__xp-av" loading="lazy" />
                    ) : (
                      <span className="ab__xp-av ab__xp-av--empty" aria-hidden="true" />
                    )}
                    <span className="ab__xp-who">
                      {author ? (
                        <b>
                          {author}
                          {x?.verified ? <span className="ab__xp-ver" aria-label={t('overený účet')} /> : null}
                        </b>
                      ) : null}
                      <span>@{handle}</span>
                    </span>
                    <span className="ab__xp-x" aria-hidden="true">
                      𝕏
                    </span>
                  </span>
                  {text ? <span className="ab__xp-text">{text}</span> : null}
                  {x?.photos.length ? (
                    <span className={`ab__xp-media ab__xp-media--${x.photos.length}`}>
                      {x.photos.map((p) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={p.src} src={p.src} alt="" width={p.w} height={p.h} loading="lazy" />
                      ))}
                    </span>
                  ) : x?.video ? (
                    <span className="ab__xp-media ab__xp-media--1 ab__xp-media--video">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={x.video.poster} alt="" width={x.video.w} height={x.video.h} loading="lazy" />
                      <span className="ab__xp-play" aria-hidden="true" />
                    </span>
                  ) : null}
                  <span className="ab__xp-foot">
                    <span>
                      {date ? <time dateTime={x?.date?.toISOString()}>{date}</time> : null}
                      {x?.likes ? <span className="ab__xp-likes"> · ♥ {x.likes.toLocaleString(t.intl)}</span> : null}
                    </span>
                    <span className="ab__xp-go">
                      {t('Zobraziť príspevok na X')} <span aria-hidden="true">→</span>
                      <span className="sr-only"> {t('(otvorí sa v novom okne)')}</span>
                    </span>
                  </span>
                </a>
              </figure>
            );
          }
          case 'quote':
            return b.text ? (
              <blockquote key={b.id} className="ab__q">
                <p>{b.text}</p>
                {b.author ? <footer>— {b.author}</footer> : null}
              </blockquote>
            ) : null;
          case 'button':
            return (
              <p key={b.id} className="ab__cta">
                {b.href.startsWith('/') ? (
                  <Link href={b.href} className="btn">
                    {b.label} <span aria-hidden="true">→</span>
                  </Link>
                ) : (
                  <a href={b.href} className="btn" target="_blank" rel="noopener noreferrer nofollow">
                    {b.label} <span aria-hidden="true">↗</span>
                    <span className="sr-only"> {' '}{t('(otvorí sa v novom okne)')}</span>
                  </a>
                )}
              </p>
            );
          case 'divider':
            return <hr key={b.id} className="ab__hr" />;
          default:
            return null;
        }
      })}
    </div>
  );
}
