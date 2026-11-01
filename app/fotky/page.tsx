import type { Metadata } from 'next';
import Link from 'next/link';
import { RzBand } from '@/components/booking/RzBand';
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
      <section className="dk2 rz-dk">
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
            <ul className="gm2">
              {photos.map((p, i) => (
                <li key={p.id} className="gm2__it">
                  <Link href={`/fotky/${p.id}?v=${view}`} className="gm2__a" aria-label={`Otvoriť fotku: ${p.alt}`}>
                    <picture>
                      <source type="image/avif" srcSet={p.avif} sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" />
                      <source type="image/webp" srcSet={p.webp} sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.src} srcSet={p.srcSet} sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" alt={p.alt} width={p.width} height={p.height} loading={i < 6 ? 'eager' : 'lazy'} decoding="async" draggable={false} />
                    </picture>
                    <span className="gm2__cap" aria-hidden="true">
                      <b>{p.label}</b>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
