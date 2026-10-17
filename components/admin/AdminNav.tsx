'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type AdminNavItem = { href: string; label: string; soon?: boolean; badge?: number };

export function AdminNav({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname() ?? '/admin';
  const active = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <nav aria-label="Administrácia" className="adm__nav">
      {items.map((i) =>
        i.soon ? (
          <span key={i.href} className="adm__link adm__link--soon" title="Pribudne s rezerváciami">
            <i aria-hidden="true" />
            {i.label}
            <em>čoskoro</em>
          </span>
        ) : (
          <Link key={i.href} href={i.href} className="adm__link" aria-current={active(i.href) ? 'page' : undefined}>
            <i aria-hidden="true" />
            {i.label}
            {i.badge ? <b>{i.badge}</b> : null}
          </Link>
        ),
      )}
    </nav>
  );
}
