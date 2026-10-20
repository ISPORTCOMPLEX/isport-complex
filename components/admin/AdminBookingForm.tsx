'use client';

import { useActionState, useState } from 'react';
import { adminCreateBookingAction } from '@/lib/actions/adminBooking';
import { EMPTY } from '@/lib/formState';
import { Check, Field } from '@/components/forms/Field';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';

type Slot = { hour: number; free: boolean; price: number };
const pad = (h: number) => `${String(h).padStart(2, '0')}:00`;

export function AdminBookingForm({ iso, plocha, slots }: { iso: string; plocha: string; slots: Slot[] }) {
  const [state, action] = useActionState(adminCreateBookingAction, EMPTY);
  const [start, setStart] = useState<number | null>(null);
  const [hours, setHours] = useState(1);
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
      <input type="hidden" name="plocha" value={plocha} />
      <input type="hidden" name="od" value={start ?? ''} />
      <input type="hidden" name="hodiny" value={len} />
      <FormAlert error={state.error} />

      <section className="adm-panel">
        <div className="adm-panel__head">
          <h2>2. Čas</h2>
          {start !== null ? (
            <span className="muted">
              {pad(start)} – {pad(start + len)} · {total.toLocaleString('sk-SK')} €
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
                <small>{s.free ? `${s.price} €` : 'obsadené'}</small>
              </button>
            );
          })}
        </div>
        <div className="rez__count" style={{ maxWidth: 360 }}>
          <span>Dĺžka</span>
          <div className="rez__stepper">
            <button type="button" aria-label="Kratšie" disabled={start === null || len <= 1} onClick={() => setHours(Math.max(1, len - 1))}>
              −
            </button>
            <strong>{len} h</strong>
            <button type="button" aria-label="Dlhšie" disabled={start === null || len >= run} onClick={() => setHours(Math.min(run, len + 1))}>
              +
            </button>
          </div>
        </div>
      </section>

      <section className="adm-panel">
        <div className="adm-panel__head">
          <h2>3. Zákazník</h2>
        </div>
        <div className="adm-settings-grid">
          <Field label="Meno a priezvisko" name="contactName" defaultValue={v.contactName} error={e.contactName} required maxLength={120} />
          <Field label="Telefón" name="contactPhone" type="tel" inputMode="tel" defaultValue={v.contactPhone} error={e.contactPhone} required maxLength={30} />
          <Field
            label="E-mail"
            name="email"
            type="email"
            inputMode="email"
            defaultValue={v.email}
            error={e.email}
            optional
            maxLength={254}
            hint="Ak má zákazník účet s týmto e-mailom, rezervácia sa mu zobrazí v účte."
          />
          <Field label="Tím alebo klub" name="teamName" defaultValue={v.teamName} optional maxLength={120} />
        </div>
        <Field label="Interná poznámka" name="note" defaultValue={v.note} optional maxLength={500} />
      </section>

      <section className="adm-panel">
        <div className="adm-panel__head">
          <h2>4. Platba</h2>
        </div>
        <div className="adm-inline-form" style={{ marginTop: 0 }}>
          <label className="adm-label" style={{ flex: '0 1 240px' }}>
            Spôsob platby
            <select name="platba" defaultValue={v.platba ?? 'ONSITE'} className="adm-select">
              <option value="ONSITE">Na recepcii</option>
              <option value="TRANSFER">Bankovým prevodom</option>
            </select>
          </label>
        </div>
        <Check name="paid">Už zaplatené (označiť ako zaplatenú)</Check>
        <Check name="notify" defaultChecked>
          Poslať zákazníkovi potvrdenie e-mailom (ak je zadaný e-mail)
        </Check>
      </section>

      <div>
        <SubmitButton full={false}>Vytvoriť rezerváciu</SubmitButton>
      </div>
    </form>
  );
}
