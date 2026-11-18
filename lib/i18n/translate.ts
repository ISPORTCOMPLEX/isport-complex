import { DEFAULT_LOCALE, INTL_LOCALE, type Locale } from './config';

// Preklad textov. Kľúčom je slovenský text z kódu, slovník daného jazyka k nemu dáva preklad.
// Chýbajúci preklad = ostane slovenský text (web nikdy neukáže prázdne miesto ani technický kľúč).
//
//   t('Rezervovať ľad')
//   t('Dobrý deň, {name}', { name })
//   t.n(hours, '{n} hodina|{n} hodiny|{n} hodín')   ← slovenské tvary: 1 | 2–4 | 5+
//
// Preklad množného čísla obsahuje tvary jazyka oddelené „|“ v poradí z PLURAL_ORDER.

export type Dict = Record<string, string>;
export type Vars = Record<string, string | number | null | undefined>;

export type T = {
  (text: string, vars?: Vars): string;
  /** množné číslo: forms = slovenské tvary „1|2–4|5+“, {n} = počet */
  n: (count: number, forms: string, vars?: Vars) => string;
  locale: Locale;
  /** kód pre Intl (napr. 'de-DE') */
  intl: string;
};

// Poradie tvarov množného čísla v slovníku daného jazyka (kategórie Intl.PluralRules).
export const PLURAL_ORDER: Record<Locale, string[]> = {
  sk: ['one', 'few', 'other'],
  cs: ['one', 'few', 'other'],
  en: ['one', 'other'],
  de: ['one', 'other'],
  hu: ['one', 'other'],
};

const fill = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k] ?? '') : m)) : s);

// Značka pre texty, ktoré sa prekladajú až neskôr (napr. zoznamy kategórií v konštantách).
// Nič nemení – len ich nástroj na kontrolu prekladov nájde v kóde.
export const msg = <S extends string>(s: S): S => s;

function pluralIndex(locale: Locale, count: number): number {
  const order = PLURAL_ORDER[locale];
  const cat: string = new Intl.PluralRules(INTL_LOCALE[locale]).select(count);
  // desatinné čísla a pod. – kategórie, ktoré v slovníku nemáme, padnú na posledný tvar
  const i = order.indexOf(cat);
  return i === -1 ? order.length - 1 : i;
}

export function makeT(locale: Locale, dict: Dict): T {
  const t = ((text: string, vars?: Vars) => fill(dict[text] ?? text, vars)) as T;
  t.n = (count, forms, vars) => {
    const own = dict[forms];
    const list = (own ?? forms).split('|');
    const loc = own ? locale : DEFAULT_LOCALE;
    const pick = list[Math.min(pluralIndex(loc, count), list.length - 1)];
    return fill(pick, { n: count.toLocaleString(INTL_LOCALE[locale]), ...vars });
  };
  t.locale = locale;
  t.intl = INTL_LOCALE[locale];
  return t;
}

// Slovenský „preklad“ – pre kód mimo požiadavky (testy, skripty).
export const tSk: T = makeT(DEFAULT_LOCALE, {});

// Chyba, ktorej text je kľúč prekladu (+ premenné) – preloží ju až komponent, ktorý ju zobrazí.
export class TError extends Error {
  vars?: Vars;
  constructor(key: string, vars?: Vars) {
    super(key);
    this.vars = vars;
  }
}

// Text chyby v jazyku t (TError aj bežná Error so slovenským kľúčom).
export function errText(t: T, err: unknown, fallback: string): string {
  if (err instanceof TError) return t(err.message, err.vars);
  if (err instanceof Error && err.message) return t(err.message);
  return t(fallback);
}
