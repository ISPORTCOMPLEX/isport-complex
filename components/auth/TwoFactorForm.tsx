'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { twoFactorLoginAction } from '@/lib/actions/auth';
import { EMPTY } from '@/lib/formState';
import { Field } from '@/components/forms/Field';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { useT } from '@/lib/i18n/client';

export function TwoFactorForm() {
  const t = useT();
  const [state, action] = useActionState(twoFactorLoginAction, EMPTY);
  return (
    <form action={action} className="form" noValidate>
      <h2 className="h-card">{t('Overovací kód')}</h2>
      <p className="muted form__text">{t('Zadaj 6-miestny kód z aplikácie Google Authenticator, Microsoft Authenticator a pod. Ak nemáš telefón, použi jeden zo záložných kódov.')}</p>
      <FormAlert error={state.error} />
      <Field label={t('Kód')} name="code" autoComplete="one-time-code" inputMode="text" maxLength={20} required autoFocus placeholder="123 456" />
      <SubmitButton>{t('Overiť a prihlásiť')}</SubmitButton>
      <p className="auth__foot">
        <Link href="/prihlasenie" className="link-red">
          {t('Späť na prihlásenie')}
        </Link>
      </p>
    </form>
  );
}
