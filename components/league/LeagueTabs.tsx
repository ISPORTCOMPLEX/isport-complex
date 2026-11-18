'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '@/lib/i18n/client';

const TABS = [
  { href: '/sutaz', label: 'Prehľad' },
  { href: '/sutaz/vysledky', label: 'Výsledky' },
  { href: '/sutaz/statistiky', label: 'Štatistiky' },
  { href: '/sutaz/tabulky', label: 'Tabuľky' },
  { href: '/sutaz/rozpis', label: 'Rozpis' },
];

export function LeagueTabs() {
  const t = useT();
  const path = usePathname() ?? '/sutaz';
  return (
    <div className="lgb__bar">
      <nav className="lgb__tabs" aria-label={t('Súťaž')}>
        {TABS.map((x) => (
          <Link key={x.href} href={x.href} aria-current={path === x.href ? 'page' : undefined}>
            {t(x.label)}
          </Link>
        ))}
      </nav>
      <Link href="/sutaz/registracia" className="lgb__reg" aria-current={path === '/sutaz/registracia' ? 'page' : undefined}>
        {t('Registrácia tímu')}
      </Link>
    </div>
  );
}
