'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, IconMenu } from './Icons';

export const NAV = [
  { href: '/', label: 'Domov' },
  { href: '/hala', label: 'Hokejová hala' },
  { href: '/cennik', label: 'Cenník' },
  { href: '/pre-kluby', label: 'Pre kluby' },
  { href: '/kontakt', label: 'Kontakt' },
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks() {
  const pathname = usePathname() ?? '/';
  return (
    <nav aria-label="Hlavné menu" className="nav">
      {NAV.map((item) => (
        <Link key={item.href} href={item.href} aria-current={isActive(pathname, item.href) ? 'page' : undefined}>
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
      <div className="mnav__panel glass">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} aria-current={isActive(pathname, item.href) ? 'page' : undefined}>
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
