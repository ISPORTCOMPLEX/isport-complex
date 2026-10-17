import type { MetadataRoute } from 'next';

// Inštalácia webu na plochu telefónu (ikona erbu, čierne pozadie).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'I-SPORT COMPLEX',
    short_name: 'I-SPORT',
    description: 'Rezervácia ľadu v tréningovej hokejovej hale v Košiciach.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#08080A',
    lang: 'sk',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/brand/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
