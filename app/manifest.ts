import type { MetadataRoute } from 'next';

// Inštalácia webu na plochu telefónu (monogram IS).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'I-SPORT COMPLEX',
    short_name: 'I-SPORT',
    description: 'Športový komplex Košice – rezervácia ľadovej plochy.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0A0A',
    theme_color: '#0A0A0A',
    lang: 'sk',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
