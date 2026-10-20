import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import { headers } from 'next/headers';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SiteChrome } from '@/components/SiteChrome';
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

export const metadata: Metadata = {
  metadataBase: new URL(appUrl() ?? 'http://localhost:3000'),
  title: {
    default: 'I-SPORT COMPLEX – tréningová hokejová hala Košice',
    template: '%s · I-SPORT COMPLEX',
  },
  description: 'Rezervácia ľadu online v tréningovej hokejovej hale v Košiciach. Celá plocha aj polovica, pre kluby, školy aj amatérov.',
};

export const viewport: Viewport = {
  themeColor: '#08080A',
  colorScheme: 'dark',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Prečítanie hlavičiek prepne stránky na dynamické vykresľovanie,
  // aby Next.js pridal jednorazový nonce z proxy.ts ku každému skriptu.
  await headers();

  return (
    <html lang="sk" className={archivo.variable}>
      <body>
        <a href="#obsah" className="sr-only skip">
          Preskočiť na obsah
        </a>
        <SiteChrome header={<Header />} footer={<Footer />}>
          {children}
        </SiteChrome>
      </body>
    </html>
  );
}
