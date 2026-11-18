'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { createBookingAction } from '@/lib/actions/booking';
import { EMPTY } from '@/lib/formState';
import { Check, Field } from '@/components/forms/Field';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { useT } from '@/lib/i18n/client';

type Props = {
  hidden: Record<string, string>;
  defaults: { contactName: string; contactPhone: string; teamName: string };
  cancelFreeHours: number;
  moving?: string | null;
  cardEnabled?: boolean; // platobná brána zapnutá (PAYMENTS_PROVIDER) – inak sa karta len ukáže ako „pripravujeme“
  cardTest?: boolean;
};

export function BookingForm({ hidden, defaults, cancelFreeHours, moving = null, cardEnabled = false, cardTest = false }: Props) {
  const t = useT();
  const [state, action] = useActionState(createBookingAction, EMPTY);
  const v = state.values ?? { ...defaults, platba: 'ONSITE', note: '' };
  const e = state.errors ?? {};
  return (
    <form action={action} className="form" noValidate>
      {Object.entries(hidden).map(([k, val]) => (
        <input key={k} type="hidden" name={k} value={val} />
      ))}
      <h2 className="h-card">{t('Kontakt na deň tréningu')}</h2>
      <FormAlert error={state.error} />
      <div className="form__row">
        <Field label={t('Meno a priezvisko')} name="contactName" autoComplete="name" defaultValue={v.contactName} error={e.contactName} required maxLength={120} />
        <Field label={t('Telefón')} name="contactPhone" type="tel" autoComplete="tel" inputMode="tel" defaultValue={v.contactPhone} error={e.contactPhone} required maxLength={30} placeholder={t('+421 9xx xxx xxx')} />
      </div>
      <Field label={t('Tím alebo klub')} name="teamName" defaultValue={v.teamName} optional maxLength={120} placeholder={t('napr. HK Juniori Košice')} />
      <Field label={t('Poznámka pre recepciu')} name="note" defaultValue={v.note} optional maxLength={500} placeholder={t('napr. potrebujeme bránky, kužele…')} />

      <fieldset className="pay" aria-describedby={e.platba ? 'platba-err' : undefined}>
        <legend className="h-card">{t('Platba')}</legend>
        {e.platba ? (
          <small id="platba-err" className="field__err">
            {e.platba}
          </small>
        ) : null}
        <label className="pay__opt">
          <input type="radio" name="platba" value="ONSITE" defaultChecked={v.platba !== 'TRANSFER' && v.platba !== 'CARD'} />
          <span>
            <strong>{t('Na recepcii')}</strong>
            <small>{t('Kartou alebo hotovosťou pri príchode.')}</small>
          </span>
        </label>
        <label className="pay__opt">
          <input type="radio" name="platba" value="TRANSFER" defaultChecked={v.platba === 'TRANSFER'} />
          <span>
            <strong>{t('Bankovým prevodom')}</strong>
            <small>{t('Platobné údaje pošleme e-mailom. Vhodné pre kluby a firmy.')}</small>
          </span>
        </label>
        {cardEnabled && !moving ? (
          <label className="pay__opt">
            <input type="radio" name="platba" value="CARD" defaultChecked={v.platba === 'CARD'} />
            <span>
              <strong>{t('Kartou online')}{cardTest ? t(' (testovací režim)') : ''}</strong>
              <small>{t('Karta, Apple Pay alebo Google Pay na zabezpečenej stránke platobnej brány. Termín ti podržíme 30 minút.')}</small>
            </span>
          </label>
        ) : (
          <div className="pay__opt pay__opt--off" aria-disabled="true">
            <span className="pay__radio" aria-hidden="true" />
            <span>
              <strong>{t('Kartou online')}</strong>
              <small>{moving ? t('Pri presune rezervácie sa kartou online neplatí.') : t('Pripravujeme – Apple Pay, Google Pay a karty.')}</small>
            </span>
          </div>
        )}
      </fieldset>

      <Check name="terms" error={e.terms}>
        {t('Súhlasím s')}{' '}
        
        <Link href="/obchodne-podmienky" target="_blank" className="link-red">
          {t('obchodnými podmienkami')}<span className="sr-only"> {' '}{t('(otvorí sa v novom okne)')}</span>
        </Link>
        {t('. Beriem na vedomie, že rezerváciu zruším online najneskôr {cancelFreeHours} hodín pred začiatkom.', { cancelFreeHours })} 
      </Check>
      {moving ? <p className="rez__move">{t('Po potvrdení sa pôvodná rezervácia {moving} zruší a jej čas sa uvoľní.', { moving })} </p> : null}
      <SubmitButton>{moving ? t('Potvrdiť presun') : t('Potvrdiť rezerváciu')}</SubmitButton>
    </form>
  );
}
