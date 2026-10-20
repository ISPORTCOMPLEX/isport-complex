import Link from 'next/link';
import { RzBand } from '@/components/booking/RzBand';
import { CloudImage } from '@/components/CloudImage';
import { Mosaic } from '@/components/photos/Mosaic';
import { galleryPhotos, slotPhotos, type SlotKey } from '@/lib/media';

// Spoločné rozloženie stránok jednotlivých častí komplexu.
export function PartPage({
  crumb,
  title,
  lead,
  soon = false,
  children,
}: {
  crumb: string;
  title: React.ReactNode;
  lead: string;
  soon?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <RzBand
        crumbs={[{ href: '/', label: 'Komplex' }, { label: crumb }]}
        title={title}
        lead={
          <>
            {soon ? <p className="pp__soon">Pripravujeme</p> : null}
            <p>{lead}</p>
          </>
        }
      />
      {children}
    </>
  );
}

// Fotka časti komplexu z Cloudinary; kým nie je nahraná, ukáže sa sivý zástupca s popisom.
export async function PartPhoto({ label, slot, index = 0 }: { label: string; slot?: SlotKey; index?: number }) {
  const photo = slot ? (await slotPhotos(slot, '16:10'))[index] : undefined;
  if (photo)
    return (
      <Link href={`/fotky/${photo.id}`} className="pp__plink" aria-label={`Otvoriť fotku: ${photo.alt}`}>
        <CloudImage photo={photo} className="pp__img" />
      </Link>
    );
  return <div className="pp__photo">{label}</div>;
}

// Sekcia „Fotky“ v štýle IMDb: 2 riadky (3 + 4), „+N“ a odkaz na všetky fotky. Klik otvorí prehliadač /fotky/<id>.
export async function PartGallery({ slot, title }: { slot: SlotKey; title?: string }) {
  const all = await galleryPhotos(slot);
  if (all.length === 0) return null;
  const first = all.slice(0, 7);
  const rows = first.length <= 3 ? [first.length] : [3, first.length - 3];
  const allHref = `/fotky?sekcia=${slot}`;
  return (
    <section className="ps" id={`fotky-${slot}`} aria-labelledby={`ps-${slot}`}>
      <div className="ps__head">
        <Link href={allHref} className="ps__ttl">
          <h2 id={`ps-${slot}`} className="cond">
            {title ? `Fotky · ${title}` : 'Fotky'}
          </h2>
          <small>{all.length}</small>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <Link href={allHref} className="ps__all">
          Zobraziť všetky<span> fotky</span> →
        </Link>
      </div>
      <Mosaic photos={first} rows={rows} total={all.length} moreHref={allHref} viewHref={(p) => `/fotky/${p.id}`} />
    </section>
  );
}

export function PartCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="qb__cta u-start">
      {children}
      <span aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 14 14">
          <path d="M2 7h10M8 3l4 4-4 4" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </svg>
      </span>
    </Link>
  );
}
