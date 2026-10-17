'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { forgotPasswordAction } from '@/lib/actions/auth';
import { EMPTY } from '@/lib/formState';
import { Field } from '@/components/forms/Field';
import { GuardFields } from '@/components/forms/Guard';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { DevLink } from '@/components/forms/DevLink';

export function ForgotForm({ stamp }: { stamp: string }) {
  const [state, action] = useActionState(forgotPasswordAction, EMPTY);
  if (state.done) {
    return (
      <div className="auth__done">
        <div className="auth__done-ic" aria-hidden="true">✉</div>
        <h2 className="h-card">Pozri si e-mail</h2>
        <p>
          Ak k adrese <strong>{state.values?.email}</strong> existuje účet, poslali sme na ňu odkaz na nastavenie nového hesla. Odkaz platí 1 hodinu.
        </p>
        <DevLink href={state.devLink} />
        <Link href="/prihlasenie" className="btn btn--ghost btn--full">
          Späť na prihlásenie
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="form" noValidate>
      <h2 className="h-card">Zabudnuté heslo</h2>
      <p className="muted form__text">Zadaj e-mail, ktorým sa prihlasuješ. Pošleme ti odkaz na nastavenie nového hesla.</p>
      <FormAlert error={state.error} />
      <GuardFields stamp={stamp} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email} error={state.errors?.email} required maxLength={254} />
      <SubmitButton>Poslať odkaz</SubmitButton>
      <p className="auth__foot">
        <Link href="/prihlasenie" className="link-red">
          Späť na prihlásenie
        </Link>
      </p>
    </form>
  );
}
