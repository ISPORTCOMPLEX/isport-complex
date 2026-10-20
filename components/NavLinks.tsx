'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
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
// Escape menu zavrie a vráti fokus na tlačidlo (WCAG 2.1.2, 2.4.3).
export function MobileNav({ loggedIn = false }: { loggedIn?: boolean }) {
  const pathname = usePathname() ?? '/';
  const ref = useRef<HTMLDetailsElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !el.open) return;
      el.open = false;
      el.querySelector('summary')?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pathname]);
  return (
    <details className="mnav" key={pathname} ref={ref}>
      <summary aria-label="Menu">
        <IconMenu />
      </summary>
      <nav className="mnav__panel" aria-label="Mobilné menu">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} aria-current={isActive(pathname, item) ? 'page' : undefined}>
            {item.label}
          </Link>
        ))}
        {loggedIn ? <Link href="/ucet">Môj účet</Link> : <Link href="/prihlasenie">Prihlásiť sa</Link>}
        <Link href="/rezervacia" className="btn btn--icon">
          Rezervovať ľad
          <span className="btn__ic" aria-hidden="true">
            <ArrowUpRight />
          </span>
        </Link>
      </nav>
    </details>
  );
}
