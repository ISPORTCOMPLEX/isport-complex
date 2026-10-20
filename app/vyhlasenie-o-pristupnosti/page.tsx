import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/LegalPage';
import { orTbd } from '@/lib/site';
import { getSite } from '@/lib/siteSettings';

export const metadata: Metadata = {
  title: 'Vyhlásenie o prístupnosti',
  description: 'Ako je web a online rezervácia I-SPORT COMPLEX prístupná ľuďom so zdravotným znevýhodnením a ako nám nahlásiť problém.',
};

// Podľa zákona č. 351/2022 Z. z. o požiadavkách na prístupnosť výrobkov a služieb (účinný od 28. 6. 2025)
// a normy EN 301 549 / WCAG 2.2 úroveň AA. Pri zmene webu treba aktualizovať časť 3 a dátum.
export default async function PristupnostPage() {
  const site = await getSite();
  return (
    <LegalPage title="Vyhlásenie o prístupnosti" updated="20. 10. 2026">
      <h2>1. Na čo sa vyhlásenie vzťahuje</h2>
      <p>
        Vyhlásenie platí pre tento web vrátane online rezervácie ľadovej plochy, zákazníckeho účtu, platby a formulárov. Snažíme sa, aby web mohol používať
        každý – aj s čítačkou obrazovky, len klávesnicou, so zväčšením textu alebo so zníženým videním farieb. Cieľom je súlad so štandardom{' '}
        <strong>WCAG 2.2 na úrovni AA</strong> (európska norma EN 301 549).
      </p>

      <h2>2. Stav súladu</h2>
      <p>
        Web je <strong>čiastočne v súlade</strong> s WCAG 2.2 AA. Nesúlady a výnimky sú uvedené v časti 4. Na ich odstránení priebežne pracujeme.
      </p>

      <h2>3. Ako je web prístupný</h2>
      <ul>
        <li>Celý web sa dá ovládať klávesnicou. Na začiatku každej stránky je odkaz „Preskočiť na obsah“ a aktuálny prvok je zreteľne zvýraznený.</li>
        <li>Stránky majú nadpisy v správnom poradí, menu a navigácia sú označené, jazyk stránky je slovenčina.</li>
        <li>Všetky polia formulárov majú popisky. Chyby sú popísané textom pri konkrétnom poli a čítačka ich oznámi.</li>
        <li>Farby textu a ovládacích prvkov spĺňajú kontrast najmenej 4,5 : 1 pre text a 3 : 1 pre rámčeky a ikony. Informácia nikdy nie je odovzdaná len farbou.</li>
        <li>Text sa dá zväčšiť na 200 % a stránka sa prispôsobí šírke 320 px bez vodorovného posúvania.</li>
        <li>Animácie sa spúšťajú len po prejdení myšou alebo po zameraní. Ak má zariadenie zapnuté „obmedziť pohyb“, animácie sa nespustia.</li>
        <li>Fotky majú alternatívny text. Ilustrácia komplexu na úvodnej stránke má textový popis a každá jej časť je dostupná aj ako bežný odkaz.</li>
        <li>Rezervácia: voľné a obsadené hodiny sú odlíšené textom, nielen farbou; celková cena sa po zmene oznámi čítačke.</li>
        <li>Prihlásenie nevyžaduje riešenie hádaniek – heslo aj kód z aplikácie sa dajú vložiť alebo doplniť správcom hesiel.</li>
        <li>Platba kartou online prebieha na stránke platobnej brány, ktorá má vlastné vyhlásenie o prístupnosti. Vždy je možné zaplatiť aj na recepcii alebo prevodom.</li>
        <li>Web podporuje režim vysokého kontrastu vo Windows.</li>
      </ul>

      <h2>4. Nedostupný obsah a výnimky</h2>
      <ul>
        <li>
          <strong>Animovaná ilustrácia komplexu</strong> na úvodnej stránke je dekoratívna. Rovnaké informácie a odkazy sú v zozname pod ňou.
        </li>
        <li>
          <strong>Ilustračná mapa</strong> na úvodnej stránke nie je skutočná mapa. Presnú adresu a odkaz na navigáciu nájdeš na stránke{' '}
          <Link href="/kontakt">Kontakt</Link>.
        </li>
        <li>
          <strong>Alternatívne texty niektorých fotiek</strong> sú zatiaľ všeobecné (napr. „Ľadová plocha – fotka“). Postupne ich nahrádzame presnými popismi.
        </li>
        <li>
          <strong>Skenovanie QR kódu na recepcii</strong> je určené personálu. Zákazník môže namiesto QR kódu povedať kód rezervácie (napr. ISP-ABC123).
        </li>
        <li>Web zatiaľ nebol testovaný skupinou používateľov so zdravotným znevýhodnením. Testovanie s čítačkami NVDA a VoiceOver plánujeme pred plným spustením.</li>
      </ul>

      <h2>5. Ako bolo vyhlásenie pripravené</h2>
      <p>
        Vyhlásenie bolo vypracované 20. 10. 2026 na základe vlastného posúdenia: kontrola zdrojového kódu podľa kritérií WCAG 2.2 AA, výpočet kontrastu farieb a
        kontrola ovládania klávesnicou. Vyhlásenie aktualizujeme pri každej väčšej zmene webu, najmenej raz ročne.
      </p>

      <h2>6. Spätná väzba a kontakt</h2>
      <p>
        Ak narazíš na časť webu, ktorú nevieš použiť, alebo potrebuješ informácie v inej podobe, napíš nám na {orTbd(site.email)}
        {site.phone ? `, zavolaj na ${site.phone}` : ''} alebo použi <Link href="/kontakt">kontaktný formulár</Link>. Odpovieme najneskôr do 30 dní. Rezerváciu ti
        medzitým radi vytvoríme telefonicky alebo na recepcii.
      </p>

      <h2>7. Dozor</h2>
      <p>
        Ak nie si spokojný s odpoveďou, môžeš sa obrátiť na orgán dozoru –{' '}
        <a href="https://www.soi.sk" rel="noopener noreferrer">
          Slovenskú obchodnú inšpekciu
        </a>{' '}
        (zákon č. 351/2022 Z. z. o požiadavkách na prístupnosť výrobkov a služieb).
      </p>
    </LegalPage>
  );
}
