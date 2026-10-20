'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, IconMenu } from './Icons';

export const NAV = [
  { href: '/', label: 'Komplex' },
  { href: '/ladova-plocha', label: 'Ľadová plocha', also: ['/cennik', '/pre-kluby', '/rezervacia'] },
  { href: '/ihrisko', label: 'Ihrisko' },
  { href: '/fitness-wellness', label: 'Fitness a wellness' },
  { href: '/bufet-skyboxy', label: 'Bufet a skyboxy' },
  { href: '/kontakt', label: 'Kontakt' },
];

function isActive(pathname: string, item: (typeof NAV)[number]) {
  if (item.href === '/') return pathname === '/';
  const paths = [item.href, ...('also' in item && item.also ? item.also : [])];
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function NavLinks() {
  const pathname = usePathname() ?? '/';
  return (
    <nav aria-label="Hlavné menu" className="hd__nav">
      {NAV.map((item) => (
        <Link key={item.href} href={item.href} aria-current={isActive(pathname, item) ? 'page' : undefined}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

// Mobilné menu na <details> – funguje aj bez JavaScriptu. Po zmene stránky sa zavrie (key).
export function MobileNav({ loggedIn = false }: { loggedIn?: boolean }) {
  const pathname = usePathname() ?? '/';
  return (
    <details className="mnav" key={pathname}>
      <summary aria-label="Otvoriť menu">
        <IconMenu />
      </summary>
      <div className="mnav__panel">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} aria-current={isActive(pathname, item) ? 'page' : undefined}>
            {item.label}
          </Link>
        ))}
        {loggedIn ? <Link href="/ucet">Môj účet</Link> : <Link href="/prihlasenie">Prihlásiť sa</Link>}
        <Link href="/rezervacia" className="btn btn--icon">
          Rezervovať ľad
          <span className="btn__ic">
            <ArrowUpRight />
          </span>
        </Link>
      </div>
    </details>
  );
}
