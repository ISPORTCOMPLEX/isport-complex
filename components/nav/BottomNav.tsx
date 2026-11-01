'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/Icon';

// Spodná lišta na mobile – ako v aplikácii. Na počítači sa nezobrazuje (CSS).
const HOME = 'M3 11l9-7 9 7v9h-6v-6H9v6H3z';
const USER = 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5';

function Glyph({ d }: { d: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" focusable="false">
      <path d={d} stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function BottomNav({ loggedIn }: { loggedIn: boolean }) {
  const path = usePathname() ?? '/';
  const on = (p: string, exact = false) => (exact ? path === p : path === p || path.startsWith(`${p}/`));
  return (
    <nav className="bn" aria-label="Rýchla navigácia">
      <Link href="/" className={on('/', true) ? 'is-on' : undefined} aria-current={on('/', true) ? 'page' : undefined}>
        <Glyph d={HOME} />
        Domov
      </Link>
      <Link href="/aktuality" className={on('/aktuality') ? 'is-on' : undefined} aria-current={on('/aktuality') ? 'page' : undefined}>
        <Icon name="novinky" />
        Novinky
      </Link>
      <Link href="/rezervacia" className="bn__cta">
        <span>
          <Icon name="kalendar" size={26} />
        </span>
        Rezervovať
      </Link>
      <Link href={loggedIn ? '/ucet/rezervacie' : '/prihlasenie?next=/ucet/rezervacie'} className={on('/ucet/rezervacie') ? 'is-on' : undefined} aria-current={on('/ucet/rezervacie') ? 'page' : undefined}>
        <Icon name="qr" />
        Moje
      </Link>
      <Link href={loggedIn ? '/ucet' : '/prihlasenie'} className={on('/ucet', true) || on('/ucet/profil') || on('/ucet/zabezpecenie') ? 'is-on' : undefined}>
        <Glyph d={USER} />
        {loggedIn ? 'Účet' : 'Prihlásiť'}
      </Link>
    </nav>
  );
}
