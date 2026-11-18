import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Ochrana osobných údajov') };
}

export default async function OchranaPage() {
  const t = await getT();
  return (
    <LegalPage title={t('Ochrana osobných údajov')} updated="1. 11. 2026">
      <h2>{t('1. Prevádzkovateľ')}</h2>
      <p>{t('Prevádzkovateľom osobných údajov je spoločnosť uvedená vyššie. V otázkach ochrany údajov nás kontaktuj na uvedenom e-maile.')}</p>
      <h2>{t('2. Aké údaje spracúvame a prečo')}</h2>
      <ul>
        <li>
          <strong>{t('Účet')}</strong> {' '}{t('– meno, priezvisko, e-mail, telefón, heslo (len ako bezpečný odtlačok), potvrdenie veku a súhlasu s podmienkami. Účel: vedenie účtu a rezervácií. Právny základ: plnenie zmluvy.')}
        </li>
        <li>
          <strong>{t('Rezervácie a platby')}</strong> {' '}{t('– termín, plocha, cena, spôsob a stav platby, kontakt na deň tréningu, tím, poznámka. Účel: poskytnutie služby, účtovníctvo. Právny základ: plnenie zmluvy a zákonná povinnosť.')}
        </li>
        <li>
          <strong>{t('Dopyty')}</strong> {' '}{t('– údaje z kontaktného formulára. Účel: odpoveď na dopyt. Právny základ: opatrenia pred uzavretím zmluvy a oprávnený záujem.')}
        </li>
        <li>
          <strong>{t('Bezpečnosť')}</strong> {' '}{t('– IP adresa, prehliadač a čas prihlásení a pokusov, zoznam prihlásených zariadení (relácií). Účel: ochrana účtov pred zneužitím. Právny základ: oprávnený záujem.')}
        </li>
        <li>
          <strong>{t('Štatistika návštevnosti')}</strong> {' '}{t('– navštívená stránka, doména webu, z ktorého si prišiel, typ zariadenia a prehliadača, krajina a čas na stránke. Neukladáme IP adresu ani cookies; návštevu rozpoznáme len v rámci jedného dňa pomocou jednosmerného odtlačku, ktorý sa každý deň mení. Ak máš v prehliadači zapnuté „Do Not Track“ alebo „Global Privacy Control“, nemeriame ťa vôbec. Účel: zlepšovanie webu a služieb. Právny základ: oprávnený záujem.')}
        </li>
        <li>
          <strong>{t('Novinky')}</strong> {' '}{t('– e-mail, len ak si o ne požiadal. Súhlas môžeš kedykoľvek odvolať v profile.')}
        </li>
      </ul>
      <h2>{t('3. Ako dlho údaje uchovávame')}</h2>
      <p>
        {t('Údaje účtu do jeho zmazania. Účtovné doklady 10 rokov podľa zákona o účtovníctve. Bezpečnostné záznamy najviac 12 mesiacov, prihlásené zariadenia do 7 dní po skončení platnosti relácie (najviac 30 dní). Dopyty najviac 2 roky od vybavenia. Štatistika návštevnosti 13 mesiacov.')}
      </p>
      <h2>{t('4. Komu údaje poskytujeme')}</h2>
      <p>
        {t('Údaje spracúvajú len poverení zamestnanci a sprostredkovatelia, ktorí zabezpečujú prevádzku webu: hosting (Vercel, servery v EÚ – Frankfurt), databáza (Neon, EÚ – Frankfurt), odosielanie e-mailov (Resend), externé úložisko fotiek webu a pri platbe kartou online platobná brána (Stripe Payments Europe, Írsko), ktorá spracúva údaje o karte priamo – my ich nevidíme ani neukladáme, dostaneme len informáciu o úspešnej platbe a jej identifikátor. Mapa Google na stránkach Úvod a Kontakt sa načíta až vtedy, keď na ňu klikneš; potom môže Google (Google Ireland Ltd.) spracúvať tvoju IP adresu a ukladať cookies podľa vlastných pravidiel. Údaje nepredávame a nepoužívame na reklamu tretích strán.')}
      </p>
      <h2>{t('5. Tvoje práva')}</h2>
      <p>
        {t('Máš právo na prístup k údajom, ich opravu, vymazanie, obmedzenie spracúvania, prenosnosť a námietku. Kópiu údajov si stiahneš a účet zmažeš sám v časti Môj účet → Súkromie a údaje. Máš tiež právo podať sťažnosť na Úrad na ochranu osobných údajov SR.')}
      </p>
      <h2>{t('6. Cookies')}</h2>
      <p>
        {t('Web používa len nevyhnutné cookies na prihlásenie a bezpečnosť (relácia, dvojstupňové overenie). Návštevnosť meriame bez cookies a nepoužívame reklamné cookies, preto nežiadame súhlas.')}
      </p>
    </LegalPage>
  );
}
