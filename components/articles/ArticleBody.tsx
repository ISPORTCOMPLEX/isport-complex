import Link from 'next/link';
import { CloudImage } from '@/components/CloudImage';
import { sanitizeInline, type Block } from '@/lib/articles/blocks';
import { articleImage, fmtDuration, videoPoster, videoSrc } from '@/lib/articles/queries';
import { YouTube } from './YouTube';

// Telo článku z blokov. Text sa pred vykreslením ešte raz očistí (aj keby sa do databázy dostalo niečo cudzie).
export function ArticleBody({ slug, blocks, title }: { slug: string; blocks: Block[]; title: string }) {
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
                <Link href={viewer(i)} className="ab__zoom" aria-label={`Zväčšiť fotku${b.alt ? `: ${b.alt}` : ''}`}>
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
                        <Link href={viewer(start + k)} aria-label={`Fotka ${k + 1} z ${b.images.length}${im.alt ? `: ${im.alt}` : ''}`}>
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
                  <Link href={viewer(start)}>Galéria · {b.images.length} fotiek</Link>
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
                    {b.video.duration ? `Video ${fmtDuration(b.video.duration)}` : ''}
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
                    <span className="sr-only"> (otvorí sa v novom okne)</span>
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
