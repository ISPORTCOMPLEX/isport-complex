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
import { useT } from '@/lib/i18n/client';

export function RegisterForm({ captcha, stamp }: { captcha: CaptchaData; stamp: string }) {
  const t = useT();
  const [state, action] = useActionState(registerAction, EMPTY);
  const v = state.values ?? {};
  const e = state.errors ?? {};

  if (state.done) {
    return (
      <div className="auth__done">
        <div className="auth__done-ic" aria-hidden="true">✉</div>
        {state.manual ? (
          <>
            <h2 className="h-card">{t('Registrácia prijatá')}</h2>
            <p>
              {t('Účet pre')}{' '}<strong>{v.email}</strong> {' '}{t('čaká na aktiváciu. Kým spustíme e-maily, aktivuje ho recepcia – zvyčajne do 24 hodín. Ak sa ponáhľaš, zavolaj nám.')}
            </p>
          </>
        ) : (
          <>
            <h2 className="h-card">{t('Skontroluj si e-mail')}</h2>
            <p>
              {t('Na adresu')}{' '}<strong>{v.email}</strong> {' '}{t('sme poslali odkaz na overenie. Platí 24 hodín. Ak e-mail nevidíš, pozri priečinok Spam alebo Reklamy.')}
            </p>
          </>
        )}
        <DevLink href={state.devLink} />
        <Link href="/prihlasenie" className="btn btn--ghost btn--full">
          {t('Prejsť na prihlásenie')}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="form" noValidate>
      <h2 className="h-card">{t('Vytvoriť účet')}</h2>
      <FormAlert error={state.error} />
      <GuardFields stamp={stamp} />
      <div className="form__row">
        <Field label={t('Meno')} name="firstName" autoComplete="given-name" defaultValue={v.firstName} error={e.firstName} required maxLength={60} />
        <Field label={t('Priezvisko')} name="lastName" autoComplete="family-name" defaultValue={v.lastName} error={e.lastName} required maxLength={60} />
      </div>
      <Field label={t('E-mail')} name="email" type="email" autoComplete="email" inputMode="email" defaultValue={v.email} error={e.email} required maxLength={254} />
      <Field label={t('Telefón')} name="phone" type="tel" autoComplete="tel" inputMode="tel" defaultValue={v.phone} error={e.phone} optional placeholder={t('+421 9xx xxx xxx')} maxLength={30} />
      <Field label={t('Heslo')} name="password" type="password" autoComplete="new-password" error={e.password} hint={t('Aspoň 8 znakov, malé a veľké písmeno a číslica.')} required />
      <Field label={t('Heslo znova')} name="password2" type="password" autoComplete="new-password" error={e.password2} required />
      <CaptchaField captcha={state.captcha ?? captcha} error={e.captcha} />
      <div className="form__checks">
        <Check name="age" error={e.age}>
          {t('Mám aspoň 16 rokov.')}
        </Check>
        <Check name="terms" error={e.terms}>
          {t('Súhlasím s')}{' '}
          
          <Link href="/obchodne-podmienky" target="_blank" className="link-red">
            {t('obchodnými podmienkami')}<span className="sr-only"> {' '}{t('(otvorí sa v novom okne)')}</span>
          </Link>{' '}{t('a beriem na vedomie')}{' '}
          
          
          <Link href="/ochrana-osobnych-udajov" target="_blank" className="link-red">
            {t('ochranu osobných údajov')}<span className="sr-only"> {' '}{t('(otvorí sa v novom okne)')}</span>
          </Link>
          .
        </Check>
        <Check name="marketing">{t('Chcem dostávať novinky a akcie e-mailom (nepovinné, kedykoľvek sa dá zrušiť).')}</Check>
      </div>
      <SubmitButton>{t('Zaregistrovať sa')}</SubmitButton>
      <p className="auth__foot">
        {t('Už máš účet?')}{' '}
        
        <Link href="/prihlasenie" className="link-red">
          {t('Prihlás sa')}
        </Link>
      </p>
    </form>
  );
}
