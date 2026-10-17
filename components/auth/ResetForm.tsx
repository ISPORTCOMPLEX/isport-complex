'use client';

import { useActionState } from 'react';
import { resetPasswordAction } from '@/lib/actions/auth';
import { EMPTY } from '@/lib/formState';
import { Field } from '@/components/forms/Field';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, EMPTY);
  const e = state.errors ?? {};
  return (
    <form action={action} className="form" noValidate>
      <h2 className="h-card">Nové heslo</h2>
      <FormAlert error={state.error} />
      <input type="hidden" name="token" value={token} />
      <Field label="Nové heslo" name="password" type="password" autoComplete="new-password" error={e.password} hint="Aspoň 8 znakov, malé a veľké písmeno a číslica." required autoFocus />
      <Field label="Nové heslo znova" name="password2" type="password" autoComplete="new-password" error={e.password2} required />
      <SubmitButton>Uložiť heslo</SubmitButton>
    </form>
  );
}
