import { xHandle } from '@/lib/articles/blocks';
import type { XPost } from '@/lib/articles/xpost';
import type { T } from '@/lib/i18n/translate';

// Príspevok zo siete X v článku – vyzerá ako vložený príspevok na X, ale bez ich skriptu.
// Údaje načíta server (lib/articles/xpost.ts), fotky idú cez našu doménu.
// fallback = údaje, ktoré zadal autor článku (keď X náhľad nepošle).

// #hashtagy, @mená a odkazy modrou ako na X
function rich(text: string) {
  const parts = text.split(/((?:^|(?<=\s))[#@][\p{L}\p{N}_]+|\b(?:https?:\/\/)?(?:[\w-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/u);
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <span key={i} className="xc__hl">
        {p}
      </span>
    ) : (
      p
    ),
  );
}

export function XCard({ url, x, fallback, t }: { url: string; x: XPost | null; fallback?: { author?: string; text?: string; date?: string }; t: T }) {
  const handle = x?.handle || xHandle(url);
  const name = x?.name || fallback?.author || handle;
  const text = x?.text || fallback?.text || '';
  const when = x?.date
    ? `${new Intl.DateTimeFormat(t.intl, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' }).format(x.date)} · ${new Intl.DateTimeFormat(t.intl, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Bratislava' }).format(x.date)}`
    : fallback?.date || '';
  const profile = `https://x.com/${handle}`;
  const ext = { target: '_blank', rel: 'noopener noreferrer nofollow' } as const;
  return (
    <figure className="xc" lang="und">
      <div className="xc__head">
        <a href={profile} {...ext} className="xc__av" tabIndex={-1} aria-hidden="true">
          {x?.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={x.avatar} alt="" width={48} height={48} loading="lazy" />
          ) : (
            <span>{handle.charAt(0).toUpperCase()}</span>
          )}
        </a>
        <span className="xc__who">
          <a href={profile} {...ext} className="xc__name">
            {name}
            {x?.verified ? <span className="xc__ver" role="img" aria-label={t('overený účet')} /> : null}
          </a>
          <span className="xc__handle">
            @{handle} ·{' '}
            <a href={`https://x.com/intent/follow?screen_name=${handle}`} {...ext} className="xc__follow">
              {t('Sledovať')}
            </a>
          </span>
        </span>
        <a href={url} {...ext} className="xc__logo" aria-label={t('Zobraziť príspevok na X')}>
          𝕏
        </a>
      </div>
      {text ? <p className="xc__text">{rich(text)}</p> : null}
      {x?.photos.length ? (
        <a href={url} {...ext} className={`xc__media xc__media--${x.photos.length}`} aria-label={t('Fotky v príspevku na X')}>
          {x.photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.src} src={p.src} alt="" width={p.w} height={p.h} loading="lazy" />
          ))}
        </a>
      ) : x?.video ? (
        <a href={url} {...ext} className="xc__media xc__media--1 xc__media--video" aria-label={t('Pozrieť video na X')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={x.video.poster} alt="" width={x.video.w} height={x.video.h} loading="lazy" />
          <span className="xc__watch">{t('Pozrieť na X')}</span>
          <span className="xc__play" aria-hidden="true" />
        </a>
      ) : null}
      {when ? (
        <a href={url} {...ext} className="xc__date">
          {when}
        </a>
      ) : null}
      <div className="xc__acts">
        {x?.likes ? (
          <a href={`https://x.com/intent/like?tweet_id=${url.split('/').pop()}`} {...ext} className="xc__like">
            <span className="xc__heart" aria-hidden="true">
              ♥
            </span>{' '}
            {x.likes.toLocaleString(t.intl)}
          </a>
        ) : null}
        <a href={`https://x.com/intent/tweet?in_reply_to=${url.split('/').pop()}`} {...ext} className="xc__reply">
          <span className="xc__bubble" aria-hidden="true" /> {t('Odpovedať')}
        </a>
      </div>
      <a href={url} {...ext} className="xc__more">
        {x?.replies ? t.n(x.replies, 'Prečítať {n} odpoveď|Prečítať {n} odpovede|Prečítať {n} odpovedí') : t('Zobraziť príspevok na X')}
        <span className="sr-only"> {t('(otvorí sa v novom okne)')}</span>
      </a>
    </figure>
  );
}
