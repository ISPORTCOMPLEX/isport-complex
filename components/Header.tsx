import Link from 'next/link';
import { LogoLockup } from './Logo';
import { MobileNav } from './NavLinks';
import { MegaNav, type MegaPhotos } from './nav/MegaNav';
import { ArrowUpRight } from './Icons';
import { getSessionUser } from '@/lib/session';
import { iceToday } from '@/lib/booking/iceToday';
import { photosBySlot, toWebPhoto } from '@/lib/media';

async function megaPhotos(): Promise<MegaPhotos> {
  try {
    const all = await photosBySlot();
    const first = (...slots: string[]) => {
      for (const s of slots) {
        const p = all[s]?.[0];
        if (p) return toWebPhoto(p, '4:3');
      }
      return null;
    };
    return { lad: first('ladova-plocha', 'komplex'), skyboxy: first('skyboxy'), bufet: first('bufet'), ihrisko: first('ihrisko'), fitness: first('posilnovna', 'wellness') };
  } catch {
    return { lad: null, skyboxy: null, bufet: null, ihrisko: null, fitness: null };
  }
}

// Hlavička: logo, menu (Ľad a Komplex sa rozbalia), účet a jediné červené tlačidlo. Drží sa hore pri posúvaní.
export async function Header() {
  const [user, ice, photos] = await Promise.all([getSessionUser(), iceToday(), megaPhotos()]);
  return (
    <header className="hd">
      <div className="wrap hd__in">
        <Link href="/" className="hd__logo" aria-label="I-SPORT COMPLEX, domov">
          <LogoLockup height={38} title="I-SPORT COMPLEX" />
        </Link>
        <MegaNav ice={ice} photos={photos} />
        <div className="hd__actions">
          {user ? (
            <Link href="/ucet" className="hd__acc hd__acc--in" aria-label="Môj účet" title="Môj účet">
              {`${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()}
            </Link>
          ) : (
            <Link href="/prihlasenie" className="hd__acc" aria-label="Prihlásiť sa" title="Prihlásiť sa">
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" fill="none" />
                <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              </svg>
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
