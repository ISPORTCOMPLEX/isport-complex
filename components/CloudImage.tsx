import type { WebPhoto } from '@/lib/media';

// Fotka z Cloudinary: viac veľkostí (srcset), moderné formáty, lenivé načítanie.
export function CloudImage({ photo, sizes = '(max-width: 900px) 100vw, 50vw', className, priority = false }: { photo: WebPhoto; sizes?: string; className?: string; priority?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo.src}
      srcSet={photo.srcSet}
      sizes={sizes}
      alt={photo.alt}
      width={photo.width}
      height={photo.height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
    />
  );
}
