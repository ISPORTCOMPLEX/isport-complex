import Link from 'next/link';
import { Logo } from './Logo';
import { MobileNav, NavLinks } from './NavLinks';
import { ArrowUpRight } from './Icons';

// Plávajúca sklenená hlavička – drží sa hore pri posúvaní stránky.
export function Header() {
  return (
    <div className="wrap header-shell">
      <header className="header glass">
        <Logo />
        <NavLinks />
        <div className="header__actions">
          <Link href="/prihlasenie" className="header__login">
            Prihlásiť sa
          </Link>
          <Link href="/rezervacia" className="btn btn--sm btn--icon header__cta">
            Rezervovať
            <span className="btn__ic">
              <ArrowUpRight size={16} />
            </span>
          </Link>
          <MobileNav />
        </div>
      </header>
    </div>
  );
}
