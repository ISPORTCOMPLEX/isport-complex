'use client';

import { useActionState } from 'react';
import { createInquiryAction } from '@/lib/actions/inquiry';
import { EMPTY } from '@/lib/formState';
import { Field } from '@/components/forms/Field';
import { GuardFields } from '@/components/forms/Guard';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { useT } from '@/lib/i18n/client';

export function InquiryForm({ type, stamp, defaults }: { type: 'CONTACT' | 'CLUB'; stamp: string; defaults?: { name?: string; email?: string; phone?: string } }) {
  const t = useT();
  const [state, action] = useActionState(createInquiryAction, EMPTY);
  const v: Record<string, string | undefined> = state.values ?? defaults ?? {};
  const e = state.errors ?? {};
  if (state.done) {
    return (
      <div className="auth__done">
        <div className="auth__done-ic auth__done-ic--ok" aria-hidden="true">✓</div>
        <h2 className="h-card">{t('Ďakujeme,')}{' '}{state.values?.name?.split(' ')[0]}</h2>
        <p>{t('Správu sme prijali a ozveme sa ti najneskôr do 2 pracovných dní. Potvrdenie sme poslali aj na tvoj e-mail.')}</p>
      </div>
    );
  }
  return (
    <form action={action} className="form" noValidate>
      <input type="hidden" name="type" value={type} />
      <GuardFields stamp={stamp} />
      <h2 className="h-card">{type === 'CLUB' ? t('Dopyt na sezónny prenájom') : t('Napíš nám')}</h2>
      <FormAlert error={state.error} />
      <div className="form__row">
        <Field label={t('Meno a priezvisko')} name="name" autoComplete="name" defaultValue={v.name} error={e.name} required maxLength={120} />
        <Field label={t('E-mail')} name="email" type="email" autoComplete="email" inputMode="email" defaultValue={v.email} error={e.email} required maxLength={254} />
      </div>
      <div className="form__row">
        <Field label={t('Telefón')} name="phone" type="tel" autoComplete="tel" inputMode="tel" defaultValue={v.phone} error={e.phone} optional maxLength={30} />
        {type === 'CLUB' ? (
          <Field label={t('Klub, škola alebo firma')} name="organization" autoComplete="organization" defaultValue={v.organization} error={e.organization} required maxLength={150} />
        ) : (
          <Field label={t('Predmet')} name="subject" defaultValue={v.subject} optional maxLength={150} />
        )}
      </div>
      {type === 'CLUB' ? (
        <div className="form__row">
          <Field label={t('Obdobie')} name="term" defaultValue={v.term} optional maxLength={150} placeholder={t('napr. september – apríl')} />
          <Field label={t('Dni a časy')} name="slots" defaultValue={v.slots} optional maxLength={300} placeholder={t('napr. Po, St, Pi 17:00 – 19:00')} />
        </div>
      ) : null}
      <div className={`field${e.message ? ' field--error' : ''}`}>
        <label htmlFor="inq-message">{t('Správa')}</label>
        <textarea id="inq-message" name="message" rows={5} maxLength={3000} defaultValue={v.message} required className="textarea" aria-invalid={e.message ? true : undefined} />
        {e.message ? <small className="field__err">{e.message}</small> : null}
      </div>
      <SubmitButton>{t('Odoslať')}</SubmitButton>
      <p className="muted u-m0-13">
        {t('Údaje použijeme len na odpoveď na tvoj dopyt.')}
      </p>
    </form>
  );
}
