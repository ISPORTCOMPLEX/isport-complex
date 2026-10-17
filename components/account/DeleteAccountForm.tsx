'use client';

import { useActionState } from 'react';
import { deleteAccountAction } from '@/lib/actions/account';
import { EMPTY } from '@/lib/formState';
import { Field } from '@/components/forms/Field';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';

export function DeleteAccountForm({ has2fa }: { has2fa: boolean }) {
  const [state, action] = useActionState(deleteAccountAction, EMPTY);
  const e = state.errors ?? {};
  return (
    <details className="tfa__more">
      <summary>Chcem zmazať účet</summary>
      <form action={action} className="form" noValidate>
        <FormAlert error={state.error} />
        <Field label="Heslo" name="password" type="password" autoComplete="current-password" error={e.password} required />
        {has2fa ? <Field label="Kód z aplikácie alebo záložný kód" name="code" autoComplete="one-time-code" error={e.code} required maxLength={20} /> : null}
        <Field label='Pre potvrdenie napíš „ZMAZAŤ“' name="confirm" error={e.confirm} required maxLength={20} autoComplete="off" />
        <SubmitButton variant="danger" full={false}>
          Natrvalo zmazať účet
        </SubmitButton>
      </form>
    </details>
  );
}
