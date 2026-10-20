'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { registerAction } from '@/lib/actions/auth';
import { EMPTY, type CaptchaData } from '@/lib/formState';
import { Check, Field } from '@/components/forms/Field';
import { CaptchaField, GuardFields } from '@/components/forms/Guard';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { DevLink } from '@/components/forms/DevLink';

export function RegisterForm({ captcha, stamp }: { captcha: CaptchaData; stamp: string }) {
  const [state, action] = useActionState(registerAction, EMPTY);
  const v = state.values ?? {};
  const e = state.errors ?? {};

  if (state.done) {
    return (
      <div className="auth__done">
        <div className="auth__done-ic" aria-hidden="true">✉</div>
        {state.manual ? (
          <>
            <h2 className="h-card">Registrácia prijatá</h2>
            <p>
              Účet pre <strong>{v.email}</strong> čaká na aktiváciu. Kým spustíme e-maily, aktivuje ho recepcia – zvyčajne do 24 hodín. Ak sa ponáhľaš, zavolaj nám.
            </p>
          </>
        ) : (
          <>
            <h2 className="h-card">Skontroluj si e-mail</h2>
            <p>
              Na adresu <strong>{v.email}</strong> sme poslali odkaz na overenie. Platí 24 hodín. Ak e-mail nevidíš, pozri priečinok Spam alebo Reklamy.
            </p>
          </>
        )}
        <DevLink href={state.devLink} />
        <Link href="/prihlasenie" className="btn btn--ghost btn--full">
          Prejsť na prihlásenie
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="form" noValidate>
      <h2 className="h-card">Vytvoriť účet</h2>
      <FormAlert error={state.error} />
      <GuardFields stamp={stamp} />
      <div className="form__row">
        <Field label="Meno" name="firstName" autoComplete="given-name" defaultValue={v.firstName} error={e.firstName} required maxLength={60} />
        <Field label="Priezvisko" name="lastName" autoComplete="family-name" defaultValue={v.lastName} error={e.lastName} required maxLength={60} />
      </div>
      <Field label="E-mail" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={v.email} error={e.email} required maxLength={254} />
      <Field label="Telefón" name="phone" type="tel" autoComplete="tel" inputMode="tel" defaultValue={v.phone} error={e.phone} optional placeholder="+421 9xx xxx xxx" maxLength={30} />
      <Field label="Heslo" name="password" type="password" autoComplete="new-password" error={e.password} hint="Aspoň 8 znakov, malé a veľké písmeno a číslica." required />
      <Field label="Heslo znova" name="password2" type="password" autoComplete="new-password" error={e.password2} required />
      <CaptchaField captcha={state.captcha ?? captcha} error={e.captcha} />
      <div className="form__checks">
        <Check name="age" error={e.age}>
          Mám aspoň 16 rokov.
        </Check>
        <Check name="terms" error={e.terms}>
          Súhlasím s{' '}
          <Link href="/obchodne-podmienky" target="_blank" className="link-red">
            obchodnými podmienkami
          </Link>{' '}
          a beriem na vedomie{' '}
          <Link href="/ochrana-osobnych-udajov" target="_blank" className="link-red">
            ochranu osobných údajov
          </Link>
          .
        </Check>
        <Check name="marketing">Chcem dostávať novinky a akcie e-mailom (nepovinné, kedykoľvek sa dá zrušiť).</Check>
      </div>
      <SubmitButton>Zaregistrovať sa</SubmitButton>
      <p className="auth__foot">
        Už máš účet?{' '}
        <Link href="/prihlasenie" className="link-red">
          Prihlás sa
        </Link>
      </p>
    </form>
  );
}
