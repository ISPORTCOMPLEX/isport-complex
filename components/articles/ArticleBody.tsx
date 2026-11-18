import Link from 'next/link';
import { CloudImage } from '@/components/CloudImage';
import { sanitizeInline, splitXParts, type Block } from '@/lib/articles/blocks';
import { XCard } from './XCard';
import { articleImage, fmtDuration, videoPoster, videoSrc } from '@/lib/articles/queries';
import { YouTube } from './YouTube';
import { getT } from '@/lib/i18n/server';
import { getXPost, type XPost } from '@/lib/articles/xpost';

// Telo článku z blokov. Text sa pred vykreslením ešte raz očistí (aj keby sa do databázy dostalo niečo cudzie).
export async function ArticleBody({ slug, blocks, title }: { slug: string; blocks: Block[]; title: string }) {
  const t = await getT();
  // náhľady príspevkov z X načítame naraz (server, s vyrovnávacou pamäťou)
  // aj riadok textu, v ktorom je len odkaz na príspevok z X, sa zobrazí ako náhľad
  const parts = new Map(blocks.filter((b) => b.type === 'text').map((b) => [b.id, splitXParts(sanitizeInline((b as { html: string }).html))]));
  const urls = new Set<string>();
  for (const b of blocks) if (b.type === 'xpost') urls.add(b.url);
  for (const ps of parts.values()) for (const p of ps) if ('x' in p) urls.add(p.x);
  const xposts = new Map<string, XPost | null>(await Promise.all([...urls].map(async (u) => [u, await getXPost(u)] as const)));
  let n = 0; // poradie fotky v prehliadači /aktuality/<slug>/fotky/<n>
  const viewer = (i: number) => `/aktuality/${slug}/fotky/${i}`;
  return (
    <div className="ab">
      {blocks.map((b) => {
        switch (b.type) {
          case 'text': {
            const ps = parts.get(b.id) ?? [];
            if (!ps.length) return null;
            return (
              <div key={b.id} className="u-contents">
                {ps.map((p, k) => ('x' in p ? <XCard key={k} url={p.x} x={xposts.get(p.x) ?? null} t={t} /> : <div key={k} className="ab__p" dangerouslySetInnerHTML={{ __html: p.html }} />))}
              </div>
            );
          }
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
          case 'xpost':
            return <XCard key={b.id} url={b.url} x={xposts.get(b.url) ?? null} fallback={{ author: b.author, text: b.text, date: b.date }} t={t} />;
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
