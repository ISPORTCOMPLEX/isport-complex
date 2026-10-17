import Link from 'next/link';
import { Logo } from './Logo';
import { MobileNav, NavLinks } from './NavLinks';
import { ArrowUpRight } from './Icons';
import { getSessionUser } from '@/lib/session';

// Plávajúca sklenená hlavička – drží sa hore pri posúvaní stránky.
export async function Header() {
  const user = await getSessionUser();
  return (
    <div className="wrap header-shell">
      <header className="header glass">
        <Logo />
        <NavLinks />
        <div className="header__actions">
          {user ? (
            <Link href="/ucet" className="header__login header__me">
              <span className="header__avatar" aria-hidden="true">
                {`${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()}
              </span>
              Môj účet
            </Link>
          ) : (
            <Link href="/prihlasenie" className="header__login">
              Prihlásiť sa
            </Link>
          )}
          <Link href="/rezervacia" className="btn btn--sm btn--icon header__cta">
            Rezervovať
            <span className="btn__ic">
              <ArrowUpRight size={16} />
            </span>
          </Link>
          <MobileNav loggedIn={Boolean(user)} />
        </div>
      </header>
    </div>
  );
}
