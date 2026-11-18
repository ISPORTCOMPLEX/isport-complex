import { msg } from '@/lib/i18n/translate';

// Kľúče prekladu pre texty z lib/sky.ts (počasie a fáza mesiaca). lib/sky.ts vracia slovenský text
// bez závislostí (kvôli testom) a komponenty ho prekladajú cez t(); tento zoznam ich len ukáže nástroju na preklady.
export const SKY_KEYS = [
  msg('nov'),
  msg('dorastajúci kosák'),
  msg('prvá štvrť'),
  msg('dorastajúci mesiac'),
  msg('spln'),
  msg('cúvajúci mesiac'),
  msg('posledná štvrť'),
  msg('cúvajúci kosák'),
  msg('búrka'),
  msg('husto sneží'),
  msg('sneží'),
  msg('dážď so snehom'),
  msg('silný dážď'),
  msg('mrholí'),
  msg('prší'),
  msg('hmla'),
  msg('zamračené'),
  msg('polojasno'),
  msg('skoro jasno'),
  msg('jasno'),
];
