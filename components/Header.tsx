import Link from 'next/link';
import { BottomNav } from '@/components/nav/BottomNav';
import { InstallPrompt } from '@/components/nav/InstallPrompt';
import { LogoLockup } from './Logo';
import { IceStrip } from './nav/IceStrip';
import { MobileNav } from './NavLinks';
import { MegaNav, type MegaPhotos } from './nav/MegaNav';
import { getSessionUser } from '@/lib/session';
import { getSite } from '@/lib/siteSettings';
import { iceToday } from '@/lib/booking/iceToday';
import { photosBySlot, toWebPhoto } from '@/lib/media';
import { isStaff } from '@/lib/staff';
import { ACTIVE_LOCALES, getLocale } from '@/lib/i18n/server';
import { LangSwitch } from './nav/LangSwitch';
import { getT } from '@/lib/i18n/server';

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

// Lišta „Ľad dnes“ (hodiny dňa ako výsledková tabuľa) + tmavomodrá hlavička s menu.
export async function Header() {
  const t = await getT();
  const [user, ice, photos, site, locale] = await Promise.all([getSessionUser(), iceToday(), megaPhotos(), getSite(), getLocale()]);
  const staff = user ? isStaff(user.role) : false;
  const nowHour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Europe/Bratislava' }).format(new Date())) % 24;
  return (
    <>
      <IceStrip ice={ice} nowHour={nowHour} />
      <header className="hd">
        <div className="wrap hd__in">
          <Link href="/" className="hd__logo" aria-label={t('I-SPORT COMPLEX, domov')}>
            <LogoLockup height={40} title="I-SPORT COMPLEX" />
          </Link>
          <MegaNav ice={ice} photos={photos} />
          <div className="hd__actions">
            {ACTIVE_LOCALES.length > 1 ? <LangSwitch locale={locale} locales={ACTIVE_LOCALES} /> : null}
            {staff ? (
              <Link href="/admin" className="hd__link">
                {t('Administrácia')}
              </Link>
            ) : null}
            <Link href={user ? '/ucet' : '/prihlasenie'} className="hd__link">
              {user ? t('Môj účet') : t('Prihlásiť sa')}
            </Link>
            <Link href="/rezervacia" className="sbtn hd__book" data-magnet="">
              {t('Rezervovať ľad')}
            </Link>
            <Link href={user ? '/ucet' : '/prihlasenie'} className="hd__macc" aria-label={user ? t('Môj účet') : t('Prihlásiť sa')}>
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </Link>
            <MobileNav locale={locale} locales={ACTIVE_LOCALES} loggedIn={Boolean(user)} staff={staff} address={`${site.hall.street} · ${site.hall.city.replace(/^\d{3}\s?\d{2}\s*/, '')}`} />
          </div>
        </div>
      </header>
      <BottomNav loggedIn={Boolean(user)} />
      <InstallPrompt />
    </>
  );
}
