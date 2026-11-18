import type { Metadata } from 'next';
import Link from 'next/link';
import { RzBand } from '@/components/booking/RzBand';
import { YouTube } from '@/components/articles/YouTube';
import { articleVideos, fmtDuration, fmtShortDate, videoPoster, videoSrc, type VideoItem } from '@/lib/articles/queries';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Videá'), description: t('Videá z I-SPORT COMPLEX Košice – zápasy, turnaje, tréningy a dianie v hale.'), alternates: { canonical: '/videa' } };
}

// Videá sa zbierajú samé zo zverejnených článkov – stačí vložiť video do článku.
export default async function VideaPage() {
  const t = await getT();
  const items: VideoItem[] = await articleVideos().catch(() => []);
  return (
    <>
      <RzBand crumbs={[{ href: '/', label: t('Komplex') }, { label: t('Videá') }]} title={t('Videá')} />
      <section className="vd">
        <div className="wrap">
          {items.length === 0 ? (
            <p className="pg-empty vd__empty">{t('Videá pripravujeme. Pribudnú spolu s novými článkami.')}</p>
          ) : (
            <ul className="vd__grid">
              {items.map((v, i) => (
                <li key={v.key} className={i === 0 ? 'vd__it vd__it--big' : 'vd__it'}>
                  <div className="vd__media">
                    {v.kind === 'upload' ? (
                      <video className="vd__video" src={videoSrc(v.video)} poster={videoPoster(v.video)} controls preload="none" playsInline width={v.video.width} height={v.video.height} controlsList="nodownload" />
                    ) : (
                      <YouTube id={v.youtubeId} title={v.caption || v.title} />
                    )}
                  </div>
                  <div className="vd__tx">
                    <Link href={`/aktuality/${v.slug}`} className="vd__t">
                      {v.caption || v.title}
                    </Link>
                    <span className="vd__meta">
                      <time dateTime={v.date.toISOString()}>{fmtShortDate(v.date, t)}</time>
                      {v.kind === 'upload' && v.video.duration ? ` · ${fmtDuration(v.video.duration)}` : v.kind === 'youtube' ? ' · YouTube' : ''}
                      {v.caption ? (
                        <>
                          {' · '}
                          <Link href={`/aktuality/${v.slug}`}>{v.title}</Link>
                        </>
                      ) : null}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
