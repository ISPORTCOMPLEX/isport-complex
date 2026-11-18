'use client';

import { useActionState } from 'react';
import { resetPasswordAction } from '@/lib/actions/auth';
import { EMPTY } from '@/lib/formState';
import { Field } from '@/components/forms/Field';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { useT } from '@/lib/i18n/client';

export function ResetForm({ token }: { token: string }) {
  const t = useT();
  const [state, action] = useActionState(resetPasswordAction, EMPTY);
  const e = state.errors ?? {};
  return (
    <form action={action} className="form" noValidate>
      <h2 className="h-card">{t('Nové heslo')}</h2>
      <FormAlert error={state.error} />
      <input type="hidden" name="token" value={token} />
      <Field label={t('Nové heslo')} name="password" type="password" autoComplete="new-password" error={e.password} hint={t('Aspoň 8 znakov, malé a veľké písmeno a číslica.')} required autoFocus />
      <Field label={t('Nové heslo znova')} name="password2" type="password" autoComplete="new-password" error={e.password2} required />
      <SubmitButton>{t('Uložiť heslo')}</SubmitButton>
    </form>
  );
}
