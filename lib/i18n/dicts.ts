import type { Locale } from './config';
import type { Dict } from './translate';
import en from './messages/en.json';
import cs from './messages/cs.json';
import de from './messages/de.json';
import hu from './messages/hu.json';

// Slovníky všetkých jazykov (slovenčina je zdroj, preto prázdny slovník).
export const DICTS: Record<Locale, Dict> = { sk: {}, en, cs, de, hu };
