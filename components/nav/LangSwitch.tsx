'use client';

import { useEffect, useRef } from 'react';
import { LOCALE_NAMES, type Locale } from '@/lib/i18n/config';
import { useT } from '@/lib/i18n/client';

// Odkaz na zmenu jazyka: ?lang=xx – proxy.ts uloží voľbu do cookie a vráti návštevníka na tú istú stránku.
// Obyčajný <a> (nie next/link), aby sa celá stránka načítala nanovo už v novom jazyku.
const href = (l: Locale) => `?lang=${l}`;

function Globe() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3z" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

// Hlavička: tlačidlo „🌐 SK ▾“ a rozbaľovací zoznam jazykov.
export function LangSwitch({ locale, locales }: { locale: Locale; locales: readonly Locale[] }) {
  const t = useT();
  const ref = useRef<HTMLDetailsElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const close = (e: Event) => {
      if (!el.open) return;
      if (e instanceof KeyboardEvent) {
        if (e.key !== 'Escape') return;
        el.open = false;
        el.querySelector('summary')?.focus();
      } else if (!el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener('keydown', close);
    document.addEventListener('pointerdown', close);
    return () => {
      document.removeEventListener('keydown', close);
      document.removeEventListener('pointerdown', close);
    };
  }, []);
  return (
    <details className="lsw" ref={ref}>
      <summary className="lsw__btn" aria-label={`${t('Jazyk')}: ${LOCALE_NAMES[locale]}`}>
        <Globe />
        <b>{locale.toUpperCase()}</b>
        <svg className="lsw__chev" width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 9l7 7 7-7" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
      </summary>
      <div className="lsw__menu">
        <span className="lsw__head">{t('Jazyk webu')}</span>
        <ul>
          {locales.map((l) => (
            <li key={l}>
              <a href={href(l)} hrefLang={l} lang={l} className="lsw__it" aria-current={l === locale ? 'true' : undefined} rel="nofollow">
                <span className="lsw__code">{l.toUpperCase()}</span>
                <span className="lsw__name">{LOCALE_NAMES[l]}</span>
                {l === locale ? (
                  <svg className="lsw__ok" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" />
                  </svg>
                ) : null}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

// Mobilné menu a päta: mriežka jazykov (kódy), aktívny zvýraznený.
export function LangGrid({ locale, locales, className = '' }: { locale: Locale; locales: readonly Locale[]; className?: string }) {
  const t = useT();
  return (
    <nav className={`lsg ${className}`} aria-label={t('Jazyk webu')}>
      {locales.map((l) => (
        <a key={l} href={href(l)} hrefLang={l} lang={l} className="lsg__it" aria-current={l === locale ? 'true' : undefined} title={LOCALE_NAMES[l]} rel="nofollow">
          <b>{l.toUpperCase()}</b>
          <span>{LOCALE_NAMES[l]}</span>
        </a>
      ))}
    </nav>
  );
}
