'use client';

import { usePathname } from 'next/navigation';

// Verejná hlavička a päta sa v administrácii a v prehliadači fotiek (/fotky/<id>) nezobrazujú – majú vlastné rozloženie.
export function SiteChrome({ header, footer, children }: { header: React.ReactNode; footer: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const bare = pathname === '/admin' || pathname.startsWith('/admin/') || /^\/fotky\/[^/]+$/.test(pathname);
  return (
    <>
      {bare ? null : header}
      <main id="obsah">{children}</main>
      {bare ? null : footer}
    </>
  );
}
