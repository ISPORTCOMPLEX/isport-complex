'use client';

import { useActionState } from 'react';
import { updateProfileAction } from '@/lib/actions/account';
import { EMPTY } from '@/lib/formState';
import { Check, Field } from '@/components/forms/Field';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';

export function ProfileForm(props: { firstName: string; lastName: string; phone: string; marketing: boolean }) {
  const [state, action] = useActionState(updateProfileAction, EMPTY);
  const v = state.values ?? { firstName: props.firstName, lastName: props.lastName, phone: props.phone, marketing: props.marketing ? 'on' : '' };
  const e = state.errors ?? {};
  return (
    <form action={action} className="form" noValidate>
      <h2 className="h-card">Kontaktné údaje</h2>
      <FormAlert error={state.error} success={state.success} />
      <div className="form__row">
        <Field label="Meno" name="firstName" autoComplete="given-name" defaultValue={v.firstName} error={e.firstName} required maxLength={60} />
        <Field label="Priezvisko" name="lastName" autoComplete="family-name" defaultValue={v.lastName} error={e.lastName} required maxLength={60} />
      </div>
      <Field label="Telefón" name="phone" type="tel" autoComplete="tel" inputMode="tel" defaultValue={v.phone} error={e.phone} optional placeholder="+421 9xx xxx xxx" maxLength={30} />
      <Check name="marketing" defaultChecked={v.marketing === 'on'} key={v.marketing}>
        Chcem dostávať novinky a akcie e-mailom.
      </Check>
      <SubmitButton full={false}>Uložiť zmeny</SubmitButton>
    </form>
  );
}
