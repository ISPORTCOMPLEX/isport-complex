import Link from 'next/link';
import { LogoLockup } from './Logo';
import { MobileNav, NavLinks } from './NavLinks';
import { ArrowUpRight } from './Icons';
import { getSessionUser } from '@/lib/session';

// Hlavička: logo, textové menu a jediné červené tlačidlo. Drží sa hore pri posúvaní.
export async function Header() {
  const user = await getSessionUser();
  return (
    <header className="hd">
      <div className="wrap hd__in">
        <Link href="/" className="hd__logo" aria-label="I-SPORT COMPLEX, domov">
          <LogoLockup height={38} title="I-SPORT COMPLEX" />
        </Link>
        <NavLinks />
        <div className="hd__actions">
          {user ? (
            <Link href="/ucet" className="hd__me">
              <span className="header__avatar" aria-hidden="true">
                {`${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()}
              </span>
              Môj účet
            </Link>
          ) : (
            <Link href="/prihlasenie" className="hd__me">
              Prihlásiť sa
            </Link>
          )}
          <Link href="/rezervacia" className="hd__cta">
            Rezervovať ľad
            <span aria-hidden="true">
              <ArrowUpRight size={14} />
            </span>
          </Link>
          <Link href="/rezervacia" className="hd__mcta">
            Rezervovať
          </Link>
          <MobileNav loggedIn={Boolean(user)} />
        </div>
      </div>
    </header>
  );
}
