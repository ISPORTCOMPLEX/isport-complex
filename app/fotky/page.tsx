import type { Metadata } from 'next';
import Link from 'next/link';
import { RzBand } from '@/components/booking/RzBand';
import { Mosaic, rowsOf } from '@/components/photos/Mosaic';
import { SLOTS, galleryPhotos, isSlot, photoCounts } from '@/lib/media';

export const metadata: Metadata = { title: 'Fotky', description: 'Fotky I-SPORT COMPLEX Košice – ľadová plocha, skyboxy, bufet, ihrisko, posilňovňa a wellness.' };

type Props = { searchParams: Promise<{ sekcia?: string }> };

export default async function FotkyPage({ searchParams }: Props) {
  const raw = (await searchParams).sekcia ?? '';
  const slot = isSlot(raw) ? raw : undefined;
  const [photos, counts] = await Promise.all([galleryPhotos(slot), photoCounts()]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const view = slot ?? 'vsetky';
  return (
    <>
      <RzBand crumbs={[{ href: '/', label: 'Komplex' }, { label: 'Fotky' }]} title="Fotky" />
      <section className="ice rz-ice">
        <div className="wrap">
          <nav className="pg-chips" aria-label="Sekcie fotiek">
            <Link href="/fotky" className="pg-chip" aria-current={!slot ? 'page' : undefined}>
              Všetky <small>{total}</small>
            </Link>
            {SLOTS.filter((s) => counts[s.key] > 0).map((s) => (
              <Link key={s.key} href={`/fotky?sekcia=${s.key}`} className="pg-chip" aria-current={slot === s.key ? 'page' : undefined}>
                {s.label} <small>{counts[s.key]}</small>
              </Link>
            ))}
          </nav>
          {photos.length === 0 ? (
            <p className="pg-empty">Fotky pripravujeme.</p>
          ) : (
            <div className="pg-grid">
              <Mosaic
                photos={photos}
                rows={rowsOf(photos.length, 4)}
                total={photos.length}
                moreHref="/fotky"
                viewHref={(p) => `/fotky/${p.id}?v=${view}`}
                mobileLimit={false}
                sizes="(max-width: 700px) 50vw, 25vw"
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
