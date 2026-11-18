'use client';

import { useActionState } from 'react';
import { changePasswordAction } from '@/lib/actions/account';
import { EMPTY } from '@/lib/formState';
import { Field } from '@/components/forms/Field';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { useT } from '@/lib/i18n/client';

export function PasswordForm() {
  const t = useT();
  const [state, action] = useActionState(changePasswordAction, EMPTY);
  const e = state.errors ?? {};
  return (
    <form action={action} className="form" noValidate>
      <h2 className="h-card">{t('Zmena hesla')}</h2>
      <FormAlert error={state.error} success={state.success} />
      <Field label={t('Súčasné heslo')} name="current" type="password" autoComplete="current-password" error={e.current} required />
      <div className="form__row">
        <Field label={t('Nové heslo')} name="password" type="password" autoComplete="new-password" error={e.password} hint={t('Aspoň 8 znakov, malé a veľké písmeno a číslica.')} required />
        <Field label={t('Nové heslo znova')} name="password2" type="password" autoComplete="new-password" error={e.password2} required />
      </div>
      <SubmitButton full={false}>{t('Zmeniť heslo')}</SubmitButton>
    </form>
  );
}
