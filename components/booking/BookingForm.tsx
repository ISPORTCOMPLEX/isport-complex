'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { createBookingAction } from '@/lib/actions/booking';
import { EMPTY } from '@/lib/formState';
import { Check, Field } from '@/components/forms/Field';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';

type Props = {
  hidden: Record<string, string>;
  defaults: { contactName: string; contactPhone: string; teamName: string };
  cancelFreeHours: number;
};

export function BookingForm({ hidden, defaults, cancelFreeHours }: Props) {
  const [state, action] = useActionState(createBookingAction, EMPTY);
  const v = state.values ?? { ...defaults, platba: 'ONSITE', note: '' };
  const e = state.errors ?? {};
  return (
    <form action={action} className="form" noValidate>
      {Object.entries(hidden).map(([k, val]) => (
        <input key={k} type="hidden" name={k} value={val} />
      ))}
      <h2 className="h-card">Kontakt na deň tréningu</h2>
      <FormAlert error={state.error} />
      <div className="form__row">
        <Field label="Meno a priezvisko" name="contactName" autoComplete="name" defaultValue={v.contactName} error={e.contactName} required maxLength={120} />
        <Field label="Telefón" name="contactPhone" type="tel" autoComplete="tel" inputMode="tel" defaultValue={v.contactPhone} error={e.contactPhone} required maxLength={30} placeholder="+421 9xx xxx xxx" />
      </div>
      <Field label="Tím alebo klub" name="teamName" defaultValue={v.teamName} optional maxLength={120} placeholder="napr. HK Juniori Košice" />
      <Field label="Poznámka pre recepciu" name="note" defaultValue={v.note} optional maxLength={500} placeholder="napr. potrebujeme bránky, kužele…" />

      <fieldset className="pay">
        <legend className="h-card">Platba</legend>
        {e.platba ? <small className="field__err">{e.platba}</small> : null}
        <label className="pay__opt">
          <input type="radio" name="platba" value="ONSITE" defaultChecked={v.platba !== 'TRANSFER'} />
          <span>
            <strong>Na recepcii</strong>
            <small>Kartou alebo hotovosťou pri príchode.</small>
          </span>
        </label>
        <label className="pay__opt">
          <input type="radio" name="platba" value="TRANSFER" defaultChecked={v.platba === 'TRANSFER'} />
          <span>
            <strong>Bankovým prevodom</strong>
            <small>Platobné údaje pošleme e-mailom. Vhodné pre kluby a firmy.</small>
          </span>
        </label>
        <div className="pay__opt pay__opt--off" aria-disabled="true">
          <span className="pay__radio" aria-hidden="true" />
          <span>
            <strong>Kartou online</strong>
            <small>Pripravujeme – Apple Pay, Google Pay a karty.</small>
          </span>
        </div>
      </fieldset>

      <Check name="terms" error={e.terms}>
        Súhlasím s{' '}
        <Link href="/obchodne-podmienky" target="_blank" className="link-red">
          obchodnými podmienkami
        </Link>
        . Beriem na vedomie, že rezerváciu zruším online najneskôr {cancelFreeHours} hodín pred začiatkom.
      </Check>
      <SubmitButton>Potvrdiť rezerváciu</SubmitButton>
    </form>
  );
}
