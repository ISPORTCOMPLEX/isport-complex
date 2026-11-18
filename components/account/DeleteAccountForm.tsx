'use client';

import { useActionState } from 'react';
import { deleteAccountAction } from '@/lib/actions/account';
import { EMPTY } from '@/lib/formState';
import { Field } from '@/components/forms/Field';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { useT } from '@/lib/i18n/client';

export function DeleteAccountForm({ has2fa }: { has2fa: boolean }) {
  const t = useT();
  const [state, action] = useActionState(deleteAccountAction, EMPTY);
  const e = state.errors ?? {};
  return (
    <details className="tfa__more">
      <summary>{t('Chcem zmazať účet')}</summary>
      <form action={action} className="form" noValidate>
        <FormAlert error={state.error} />
        <Field label={t('Heslo')} name="password" type="password" autoComplete="current-password" error={e.password} required />
        {has2fa ? <Field label={t('Kód z aplikácie alebo záložný kód')} name="code" autoComplete="one-time-code" error={e.code} required maxLength={20} /> : null}
        <Field label={t('Pre potvrdenie napíš „ZMAZAŤ“')} name="confirm" error={e.confirm} required maxLength={20} autoComplete="off" />
        <SubmitButton variant="danger" full={false}>
          {t('Natrvalo zmazať účet')}
        </SubmitButton>
      </form>
    </details>
  );
}
