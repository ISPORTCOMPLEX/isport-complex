'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/i18n/config';
import { useT } from '@/lib/i18n/client';
import { LangGrid } from './nav/LangSwitch';
import { msg } from '@/lib/i18n/translate';

export const NAV = [
  { href: '/aktuality', label: msg('Novinky') },
  { href: '/ladova-plocha', label: msg('Ľadová plocha'), also: ['/cennik', '/pre-kluby', '/rezervacia'] },
  { href: '/ihrisko', label: msg('Ihrisko') },
  { href: '/fitness-wellness', label: msg('Fitness a wellness') },
  { href: '/bufet-skyboxy', label: msg('Bufet a skyboxy') },
  { href: '/fotky', label: msg('Fotky') },
  { href: '/videa', label: msg('Videá') },
  { href: '/sutaz', label: msg('Súťaž') },
];

function isActive(pathname: string, item: (typeof NAV)[number]) {
  if (item.href === '/') return pathname === '/';
  const paths = [item.href, ...('also' in item && item.also ? item.also : [])];
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function NavLinks() {
  const t = useT();
  const pathname = usePathname() ?? '/';
  return (
    <nav aria-label={t('Hlavné menu')} className="hd__nav">
      {NAV.map((item) => (
        <Link key={item.href} href={item.href} aria-current={isActive(pathname, item) ? 'page' : undefined}>
          {t(item.label)}
        </Link>
      ))}
    </nav>
  );
}

const MOBILE: { href: string; label: string; match: string[]; sub?: { href: string; label: string }[] }[] = [
  { href: '/aktuality', label: msg('Novinky'), match: ['/aktuality'] },
  {
    href: '/ladova-plocha',
    label: msg('Ľadová plocha'),
    match: ['/ladova-plocha', '/rezervacia', '/cennik', '/pre-kluby'],
    sub: [
      { href: '/rezervacia', label: msg('Rezervácia') },
      { href: '/cennik', label: msg('Cenník a storno') },
      { href: '/pre-kluby', label: msg('Pre kluby a školy') },
    ],
  },
  {
    href: '/bufet-skyboxy',
    label: msg('Komplex'),
    match: ['/bufet-skyboxy', '/ihrisko', '/fitness-wellness'],
    sub: [
      { href: '/bufet-skyboxy', label: msg('Bufet a skyboxy') },
      { href: '/ihrisko', label: msg('Futbalové ihrisko') },
      { href: '/fitness-wellness', label: msg('Fitness a wellness') },
    ],
  },
  { href: '/fotky', label: msg('Fotky'), match: ['/fotky'] },
  { href: '/videa', label: msg('Videá'), match: ['/videa'] },
  {
    href: '/sutaz',
    label: msg('Súťaž'),
    match: ['/sutaz'],
    sub: [
      { href: '/sutaz/vysledky', label: msg('Výsledky') },
      { href: '/sutaz/statistiky', label: msg('Štatistiky') },
      { href: '/sutaz/tabulky', label: msg('Tabuľky') },
      { href: '/sutaz/rozpis', label: msg('Rozpis') },
      { href: '/sutaz/registracia', label: msg('Registrácia tímu') },
    ],
  },
];
const inSection = (path: string, list: string[]) => list.some((p) => path === p || path.startsWith(`${p}/`));

// Mobilné menu na <details> – funguje aj bez JavaScriptu. Po zmene stránky sa zavrie (key).
// Escape menu zavrie a vráti fokus na tlačidlo (WCAG 2.1.2, 2.4.3).
export function MobileNav({ locale, locales, loggedIn = false, staff = false, address = '' }: { locale: Locale; locales: readonly Locale[]; loggedIn?: boolean; staff?: boolean; address?: string }) {
  const t = useT();
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
  // podpoložky sa ukážu pri aktívnej sekcii, inak pri Ľadovej ploche
  const active = MOBILE.findIndex((m) => inSection(pathname, m.match));
  const open = active >= 0 && MOBILE[active].sub ? active : 1;
  return (
    <details className="mnav" key={pathname} ref={ref}>
      <summary aria-label={t('Menu')}>
        <span className="mnav__ic mnav__ic--open" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24">
            <path d="M5 7h14M5 12h14M5 17h9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square" fill="none" />
          </svg>
        </span>
        <span className="mnav__ic mnav__ic--close" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.8" fill="none" />
          </svg>
        </span>
      </summary>
      <div className="mnav__panel">
        <span className="mnav__bgword" aria-hidden="true">
          IS
        </span>
        <nav className="mnav__nav" aria-label={t('Mobilné menu')}>
          {MOBILE.map((m, i) => (
            <div key={m.href} className={`mnav__grp${i === open && m.sub ? ' has-sub' : ''}`}>
              <Link href={m.href} className={`mnav__big${m.href === '/sutaz' ? ' mnav__big--sutaz' : ''}${i === active ? ' is-active' : ''}`} aria-current={pathname === m.href ? 'page' : undefined}>
                {t(m.label)}
              </Link>
              {i === open && m.sub
                ? m.sub.map((s) => (
                    <Link key={s.href + s.label} href={s.href} className="mnav__sub" aria-current={pathname === s.href ? 'page' : undefined}>
                      {t(s.label)}
                    </Link>
                  ))
                : null}
            </div>
          ))}
        </nav>
        <div className="mnav__foot">
          <Link href="/rezervacia" className="sbtn sbtn--block">
            {t('Rezervovať ľad')}
          </Link>
          {staff ? (
            <Link href="/admin" className="sbtn sbtn--ghost sbtn--block sbtn--sm mnav__admin">
              {t('Administrácia')}
            </Link>
          ) : null}
          <Link href={loggedIn ? '/ucet' : '/prihlasenie'} className="sbtn sbtn--ghost sbtn--block sbtn--sm">
            {loggedIn ? t('Môj účet') : t('Prihlásiť sa')}
          </Link>
          {locales.length > 1 ? (
            <>
              <p className="mnav__lang-t">{t('Jazyk webu')}</p>
              <LangGrid locale={locale} locales={locales} className="mnav__lang" />
            </>
          ) : null}
          {address ? <span className="mnav__addr">{address}</span> : null}
        </div>
      </div>
    </details>
  );
}
