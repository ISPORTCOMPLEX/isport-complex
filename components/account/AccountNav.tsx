'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '@/lib/i18n/client';
import { msg } from '@/lib/i18n/translate';

const ITEMS = [
  { href: '/ucet', label: msg('Prehľad') },
  { href: '/ucet/rezervacie', label: msg('Moje rezervácie') },
  { href: '/ucet/profil', label: msg('Osobné údaje') },
  { href: '/ucet/zabezpecenie', label: msg('Zabezpečenie') },
  { href: '/ucet/sukromie', label: msg('Súkromie a údaje') },
];

export function AccountNav({ staff = false }: { staff?: boolean }) {
  const t = useT();
  const pathname = usePathname() ?? '/ucet';
  return (
    <nav aria-label={t('Môj účet')} className="acct__nav">
      {ITEMS.map((i) => (
        <Link key={i.href} href={i.href} aria-current={pathname === i.href ? 'page' : undefined}>
          {t(i.label)}
        </Link>
      ))}
      {staff ? (
        <Link href="/admin" className="acct__nav-admin">
          {t('Administrácia →')}
        </Link>
      ) : null}
    </nav>
  );
}
