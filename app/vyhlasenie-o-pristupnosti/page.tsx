import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/LegalPage';
import { orTbd } from '@/lib/site';
import { getSite } from '@/lib/siteSettings';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
  title: t('Vyhlásenie o prístupnosti'),
  description: t('Ako je web a online rezervácia I-SPORT COMPLEX prístupná ľuďom so zdravotným znevýhodnením a ako nám nahlásiť problém.'),
};
}

// Podľa zákona č. 351/2022 Z. z. o požiadavkách na prístupnosť výrobkov a služieb (účinný od 28. 6. 2025)
// a normy EN 301 549 / WCAG 2.2 úroveň AA. Pri zmene webu treba aktualizovať časť 3 a dátum.
export default async function PristupnostPage() {
  const t = await getT();
  const site = await getSite();
  return (
    <LegalPage title={t('Vyhlásenie o prístupnosti')} updated="20. 10. 2026">
      <h2>{t('1. Na čo sa vyhlásenie vzťahuje')}</h2>
      <p>
        {t('Vyhlásenie platí pre tento web vrátane online rezervácie ľadovej plochy, zákazníckeho účtu, platby a formulárov. Snažíme sa, aby web mohol používať každý – aj s čítačkou obrazovky, len klávesnicou, so zväčšením textu alebo so zníženým videním farieb. Cieľom je súlad so štandardom')}{' '}
        
        <strong>{t('WCAG 2.2 na úrovni AA')}</strong> {' '}{t('(európska norma EN 301 549).')}
      </p>

      <h2>{t('2. Stav súladu')}</h2>
      <p>
        {t('Web je')}{' '}<strong>{t('čiastočne v súlade')}</strong> {' '}{t('s WCAG 2.2 AA. Nesúlady a výnimky sú uvedené v časti 4. Na ich odstránení priebežne pracujeme.')}
      </p>

      <h2>{t('3. Ako je web prístupný')}</h2>
      <ul>
        <li>{t('Celý web sa dá ovládať klávesnicou. Na začiatku každej stránky je odkaz „Preskočiť na obsah“ a aktuálny prvok je zreteľne zvýraznený.')}</li>
        <li>{t('Stránky majú nadpisy v správnom poradí, menu a navigácia sú označené, jazyk stránky je slovenčina.')}</li>
        <li>{t('Všetky polia formulárov majú popisky. Chyby sú popísané textom pri konkrétnom poli a čítačka ich oznámi.')}</li>
        <li>{t('Farby textu a ovládacích prvkov spĺňajú kontrast najmenej 4,5 : 1 pre text a 3 : 1 pre rámčeky a ikony. Informácia nikdy nie je odovzdaná len farbou.')}</li>
        <li>{t('Text sa dá zväčšiť na 200 % a stránka sa prispôsobí šírke 320 px bez vodorovného posúvania.')}</li>
        <li>{t('Animácie sa spúšťajú len po prejdení myšou alebo po zameraní. Ak má zariadenie zapnuté „obmedziť pohyb“, animácie sa nespustia.')}</li>
        <li>{t('Fotky majú alternatívny text. Ilustrácia komplexu na úvodnej stránke má textový popis a každá jej časť je dostupná aj ako bežný odkaz.')}</li>
        <li>{t('Rezervácia: voľné a obsadené hodiny sú odlíšené textom, nielen farbou; celková cena sa po zmene oznámi čítačke.')}</li>
        <li>{t('Prihlásenie nevyžaduje riešenie hádaniek – heslo aj kód z aplikácie sa dajú vložiť alebo doplniť správcom hesiel.')}</li>
        <li>{t('Platba kartou online prebieha na stránke platobnej brány, ktorá má vlastné vyhlásenie o prístupnosti. Vždy je možné zaplatiť aj na recepcii alebo prevodom.')}</li>
        <li>{t('Web podporuje režim vysokého kontrastu vo Windows.')}</li>
      </ul>

      <h2>{t('4. Nedostupný obsah a výnimky')}</h2>
      <ul>
        <li>
          <strong>{t('Animovaná ilustrácia komplexu')}</strong> {' '}{t('na úvodnej stránke je dekoratívna. Rovnaké informácie a odkazy sú v zozname pod ňou.')}
        </li>
        <li>
          <strong>{t('Ilustračná mapa')}</strong> {' '}{t('na úvodnej stránke nie je skutočná mapa. Presnú adresu a odkaz na navigáciu nájdeš na stránke')}{' '}
          
          <Link href="/kontakt">{t('Kontakt')}</Link>.
        </li>
        <li>
          <strong>{t('Alternatívne texty niektorých fotiek')}</strong> {' '}{t('sú zatiaľ všeobecné (napr. „Ľadová plocha – fotka“). Postupne ich nahrádzame presnými popismi.')}
        </li>
        <li>
          <strong>{t('Skenovanie QR kódu na recepcii')}</strong> {' '}{t('je určené personálu. Zákazník môže namiesto QR kódu povedať kód rezervácie (napr. ISP-ABC123).')}
        </li>
        <li>{t('Web zatiaľ nebol testovaný skupinou používateľov so zdravotným znevýhodnením. Testovanie s čítačkami NVDA a VoiceOver plánujeme pred plným spustením.')}</li>
      </ul>

      <h2>{t('5. Ako bolo vyhlásenie pripravené')}</h2>
      <p>
        {t('Vyhlásenie bolo vypracované 20. 10. 2026 na základe vlastného posúdenia: kontrola zdrojového kódu podľa kritérií WCAG 2.2 AA, výpočet kontrastu farieb a kontrola ovládania klávesnicou. Vyhlásenie aktualizujeme pri každej väčšej zmene webu, najmenej raz ročne.')}
      </p>

      <h2>{t('6. Spätná väzba a kontakt')}</h2>
      <p>
        {t('Ak narazíš na časť webu, ktorú nevieš použiť, alebo potrebuješ informácie v inej podobe, napíš nám na {orTbd}', { orTbd: orTbd(site.email) })}
        
        {site.phone ? t(', zavolaj na {phone}', { phone: site.phone }) : ''} {' '}{t('alebo použi')}{' '}<Link href="/kontakt">{t('kontaktný formulár')}</Link>{t('. Odpovieme najneskôr do 30 dní. Rezerváciu ti medzitým radi vytvoríme telefonicky alebo na recepcii.')}
      </p>

      <h2>{t('7. Dozor')}</h2>
      <p>
        {t('Ak nie si spokojný s odpoveďou, môžeš sa obrátiť na orgán dozoru –')}{' '}
        
        <a href="https://www.soi.sk" rel="noopener noreferrer">
          {t('Slovenskú obchodnú inšpekciu')}
        </a>{' '}{t('(zákon č. 351/2022 Z. z. o požiadavkách na prístupnosť výrobkov a služieb).')}
        
      </p>
    </LegalPage>
  );
}
