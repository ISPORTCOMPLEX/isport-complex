import Link from 'next/link';
import { LogoLockup } from '@/components/Logo';
import { getSessionUser } from '@/lib/session';
import { BookingBack, BookingCount, BookingSteps } from './BookingSteps';

// Hlavička počas rezervácie: logo, kroky 1 Termín · 2 Údaje · 3 Potvrdenie, prihlásenie.
export async function BookingHeader() {
  const user = await getSessionUser();
  return (
    <header className="bk-hd">
      <div className="wrap bk-hd__in">
        <BookingBack />
        <Link href="/" className="bk-hd__logo" aria-label="I-SPORT COMPLEX, domov">
          <LogoLockup height={36} title="I-SPORT COMPLEX" />
        </Link>
        <BookingSteps />
        <Link href={user ? '/ucet' : '/prihlasenie'} className="bk-hd__acc">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          {user ? 'Môj účet' : 'Prihlásiť'}
        </Link>
        <BookingCount />
      </div>
    </header>
  );
}
