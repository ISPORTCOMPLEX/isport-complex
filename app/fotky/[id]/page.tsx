import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ViewerKeys } from '@/components/photos/ViewerKeys';
import { SLOT_PAGE, galleryPhotos, isSlot, type GalleryPhoto } from '@/lib/media';

// Prehliadač jednej fotky (ako „media viewer“ na IMDb). Každá fotka má vlastnú adresu – dá sa poslať odkazom.
// ?v=vsetky prechádza všetkými fotkami komplexu, inak len fotkami tej istej sekcie.

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ v?: string }> };

async function load(id: string, v?: string) {
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return null;
  const all = await galleryPhotos();
  const photo = all.find((p) => p.id === id);
  if (!photo) return null;
  const scope = v === 'vsetky' ? 'vsetky' : isSlot(v ?? '') ? (v as GalleryPhoto['slot']) : photo.slot;
  const list = scope === 'vsetky' ? all : all.filter((p) => p.slot === scope);
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  return { photo, list, idx, scope };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const r = await load((await params).id, (await searchParams).v);
  if (!r) return { title: 'Fotka' };
  return { title: `${r.photo.label} – fotka ${r.idx + 1} z ${r.list.length}`, description: r.photo.alt };
}

export default async function PhotoViewer({ params, searchParams }: Props) {
  const r = await load((await params).id, (await searchParams).v);
  if (!r) notFound();
  const { photo, list, idx, scope } = r;
  const n = list.length;
  const q = scope === photo.slot ? '' : `?v=${scope}`;
  const at = (i: number) => `/fotky/${list[(i + n) % n].id}${q}`;
  const prev = at(idx - 1);
  const next = at(idx + 1);
  const close = scope === 'vsetky' ? '/fotky' : `${SLOT_PAGE[photo.slot]}#fotky-${photo.slot}`;
  const allHref = scope === 'vsetky' ? '/fotky' : `/fotky?sekcia=${photo.slot}`;
  // pás náhľadov: až 9 fotiek okolo aktuálnej
  const from = Math.max(0, Math.min(idx - 4, n - 9));
  const thumbs = list.slice(from, from + 9).map((p, k) => ({ p, i: from + k }));
  const near = n > 1 ? [list[(idx + 1) % n], list[(idx - 1 + n) % n]].map((p) => ({ src: p.src, srcSet: p.srcSet })) : [];

  return (
    <div className="pv">
      <div className="pv__top">
        <Link href={close} className="pv__btn" aria-label="Zavrieť prehliadač fotiek">
          <span className="pv__ic">
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </span>
          <span>Zavrieť</span>
        </Link>
        <span className="pv__count" aria-live="polite">
          <b>{idx + 1}</b> z {n}
        </span>
        <Link href={allHref} className="pv__btn pv__btn--r">
          <span className="pv__ic">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" fill="currentColor" />
            </svg>
          </span>
          <span>Všetky fotky</span>
        </Link>
      </div>

      <div className="pv__stage">
        <picture className="ph" key={photo.id}>
          <source type="image/avif" srcSet={photo.avif} sizes="100vw" />
          <source type="image/webp" srcSet={photo.webp} sizes="100vw" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.src} srcSet={photo.srcSet} sizes="100vw" alt={photo.alt} width={photo.width} height={photo.height} loading="eager" fetchPriority="high" decoding="async" draggable={false} className="pv__img" />
        </picture>
        {n > 1 ? (
          <>
            <Link href={prev} replace scroll={false} className="pv__nav pv__nav--prev" aria-label="Predchádzajúca fotka">
              <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link href={next} replace scroll={false} className="pv__nav pv__nav--next" aria-label="Ďalšia fotka">
              <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </>
        ) : null}
      </div>

      <div className="pv__bottom">
        <div className="pv__cap">
          <h1>{photo.alt}</h1>
          <p>
            <Link href={SLOT_PAGE[photo.slot]}>{photo.label}</Link> · I-SPORT COMPLEX Košice
          </p>
        </div>
        {n > 1 ? (
          <nav className="pv__thumbs" aria-label="Ďalšie fotky">
            {thumbs.map(({ p, i }) => (
              <Link key={p.id} href={at(i)} replace scroll={false} className="pv__th" aria-current={i === idx ? 'true' : undefined} aria-label={`Fotka ${i + 1} z ${n}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumb} alt="" width={96} height={64} loading="lazy" decoding="async" draggable={false} />
              </Link>
            ))}
          </nav>
        ) : null}
        {n > 1 ? (
          <>
            <div className="pv__hints" aria-hidden="true">
              <span className="pv__hint">← → šípky na klávesnici</span>
              <span className="pv__hint">Esc zavrie</span>
            </div>
            <div className="pv__mnav">
              <Link href={prev} replace scroll={false} className="pv__nav" aria-label="Predchádzajúca fotka">
                <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <small>alebo potiahni prstom</small>
              <Link href={next} replace scroll={false} className="pv__nav pv__nav--next" aria-label="Ďalšia fotka">
                <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </>
        ) : null}
      </div>
      <ViewerKeys prev={prev} next={next} close={close} preload={near} />
    </div>
  );
}
