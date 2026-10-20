'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// hard: odkaz s plným načítaním stránky (Fotky potrebujú vlastnú CSP na nahrávanie, ktorú prechod v rámci appky neprinesie)
export type AdminNavItem = { href: string; label: string; icon: IconName; group: string; soon?: boolean; badge?: number; hard?: boolean };
type IconName = 'home' | 'scan' | 'cal' | 'list' | 'users' | 'chart' | 'mail' | 'card' | 'shield' | 'log' | 'gear' | 'image';

const P: Record<IconName, string> = {
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9.5h.01',
  home: 'M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  scan: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10',
  cal: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 10h16M9 3v4M15 3v4',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  users: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 19v-1a4 4 0 0 0-3-3.87M16 3.13a3.5 3.5 0 0 1 0 6.75',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  card: 'M3 6h18v12H3zM3 10h18M7 15h4',
  shield: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z',
  log: 'M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
};

function Icon({ name }: { name: IconName }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name]} />
    </svg>
  );
}

export function AdminNav({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname() ?? '/admin';
  const active = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`));
  const groups = [...new Set(items.map((i) => i.group))];
  return (
    <nav aria-label="Administrácia" className="adm__nav">
      {groups.map((g) => (
        <div key={g} className="adm__group">
          {g ? <span className="adm__group-title">{g}</span> : null}
          {items
            .filter((i) => i.group === g)
            .map((i) =>
              i.soon ? (
                <span key={i.href} className="adm__link adm__link--soon" title="Pripravujeme">
                  <Icon name={i.icon} />
                  {i.label}
                  <em>čoskoro</em>
                </span>
              ) : i.hard ? (
                <a key={i.href} href={i.href} className="adm__link" aria-current={active(i.href) ? 'page' : undefined}>
                  <Icon name={i.icon} />
                  {i.label}
                  {i.badge ? <b>{i.badge}</b> : null}
                </a>
              ) : (
                <Link key={i.href} href={i.href} className="adm__link" aria-current={active(i.href) ? 'page' : undefined}>
                  <Icon name={i.icon} />
                  {i.label}
                  {i.badge ? <b>{i.badge}</b> : null}
                </Link>
              ),
            )}
        </div>
      ))}
    </nav>
  );
}
