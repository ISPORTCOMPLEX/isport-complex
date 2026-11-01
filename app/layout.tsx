import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import localFont from 'next/font/local';
import { headers } from 'next/headers';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SiteChrome } from '@/components/SiteChrome';
import { BookingHeader } from '@/components/booking/BookingHeader';
import { Analytics } from '@/components/Analytics';
import { PhotoGuard } from '@/components/PhotoGuard';
import { appUrl } from '@/lib/requestInfo';
import './globals.css';

// Archivo s osou šírky (wdth) – úzky šikmý rez na nadpisy, normálny na text.
// next/font si písmo stiahne pri builde a servíruje ho z našej domény (CSP font-src 'self').
const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  axes: ['wdth'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-archivo',
});

// ISport Display – vlastné písmo značky. Condensed na nadpisy a ceny, široké na veľké nápisy.
const display = localFont({
  src: [
    { path: './fonts/ISportDisplayCondensed-BlackItalic.woff2', weight: '900', style: 'italic' },
    { path: './fonts/ISportDisplayCondensed-BoldItalic.woff2', weight: '700', style: 'italic' },
  ],
  variable: '--font-display',
  display: 'swap',
  fallback: ['Arial Narrow', 'sans-serif'],
});
const displayWide = localFont({
  src: [{ path: './fonts/ISportDisplay-BlackItalic.woff2', weight: '900', style: 'italic' }],
  variable: '--font-display-wide',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(appUrl() ?? 'http://localhost:3000'),
  title: {
    default: 'I-SPORT COMPLEX – športový komplex Košice',
    template: '%s · I-SPORT COMPLEX',
  },
  description: 'Športový komplex v Košiciach: tréningová ľadová plocha s online rezerváciou, futbalové ihrisko, bufet a skyboxy, pripravujeme wellness a posilňovňu.',
  // autor webu – <meta name="author"> a <link rel="author" href="/humans.txt">
  authors: [{ name: 'Matúš Bereš', url: '/humans.txt' }],
  creator: 'Matúš Bereš',
  // web pridaný na plochu iPhonu sa otvorí na celú obrazovku s vlastným názvom
  appleWebApp: { capable: true, title: 'I-SPORT', statusBarStyle: 'black' },
};

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  colorScheme: 'dark',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Prečítanie hlavičiek prepne stránky na dynamické vykresľovanie,
  // aby Next.js pridal jednorazový nonce z proxy.ts ku každému skriptu.
  await headers();

  return (
    <html lang="sk" className={`${archivo.variable} ${display.variable} ${displayWide.variable}`}>
      <body>
        <a href="#obsah" className="sr-only skip">
          Preskočiť na obsah
        </a>
        <SiteChrome header={<Header />} bookingHeader={<BookingHeader />} footer={<Footer />}>
          {children}
        </SiteChrome>
        <Analytics />
        <PhotoGuard />
      </body>
    </html>
  );
}
