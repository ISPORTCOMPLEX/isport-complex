'use client';

import { useActionState, useState } from 'react';
import { adminCreateBookingAction } from '@/lib/actions/adminBooking';
import { EMPTY } from '@/lib/formState';
import { Check, Field } from '@/components/forms/Field';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { useT } from '@/lib/i18n/client';

type Slot = { hour: number; free: boolean; price: number };
const pad = (h: number) => `${String(h).padStart(2, '0')}:00`;

export function AdminBookingForm({ iso, slots, showersEnabled, showerPrice }: { iso: string; slots: Slot[]; showersEnabled: boolean; showerPrice: number }) {
  const t = useT();
  const [state, action] = useActionState(adminCreateBookingAction, EMPTY);
  const [start, setStart] = useState<number | null>(null);
  const [hours, setHours] = useState(1);
  const [showers, setShowers] = useState(false);
  const v = state.values ?? {};
  const e = state.errors ?? {};
  const run = (() => {
    if (start === null) return 0;
    let n = 0;
    while (n < 12 && slots.find((s) => s.hour === start + n)?.free) n++;
    return n;
  })();
  const len = Math.min(hours, Math.max(run, 1));
  const total = start === null ? 0 : slots.filter((s) => s.hour >= start && s.hour < start + len).reduce((a, s) => a + s.price, 0);

  return (
    <form action={action} className="adm__stack" noValidate>
      <input type="hidden" name="datum" value={iso} />
      <input type="hidden" name="od" value={start ?? ''} />
      <input type="hidden" name="hodiny" value={len} />
      {showers ? <input type="hidden" name="sprchy" value="on" /> : null}
      <FormAlert error={state.error} />

      <section className="adm-panel">
        <div className="adm-panel__head">
          <h2>{t('2. Čas')}</h2>
          {start !== null ? (
            <span className="muted">
              {t('{pad} – {pad2} · {toLocaleString} € spolu', { pad: pad(start), pad2: pad(start + len), toLocaleString: (total + (showers ? showerPrice : 0)).toLocaleString('sk-SK') })}   
            </span>
          ) : null}
        </div>
        {e.od ? <small className="field__err">{e.od}</small> : null}
        <div className="rez__slots">
          {slots.map((s) => {
            const sel = start !== null && s.hour >= start && s.hour < start + len;
            return (
              <button
                key={s.hour}
                type="button"
                disabled={!s.free}
                className={`rez-slot${sel ? ' rez-slot--sel' : ''}${s.free ? '' : ' rez-slot--off'}`}
                aria-pressed={sel}
                onClick={() => setStart(s.hour)}
              >
                <b>{pad(s.hour)}</b>
                <small>{s.free ? `${s.price} €` : t('obsadené')}</small>
              </button>
            );
          })}
        </div>
        <div className="rez__count u-mw360">
          <span>{t('Dĺžka')}</span>
          <div className="rez__stepper">
            <button type="button" aria-label={t('Kratšie')} disabled={start === null || len <= 1} onClick={() => setHours(Math.max(1, len - 1))}>
              −
            </button>
            <strong>{t('{len} h', { len })} </strong>
            <button type="button" aria-label={t('Dlhšie')} disabled={start === null || len >= run} onClick={() => setHours(Math.min(run, len + 1))}>
              +
            </button>
          </div>
        </div>
      </section>

      {showersEnabled ? (
        <section className="adm-panel">
          <div className="adm-panel__head">
            <h2>{t('Sprchy')}</h2>
          </div>
          <label className={`rz-extra${showers ? ' rz-extra--on' : ''}`}>
            <div>
              <strong>{t('Sprchy po tréningu')}</strong>
              <span>{t('{showerPrice} € jednorazovo · šatňa je v cene', { showerPrice })} </span>
            </div>
            <input type="checkbox" className="rz-switch" checked={showers} onChange={(ev) => setShowers(ev.target.checked)} />
          </label>
        </section>
      ) : null}

      <section className="adm-panel">
        <div className="adm-panel__head">
          <h2>{t('3. Zákazník')}</h2>
        </div>
        <div className="adm-settings-grid">
          <Field label={t('Meno a priezvisko')} name="contactName" defaultValue={v.contactName} error={e.contactName} required maxLength={120} />
          <Field label={t('Telefón')} name="contactPhone" type="tel" inputMode="tel" defaultValue={v.contactPhone} error={e.contactPhone} required maxLength={30} />
          <Field
            label={t('E-mail')}
            name="email"
            type="email"
            inputMode="email"
            defaultValue={v.email}
            error={e.email}
            optional
            maxLength={254}
            hint={t('Ak má zákazník účet s týmto e-mailom, rezervácia sa mu zobrazí v účte.')}
          />
          <Field label={t('Tím alebo klub')} name="teamName" defaultValue={v.teamName} optional maxLength={120} />
        </div>
        <Field label={t('Interná poznámka')} name="note" defaultValue={v.note} optional maxLength={500} />
      </section>

      <section className="adm-panel">
        <div className="adm-panel__head">
          <h2>{t('4. Platba')}</h2>
        </div>
        <div className="adm-inline-form u-mt0">
          <label className="adm-label u-f240">
            {t('Spôsob platby')}
            <select name="platba" defaultValue={v.platba ?? 'ONSITE'} className="adm-select">
              <option value="ONSITE">{t('Na recepcii')}</option>
              <option value="TRANSFER">{t('Bankovým prevodom')}</option>
            </select>
          </label>
        </div>
        <Check name="paid">{t('Už zaplatené (označiť ako zaplatenú)')}</Check>
        <Check name="notify" defaultChecked>
          {t('Poslať zákazníkovi potvrdenie e-mailom (ak je zadaný e-mail)')}
        </Check>
      </section>

      <div>
        <SubmitButton full={false}>{t('Vytvoriť rezerváciu')}</SubmitButton>
      </div>
    </form>
  );
}
