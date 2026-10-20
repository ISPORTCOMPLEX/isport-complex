import type { WebPhoto } from '@/lib/media';

// Fotka webu: AVIF / WebP / JPEG podľa prehliadača, viac veľkostí, lenivé načítanie.
// Adresy sú na našej doméne (/obrazky/…). Uloženie pravým tlačidlom, potiahnutím a dlhým podržaním
// na mobile bráni PhotoGuard + CSS (.ph). Úplne zabrániť sa tomu nedá (snímka obrazovky), len sťažiť.
export function CloudImage({ photo, sizes = '(max-width: 900px) 100vw, 50vw', className, priority = false }: { photo: WebPhoto; sizes?: string; className?: string; priority?: boolean }) {
  return (
    <picture className="ph">
      <source type="image/avif" srcSet={photo.avif} sizes={sizes} />
      <source type="image/webp" srcSet={photo.webp} sizes={sizes} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.src}
        srcSet={photo.srcSet}
        sizes={sizes}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        className={className}
      />
    </picture>
  );
}
