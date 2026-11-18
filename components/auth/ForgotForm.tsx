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
import { useT } from '@/lib/i18n/client';

export function ForgotForm({ stamp }: { stamp: string }) {
  const t = useT();
  const [state, action] = useActionState(forgotPasswordAction, EMPTY);
  if (state.done) {
    return (
      <div className="auth__done">
        <div className="auth__done-ic" aria-hidden="true">✉</div>
        {state.manual ? (
          <>
            <h2 className="h-card">{t('Ozvi sa recepcii')}</h2>
            <p>{t('E-maily momentálne neposielame. Zavolaj alebo príď na recepciu – po overení totožnosti ti pošlú odkaz na nové heslo (napr. SMS).')}</p>
          </>
        ) : (
          <>
            <h2 className="h-card">{t('Pozri si e-mail')}</h2>
            <p>
              {t('Ak k adrese')}{' '}<strong>{state.values?.email}</strong> {' '}{t('existuje účet, poslali sme na ňu odkaz na nastavenie nového hesla. Odkaz platí 1 hodinu.')}
            </p>
          </>
        )}
        <DevLink href={state.devLink} />
        <Link href="/prihlasenie" className="btn btn--ghost btn--full">
          {t('Späť na prihlásenie')}
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="form" noValidate>
      <h2 className="h-card">{t('Zabudnuté heslo')}</h2>
      <p className="muted form__text">{t('Zadaj e-mail, ktorým sa prihlasuješ. Pošleme ti odkaz na nastavenie nového hesla.')}</p>
      <FormAlert error={state.error} />
      <GuardFields stamp={stamp} />
      <Field label={t('E-mail')} name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email} error={state.errors?.email} required maxLength={254} />
      <SubmitButton>{t('Poslať odkaz')}</SubmitButton>
      <p className="auth__foot">
        <Link href="/prihlasenie" className="link-red">
          {t('Späť na prihlásenie')}
        </Link>
      </p>
    </form>
  );
}
