import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { BottomNav } from '@/components/nav/BottomNav';
import { InstallPrompt } from '@/components/nav/InstallPrompt';
import { LogoLockup } from './Logo';
import { MobileNav } from './NavLinks';
import { MegaNav, type MegaPhotos } from './nav/MegaNav';
import { getSessionUser } from '@/lib/session';
import { getSite } from '@/lib/siteSettings';
import { iceToday } from '@/lib/booking/iceToday';
import { photosBySlot, toWebPhoto } from '@/lib/media';
import { isStaff } from '@/lib/staff';

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

// Dnešné otváracie hodiny (Po–Pi / So / Ne podľa nastavení webu). Prázdne = riadok sa nezobrazí.
function todayHours(hours: { days: string; time: string }[]): string {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Bratislava', weekday: 'short' }).format(new Date());
  const i = wd === 'Sat' ? 1 : wd === 'Sun' ? 2 : 0;
  return hours[i]?.time?.trim() ?? '';
}

// Horná lišta + hlavička. Na úvode leží hlavička priamo na hero (priehľadná), inde je tmavá a drží sa hore.
export async function Header() {
  const [user, ice, photos, site] = await Promise.all([getSessionUser(), iceToday(), megaPhotos(), getSite()]);
  const open = todayHours(site.hours);
  const staff = user ? isStaff(user.role) : false;
  const short = `${site.hall.street}, ${site.hall.city.replace(/^\d{3}\s?\d{2}\s*/, '')}`;
  return (
    <>
      <div className="tb">
        <div className="wrap tb__in">
          <span className="tb__l">
            <span className="tb__it">
              <Icon name="adresa" size={15} />
              {short}
            </span>
            {site.phone ? (
              <a className="tb__it" href={`tel:${site.phone.replace(/\s/g, '')}`}>
                Recepcia: {site.phone}
              </a>
            ) : null}
          </span>
          <span className="tb__r">
            {open ? (
              <span className="tb__open">
                <i aria-hidden="true" />
                Dnes otvorené {open}
              </span>
            ) : null}
            {staff ? (
              <Link href="/admin" className="tb__admin">
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" fill="currentColor" />
                </svg>
                Administrácia
              </Link>
            ) : null}
            <Link href={user ? '/ucet' : '/prihlasenie'} className="tb__acc">
              {user ? 'Môj účet' : 'Prihlásiť sa'}
            </Link>
          </span>
        </div>
      </div>
      <header className="hd">
        <div className="wrap hd__in">
          <Link href="/" className="hd__logo" aria-label="I-SPORT COMPLEX, domov">
            <LogoLockup height={40} title="I-SPORT COMPLEX" />
          </Link>
          <MegaNav ice={ice} photos={photos} />
          <div className="hd__actions">
            <Link href="/rezervacia" className="sbtn hd__book">
              Rezervovať ľad
            </Link>
            <Link href={user ? '/ucet' : '/prihlasenie'} className="hd__macc" aria-label={user ? 'Môj účet' : 'Prihlásiť sa'}>
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </Link>
            <MobileNav loggedIn={Boolean(user)} staff={staff} address={`${site.hall.street} · ${site.hall.city.replace(/^\d{3}\s?\d{2}\s*/, '')}`} />
          </div>
        </div>
      </header>
      <BottomNav loggedIn={Boolean(user)} />
      <InstallPrompt />
    </>
  );
}
