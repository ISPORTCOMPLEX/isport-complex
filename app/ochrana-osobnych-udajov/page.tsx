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
          <strong>Bezpečnosť</strong> – IP adresa, prehliadač a čas prihlásení a pokusov. Účel: ochrana účtov pred zneužitím. Právny základ: oprávnený záujem.
        </li>
        <li>
          <strong>Novinky</strong> – e-mail, len ak si o ne požiadal. Súhlas môžeš kedykoľvek odvolať v profile.
        </li>
      </ul>
      <h2>3. Ako dlho údaje uchovávame</h2>
      <p>
        Údaje účtu do jeho zmazania. Účtovné doklady 10 rokov podľa zákona o účtovníctve. Bezpečnostné záznamy najviac 12 mesiacov. Dopyty najviac 2 roky od
        vybavenia.
      </p>
      <h2>4. Komu údaje poskytujeme</h2>
      <p>
        Údaje spracúvajú len poverení zamestnanci a sprostredkovatelia, ktorí zabezpečujú prevádzku webu: hosting (Vercel, servery v EÚ – Frankfurt), databáza
        (Neon, EÚ – Frankfurt) a odosielanie e-mailov (Resend). Údaje nepredávame a nepoužívame na reklamu tretích strán.
      </p>
      <h2>5. Tvoje práva</h2>
      <p>
        Máš právo na prístup k údajom, ich opravu, vymazanie, obmedzenie spracúvania, prenosnosť a námietku. Kópiu údajov si stiahneš a účet zmažeš sám v časti Môj
        účet → Súkromie a údaje. Máš tiež právo podať sťažnosť na Úrad na ochranu osobných údajov SR.
      </p>
      <h2>6. Cookies</h2>
      <p>
        Web používa len nevyhnutné cookies na prihlásenie a bezpečnosť (relácia, dvojstupňové overenie). Nepoužívame analytické ani reklamné cookies, preto nežiadame
        súhlas.
      </p>
    </LegalPage>
  );
}
