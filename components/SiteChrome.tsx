'use client';

import { usePathname } from 'next/navigation';
import { ScrollReveal } from '@/components/ScrollReveal';

// Verejná hlavička a päta sa v administrácii a v prehliadačoch fotiek nezobrazujú – majú vlastné rozloženie.
// Počas rezervácie (/rezervacia, /rezervacia/udaje, /rezervacia/<kód>) je namiesto menu hlavička s krokmi.
export function SiteChrome({ header, bookingHeader, footer, children }: { header: React.ReactNode; bookingHeader: React.ReactNode; footer: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const bare = pathname === '/admin' || pathname.startsWith('/admin/') || /^\/fotky\/[^/]+$/.test(pathname) || /^\/aktuality\/[^/]+\/fotky\/\d+$/.test(pathname);
  // prihlásenie a registrácia: celá obrazovka podľa predlohy (logo je v ľavom paneli)
  const auth = ['/prihlasenie', '/prihlasenie/2fa', '/registracia', '/zabudnute-heslo', '/obnova-hesla', '/overenie-emailu'].includes(pathname);
  const booking = pathname === '/rezervacia' || pathname.startsWith('/rezervacia/');
  return (
    <>
      {bare || auth ? null : booking ? bookingHeader : header}
      <main id="obsah">{children}</main>
      {bare ? null : <ScrollReveal />}
      {bare || auth ? null : footer}
    </>
  );
}
