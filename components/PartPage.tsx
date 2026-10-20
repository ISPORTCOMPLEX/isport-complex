import Link from 'next/link';
import { RzBand } from '@/components/booking/RzBand';
import { CloudImage } from '@/components/CloudImage';
import { slotPhotos, type SlotKey } from '@/lib/media';

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
  if (photo) return <CloudImage photo={photo} className="pp__img" />;
  return <div className="pp__photo">{label}</div>;
}

// Ďalšie fotky časti ako galéria (ak nejaké sú).
export async function PartGallery({ slot, skip = 1 }: { slot: SlotKey; skip?: number }) {
  const photos = (await slotPhotos(slot, '4:3')).slice(skip);
  if (photos.length === 0) return null;
  return (
    <div className="pp__gallery">
      {photos.map((p) => (
        <CloudImage key={p.id} photo={p} sizes="(max-width: 640px) 50vw, 25vw" />
      ))}
    </div>
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
