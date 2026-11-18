import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, LOCALES, localeFromAcceptLanguage, type Locale } from './config';
import { DICTS } from './dicts';
import { makeT, type T } from './translate';
import { CLIENT_KEYS } from './clientKeys';

// Jazyky, ktoré majú hotový preklad (slovenčina vždy). Kým preklad chýba, jazyk sa v prepínači neukáže.
export const ACTIVE_LOCALES: Locale[] = LOCALES.filter((l) => l === DEFAULT_LOCALE || Object.keys(DICTS[l]).length > 0);
const active = (l: Locale | null | undefined): l is Locale => !!l && ACTIVE_LOCALES.includes(l);

// Jazyk návštevníka: zvolený v prepínači (cookie) → jazyk prehliadača → slovenčina.
export const getLocale = cache(async (): Promise<Locale> => {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen) && active(chosen)) return chosen;
  const browser = localeFromAcceptLanguage((await headers()).get('accept-language'));
  return active(browser) ? browser : DEFAULT_LOCALE;
});

export const getT = cache(async (): Promise<T> => {
  const locale = await getLocale();
  return makeT(locale, DICTS[locale]);
});

// Preklad pre konkrétny jazyk (e-maily zákazníkovi v jazyku jeho rezervácie a pod.).
export function tFor(locale: string | null | undefined): T {
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  return makeT(l, DICTS[l]);
}

// Do prehliadača posielame len texty, ktoré používajú klientske komponenty (nie celý slovník).
export const getClientDict = cache(async () => {
  const locale = await getLocale();
  const all = DICTS[locale];
  const dict: Record<string, string> = {};
  for (const k of CLIENT_KEYS) if (all[k] !== undefined) dict[k] = all[k];
  return { locale, dict };
});

// E-maily mimo návštevy zákazníka (recepcia, pripomienky, platobná brána): jazyk zákazníka nepoznáme,
// preto slovensky a pod tým anglicky.
export function MAIL_SK_EN(): T[] {
  return [tFor('sk'), tFor('en')];
}
