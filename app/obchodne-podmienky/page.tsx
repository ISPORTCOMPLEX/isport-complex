import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { getBookingSettings } from '@/lib/booking/settings';
import { cardPaymentsEnabled, PAY_WINDOW_MIN } from '@/lib/payments/config';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Obchodné podmienky') };
}

export default async function ObchodnePodmienkyPage() {
  const t = await getT();
  const s = await getBookingSettings();
  const card = cardPaymentsEnabled();
  return (
    <LegalPage title={t('Obchodné podmienky')} updated="1. 11. 2026">
      <h2>{t('1. Úvodné ustanovenia')}</h2>
      <p>
        {t('Tieto obchodné podmienky upravujú rezerváciu a využívanie ľadovej plochy tréningovej hokejovej haly I-SPORT COMPLEX (ďalej „hala“) prostredníctvom webu, mobilnej aplikácie alebo recepcie. Rezerváciou zákazník potvrdzuje, že sa s podmienkami oboznámil a súhlasí s nimi.')}
      </p>
      <h2>{t('2. Účet a rezervácia')}</h2>
      <p>
        {t('Online rezervácia vyžaduje registráciu s overeným e-mailom. Registrovať sa môže osoba staršia ako 16 rokov. Zákazník je povinný uvádzať pravdivé údaje a chrániť svoje prihlasovacie údaje.')}
      </p>
      <p>
        {t('Rezervuje sa celá ľadová plocha po celých hodinách, šatňa je v cene a sprchy po tréningu si zákazník môže pridať za príplatok podľa cenníka. Rezervácia je záväzná okamihom potvrdenia na webe; potvrdenie a QR kód dostane zákazník aj e-mailom. Online je možné rezervovať najviac {maxDaysAhead} dní dopredu a najneskôr {leadMinutes} minút pred začiatkom.', { maxDaysAhead: s.maxDaysAhead, leadMinutes: s.leadMinutes })}  
      </p>
      <h2>{t('3. Cena a platba')}</h2>
      <p>
        {t('Ceny sú uvedené v cenníku na webe v eurách vrátane DPH a zahŕňajú šatňu a úpravu ľadu. Pre rezerváciu platí cena zobrazená pri jej potvrdení. Platiť je možné na recepcii pri príchode alebo bankovým prevodom podľa údajov v potvrdení rezervácie. Pri platbe prevodom je potrebné uhradiť cenu pred začiatkom rezervácie.')}
      </p>
      {card ? (
        <p>
          {t('Pri platbe kartou online (karta, Apple Pay, Google Pay) zákazník platí na zabezpečenej stránke platobnej brány; údaje o karte prevádzkovateľ nevidí ani neukladá. Termín je počas platby podržaný {PAY_WINDOW_MIN} minút. Ak platba v tomto čase neprebehne, rezervácia sa automaticky zruší a peniaze sa nestiahnu. Rezervácia zaplatená kartou je potvrdená okamihom prijatia platby. Pri bezplatnom zrušení v lehote podľa bodu 4 sa celá suma automaticky vráti na kartu, ktorou bola zaplatená; na účte zákazníka býva spravidla do 5 až 10 pracovných dní.', { PAY_WINDOW_MIN })} 
        </p>
      ) : null}
      <h2>{t('4. Zrušenie a presun')}</h2>
      <p>
        {t('Zákazník môže rezerváciu zrušiť alebo presunúť bezplatne v časti Môj účet najneskôr {cancelFreeHours} hodín pred jej začiatkom. Neskoršie zrušenie je možné len cez recepciu a hala nie je povinná vrátiť zaplatenú cenu. Ak zákazník na rezerváciu nepríde, cena sa nevracia.', { cancelFreeHours: s.cancelFreeHours })} 
      </p>
      <p>
        {t('Hala môže rezerváciu zrušiť z prevádzkových dôvodov (napr. porucha technológie). V takom prípade ponúkne náhradný termín alebo vráti zaplatenú cenu v plnej výške.')}
      </p>
      <h2>{t('5. Pravidlá v hale')}</h2>
      <ul>
        <li>{t('Na ľad je možné vstúpiť až po úprave ľadu, v čase rezervácie. Rezervácia končí presne v rezervovaný čas.')}</li>
        <li>{t('Na ľade je odporúčaná ochranná výstroj; osoby mladšie ako 15 rokov ju musia mať vždy.')}</li>
        <li>{t('Za maloleté osoby zodpovedá tréner alebo zákonný zástupca.')}</li>
        <li>{t('Zákazník zodpovedá za škodu, ktorú v hale spôsobí, a dodržiava pokyny personálu.')}</li>
        <li>{t('Šatňu je potrebné uvoľniť do 30 minút po skončení rezervácie.')}</li>
      </ul>
      <h2>{t('6. Reklamácie')}</h2>
      <p>
        {t('Reklamáciu služby (napr. zlý stav ľadu, skrátený čas) môže zákazník uplatniť bez zbytočného odkladu na recepcii alebo e-mailom. Hala ju vybaví do 30 dní. Spotrebiteľ sa môže obrátiť aj na Slovenskú obchodnú inšpekciu alebo využiť alternatívne riešenie sporov.')}
      </p>
      <h2>{t('7. Odstúpenie od zmluvy')}</h2>
      <p>
        {t('Rezervácia je službou súvisiacou s voľnočasovými aktivitami poskytovanou v dohodnutom termíne, preto spotrebiteľ nemá právo odstúpiť od zmluvy do 14 dní podľa § 7 ods. 6 písm. l) zákona č. 102/2014 Z. z. Tým nie je dotknuté bezplatné zrušenie podľa bodu 4.')}
      </p>
      <h2>{t('8. Záverečné ustanovenia')}</h2>
      <p>
        {t('Spracúvanie osobných údajov upravuje dokument Ochrana osobných údajov. Hala môže podmienky meniť; pre rezerváciu platia podmienky účinné v čase jej potvrdenia. Vzťahy neupravené týmito podmienkami sa riadia právom Slovenskej republiky.')}
      </p>
    </LegalPage>
  );
}
