'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/ucet', label: 'Prehľad' },
  { href: '/ucet/rezervacie', label: 'Moje rezervácie' },
  { href: '/ucet/profil', label: 'Osobné údaje' },
  { href: '/ucet/zabezpecenie', label: 'Zabezpečenie' },
  { href: '/ucet/sukromie', label: 'Súkromie a údaje' },
];

export function AccountNav({ staff = false }: { staff?: boolean }) {
  const pathname = usePathname() ?? '/ucet';
  return (
    <nav aria-label="Môj účet" className="acct__nav">
      {ITEMS.map((i) => (
        <Link key={i.href} href={i.href} aria-current={pathname === i.href ? 'page' : undefined}>
          {i.label}
        </Link>
      ))}
      {staff ? (
        <Link href="/admin" className="acct__nav-admin">
          Administrácia →
        </Link>
      ) : null}
    </nav>
  );
}
