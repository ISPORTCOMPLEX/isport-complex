// Jazyky webu. Slovenčina je zdrojový jazyk – texty v kóde sú po slovensky a slúžia zároveň ako kľúče prekladov.
export const LOCALES = ['sk', 'en', 'cs', 'de', 'hu'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'sk';
export const LOCALE_COOKIE = 'isp_lang';

// Názov jazyka vždy v danom jazyku (tak ho návštevník spozná).
export const LOCALE_NAMES: Record<Locale, string> = {
  sk: 'Slovenčina',
  en: 'English',
  cs: 'Čeština',
  de: 'Deutsch',
  hu: 'Magyar',
};

// Kód pre Intl (dátumy, čísla, meny).
export const INTL_LOCALE: Record<Locale, string> = {
  sk: 'sk-SK',
  en: 'en-GB',
  cs: 'cs-CZ',
  de: 'de-DE',
  hu: 'hu-HU',
};

// Kód pre <meta property="og:locale">.
export const OG_LOCALE: Record<Locale, string> = { sk: 'sk_SK', en: 'en_GB', cs: 'cs_CZ', de: 'de_DE', hu: 'hu_HU' };

export function isLocale(x: unknown): x is Locale {
  return typeof x === 'string' && (LOCALES as readonly string[]).includes(x);
}

// Accept-Language prehliadača → prvý podporovaný jazyk; inak slovenčina.
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const langs = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      return { base: tag.trim().toLowerCase().split('-')[0], q: q ? Number(q.slice(2)) || 0 : 1 };
    })
    .filter((x) => x.base && x.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const l of langs) if (isLocale(l.base)) return l.base;
  return DEFAULT_LOCALE;
}
