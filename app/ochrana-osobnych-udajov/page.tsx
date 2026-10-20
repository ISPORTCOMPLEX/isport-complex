import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Ochrana osobných údajov' };

export default function OchranaPage() {
  return (
    <LegalPage title="Ochrana osobných údajov" updated="1. 11. 2026">
      <h2>1. Prevádzkovateľ</h2>
      <p>Prevádzkovateľom osobných údajov je spoločnosť uvedená vyššie. V otázkach ochrany údajov nás kontaktuj na uvedenom e-maile.</p>
      <h2>2. Aké údaje spracúvame a prečo</h2>
      <ul>
        <li>
          <strong>Účet</strong> – meno, priezvisko, e-mail, telefón, heslo (len ako bezpečný odtlačok), potvrdenie veku a súhlasu s podmienkami. Účel: vedenie účtu a
          rezervácií. Právny základ: plnenie zmluvy.
        </li>
        <li>
          <strong>Rezervácie a platby</strong> – termín, plocha, cena, spôsob a stav platby, kontakt na deň tréningu, tím, poznámka. Účel: poskytnutie služby, účtovníctvo.
          Právny základ: plnenie zmluvy a zákonná povinnosť.
        </li>
        <li>
          <strong>Dopyty</strong> – údaje z kontaktného formulára. Účel: odpoveď na dopyt. Právny základ: opatrenia pred uzavretím zmluvy a oprávnený záujem.
        </li>
        <li>
          <strong>Bezpečnosť</strong> – IP adresa, prehliadač a čas prihlásení a pokusov, zoznam prihlásených zariadení (relácií). Účel: ochrana účtov pred zneužitím. Právny základ: oprávnený záujem.
        </li>
        <li>
          <strong>Štatistika návštevnosti</strong> – navštívená stránka, doména webu, z ktorého si prišiel, typ zariadenia a prehliadača, krajina a čas na stránke. Neukladáme
          IP adresu ani cookies; návštevu rozpoznáme len v rámci jedného dňa pomocou jednosmerného odtlačku, ktorý sa každý deň mení. Ak máš v prehliadači zapnuté „Do Not
          Track“ alebo „Global Privacy Control“, nemeriame ťa vôbec. Účel: zlepšovanie webu a služieb. Právny základ: oprávnený záujem.
        </li>
        <li>
          <strong>Novinky</strong> – e-mail, len ak si o ne požiadal. Súhlas môžeš kedykoľvek odvolať v profile.
        </li>
      </ul>
      <h2>3. Ako dlho údaje uchovávame</h2>
      <p>
        Údaje účtu do jeho zmazania. Účtovné doklady 10 rokov podľa zákona o účtovníctve. Bezpečnostné záznamy najviac 12 mesiacov, prihlásené zariadenia do 7 dní po skončení platnosti relácie (najviac 30 dní). Dopyty najviac 2 roky od
        vybavenia. Štatistika návštevnosti 13 mesiacov.
      </p>
      <h2>4. Komu údaje poskytujeme</h2>
      <p>
        Údaje spracúvajú len poverení zamestnanci a sprostredkovatelia, ktorí zabezpečujú prevádzku webu: hosting (Vercel, servery v EÚ – Frankfurt), databáza
        (Neon, EÚ – Frankfurt), odosielanie e-mailov (Resend), externé úložisko fotiek webu a pri platbe kartou online platobná brána (Stripe Payments Europe, Írsko), ktorá spracúva údaje o karte priamo – my ich nevidíme ani neukladáme, dostaneme len informáciu o úspešnej platbe a jej identifikátor. Mapa Google na stránkach Úvod a Kontakt sa načíta až vtedy, keď na ňu klikneš; potom môže Google (Google Ireland Ltd.) spracúvať tvoju IP adresu a ukladať cookies podľa vlastných pravidiel. Údaje nepredávame a nepoužívame na reklamu tretích strán.
      </p>
      <h2>5. Tvoje práva</h2>
      <p>
        Máš právo na prístup k údajom, ich opravu, vymazanie, obmedzenie spracúvania, prenosnosť a námietku. Kópiu údajov si stiahneš a účet zmažeš sám v časti Môj
        účet → Súkromie a údaje. Máš tiež právo podať sťažnosť na Úrad na ochranu osobných údajov SR.
      </p>
      <h2>6. Cookies</h2>
      <p>
        Web používa len nevyhnutné cookies na prihlásenie a bezpečnosť (relácia, dvojstupňové overenie). Návštevnosť meriame bez cookies a nepoužívame reklamné
        cookies, preto nežiadame súhlas.
      </p>
    </LegalPage>
  );
}
