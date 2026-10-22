'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { loginAction, resendVerificationAction } from '@/lib/actions/auth';
import { EMPTY, type CaptchaData } from '@/lib/formState';
import { Field } from '@/components/forms/Field';
import { CaptchaField, GuardFields } from '@/components/forms/Guard';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { DevLink } from '@/components/forms/DevLink';

export function LoginForm({ stamp, next, notice, captcha = null }: { stamp: string; next: string; notice?: string; captcha?: CaptchaData | null }) {
  const [state, action] = useActionState(loginAction, EMPTY);
  const v = state.values ?? {};
  const cap = state.captcha ?? captcha;
  return (
    <div className="form-stack">
      <form action={action} className="form" noValidate>
        <div className="au2__head">
          <h2 className="h-card">Prihlásenie</h2>
          <p className="au2__sub">
            Nemáš účet?{' '}
            <Link href="/registracia" className="link-red">
              Zaregistruj sa zadarmo
            </Link>
          </p>
        </div>
        <FormAlert error={state.error} success={state.error ? undefined : notice} />
        <GuardFields stamp={stamp} />
        <input type="hidden" name="next" value={next} />
        <Field label="E-mail" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={v.email} required maxLength={254} />
        <Field
          label="Heslo"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aside={
            <Link href="/zabudnute-heslo" className="link-red field__aside">
              Zabudnuté heslo?
            </Link>
          }
        />
        {cap ? <CaptchaField captcha={cap} error={state.errors?.captcha} /> : null}
        <SubmitButton>Prihlásiť sa</SubmitButton>
        <p className="au2__legal">
          Prihlásením súhlasíš s <Link href="/obchodne-podmienky">obchodnými podmienkami</Link>. Údaje spracúvame podľa{' '}
          <Link href="/ochrana-osobnych-udajov">zásad ochrany osobných údajov</Link>.
        </p>
      </form>
      {state.unverifiedEmail ? <ResendVerification email={state.unverifiedEmail} /> : null}
    </div>
  );
}

function ResendVerification({ email }: { email: string }) {
  const [state, action] = useActionState(resendVerificationAction, EMPTY);
  return (
    <form action={action} className="form form--sub">
      <input type="hidden" name="email" value={email} />
      <p className="muted">Odkaz na overenie neprišiel alebo vypršal?</p>
      <FormAlert error={state.error} success={state.success} />
      <DevLink href={state.devLink} />
      <SubmitButton variant="ghost">Poslať nový odkaz</SubmitButton>
    </form>
  );
}
