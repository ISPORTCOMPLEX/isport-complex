'use client';

import { usePathname } from 'next/navigation';

// Verejná hlavička a päta sa v administrácii nezobrazujú – tá má vlastné rozloženie.
export function SiteChrome({ header, footer, children }: { header: React.ReactNode; footer: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const bare = pathname === '/admin' || pathname.startsWith('/admin/');
  return (
    <>
      {bare ? null : header}
      <main id="obsah">{children}</main>
      {bare ? null : footer}
    </>
  );
}
