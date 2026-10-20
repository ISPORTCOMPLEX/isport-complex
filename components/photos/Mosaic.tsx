import Link from 'next/link';
import { ratioClass, type GalleryPhoto } from '@/lib/media';

// Zarovnané riadky fotiek ako na IMDb: každá fotka si zachová svoj tvar, výška riadku je spoločná.
// rows = počty fotiek v riadkoch (napr. [3, 4]). „+N“ na poslednej dlaždici vedie na všetky fotky.
// Na mobile: mriežka 2 stĺpce, prvá fotka cez celú šírku, ukáže sa najviac 5 (ak mobileLimit).
export function Mosaic({
  photos,
  rows,
  total,
  moreHref,
  viewHref,
  mobileLimit = true,
  sizes = '(max-width: 700px) 50vw, 33vw',
}: {
  photos: GalleryPhoto[];
  rows: number[];
  total: number;
  moreHref: string;
  viewHref: (p: GalleryPhoto) => string;
  mobileLimit?: boolean;
  sizes?: string;
}) {
  const chunks: GalleryPhoto[][] = [];
  let at = 0;
  for (const r of rows) {
    if (at >= photos.length) break;
    chunks.push(photos.slice(at, at + r));
    at += r;
  }
  const shown = at > photos.length ? photos.length : at;
  const MOBILE = 5;
  let i = -1;
  return (
    <div className={`jm${mobileLimit ? '' : ' jm--page'}`}>
      {chunks.map((row, ri) => (
        <div key={ri} className="jm__row">
          {row.map((p) => {
            i++;
            const lastDesktop = i === shown - 1 && total > shown;
            const lastMobile = mobileLimit && i === MOBILE - 1 && total > MOBILE;
            const cls = ['jm__it', ratioClass(p.ratio), i === 0 ? 'jm__it--first' : '', mobileLimit && i >= MOBILE ? 'jm__it--mhide' : ''].filter(Boolean).join(' ');
            return (
              <div key={p.id} className={cls}>
                <Link href={viewHref(p)} className="jm__a" aria-label={`Otvoriť fotku: ${p.alt}`}>
                  <picture className="ph">
                    <source type="image/avif" srcSet={p.avif} sizes={sizes} />
                    <source type="image/webp" srcSet={p.webp} sizes={sizes} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.src} srcSet={p.srcSet} sizes={sizes} alt={p.alt} width={p.width} height={p.height} loading={i < 3 ? 'eager' : 'lazy'} decoding="async" draggable={false} className="jm__img" />
                  </picture>
                </Link>
                {lastDesktop ? (
                  <Link href={moreHref} className="jm__more jm__more--d" aria-label={`Zobraziť všetkých ${total} fotiek`}>
                    +{total - shown + 1}
                  </Link>
                ) : null}
                {lastMobile ? (
                  <Link href={moreHref} className="jm__more jm__more--m" aria-label={`Zobraziť všetkých ${total} fotiek`}>
                    +{total - MOBILE + 1}
                  </Link>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Rozdelenie do riadkov po `per` – posledný riadok s 1 fotkou pridáme k predošlému (žiadna osamotená dlaždica).
export function rowsOf(n: number, per: number): number[] {
  const rows: number[] = [];
  for (let left = n; left > 0; left -= per) rows.push(Math.min(per, left));
  if (rows.length > 1 && rows[rows.length - 1] === 1) {
    rows.pop();
    rows[rows.length - 1] += 1;
  }
  return rows;
}
