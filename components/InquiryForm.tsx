'use client';

import { useActionState } from 'react';
import { createInquiryAction } from '@/lib/actions/inquiry';
import { EMPTY } from '@/lib/formState';
import { Field } from '@/components/forms/Field';
import { GuardFields } from '@/components/forms/Guard';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';

export function InquiryForm({ type, stamp, defaults }: { type: 'CONTACT' | 'CLUB'; stamp: string; defaults?: { name?: string; email?: string; phone?: string } }) {
  const [state, action] = useActionState(createInquiryAction, EMPTY);
  const v: Record<string, string | undefined> = state.values ?? defaults ?? {};
  const e = state.errors ?? {};
  if (state.done) {
    return (
      <div className="auth__done">
        <div className="auth__done-ic auth__done-ic--ok" aria-hidden="true">✓</div>
        <h2 className="h-card">Ďakujeme, {state.values?.name?.split(' ')[0]}</h2>
        <p>Správu sme prijali a ozveme sa ti najneskôr do 2 pracovných dní. Potvrdenie sme poslali aj na tvoj e-mail.</p>
      </div>
    );
  }
  return (
    <form action={action} className="form" noValidate>
      <input type="hidden" name="type" value={type} />
      <GuardFields stamp={stamp} />
      <h2 className="h-card">{type === 'CLUB' ? 'Dopyt na sezónny prenájom' : 'Napíš nám'}</h2>
      <FormAlert error={state.error} />
      <div className="form__row">
        <Field label="Meno a priezvisko" name="name" autoComplete="name" defaultValue={v.name} error={e.name} required maxLength={120} />
        <Field label="E-mail" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={v.email} error={e.email} required maxLength={254} />
      </div>
      <div className="form__row">
        <Field label="Telefón" name="phone" type="tel" autoComplete="tel" inputMode="tel" defaultValue={v.phone} error={e.phone} optional maxLength={30} />
        {type === 'CLUB' ? (
          <Field label="Klub, škola alebo firma" name="organization" autoComplete="organization" defaultValue={v.organization} error={e.organization} required maxLength={150} />
        ) : (
          <Field label="Predmet" name="subject" defaultValue={v.subject} optional maxLength={150} />
        )}
      </div>
      {type === 'CLUB' ? (
        <div className="form__row">
          <Field label="Obdobie" name="term" defaultValue={v.term} optional maxLength={150} placeholder="napr. september – apríl" />
          <Field label="Dni a časy" name="slots" defaultValue={v.slots} optional maxLength={300} placeholder="napr. Po, St, Pi 17:00 – 19:00" />
        </div>
      ) : null}
      <div className={`field${e.message ? ' field--error' : ''}`}>
        <label htmlFor="inq-message">Správa</label>
        <textarea id="inq-message" name="message" rows={5} maxLength={3000} defaultValue={v.message} required className="textarea" aria-invalid={e.message ? true : undefined} />
        {e.message ? <small className="field__err">{e.message}</small> : null}
      </div>
      <SubmitButton>Odoslať</SubmitButton>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        Údaje použijeme len na odpoveď na tvoj dopyt.
      </p>
    </form>
  );
}
