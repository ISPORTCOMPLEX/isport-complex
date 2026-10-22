'use client';

import { usePathname } from 'next/navigation';

// Verejná hlavička a päta sa v administrácii a v prehliadačoch fotiek nezobrazujú – majú vlastné rozloženie.
// Počas rezervácie (/rezervacia, /rezervacia/udaje, /rezervacia/<kód>) je namiesto menu hlavička s krokmi.
export function SiteChrome({ header, bookingHeader, footer, children }: { header: React.ReactNode; bookingHeader: React.ReactNode; footer: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const bare = pathname === '/admin' || pathname.startsWith('/admin/') || /^\/fotky\/[^/]+$/.test(pathname) || /^\/aktuality\/[^/]+\/fotky\/\d+$/.test(pathname);
  const booking = pathname === '/rezervacia' || pathname.startsWith('/rezervacia/');
  return (
    <>
      {bare ? null : booking ? bookingHeader : header}
      <main id="obsah">{children}</main>
      {bare ? null : footer}
    </>
  );
}
