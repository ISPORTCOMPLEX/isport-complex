'use client';

import { useActionState } from 'react';
import { updateProfileAction } from '@/lib/actions/account';
import { EMPTY } from '@/lib/formState';
import { Check, Field } from '@/components/forms/Field';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { useT } from '@/lib/i18n/client';

export function ProfileForm(props: { firstName: string; lastName: string; phone: string; marketing: boolean }) {
  const t = useT();
  const [state, action] = useActionState(updateProfileAction, EMPTY);
  const v = state.values ?? { firstName: props.firstName, lastName: props.lastName, phone: props.phone, marketing: props.marketing ? 'on' : '' };
  const e = state.errors ?? {};
  return (
    <form action={action} className="form" noValidate>
      <h2 className="h-card">{t('Kontaktné údaje')}</h2>
      <FormAlert error={state.error} success={state.success} />
      <div className="form__row">
        <Field label={t('Meno')} name="firstName" autoComplete="given-name" defaultValue={v.firstName} error={e.firstName} required maxLength={60} />
        <Field label={t('Priezvisko')} name="lastName" autoComplete="family-name" defaultValue={v.lastName} error={e.lastName} required maxLength={60} />
      </div>
      <Field label={t('Telefón')} name="phone" type="tel" autoComplete="tel" inputMode="tel" defaultValue={v.phone} error={e.phone} optional placeholder={t('+421 9xx xxx xxx')} maxLength={30} />
      <Check name="marketing" defaultChecked={v.marketing === 'on'} key={v.marketing}>
        {t('Chcem dostávať novinky a akcie e-mailom.')}
      </Check>
      <SubmitButton full={false}>{t('Uložiť zmeny')}</SubmitButton>
    </form>
  );
}
