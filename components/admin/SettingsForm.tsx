'use client';

import { useActionState } from 'react';
import { adminSaveSettings } from '@/lib/actions/adminBooking';
import { EMPTY } from '@/lib/formState';
import { Check, Field } from '@/components/forms/Field';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';

type S = {
  prices: { full: { offPeak: number; peak: number; weekend: number } };
  showerPrice: number;
  showersEnabled: boolean;
  peakFromHour: number;
  openHour: number;
  closeHour: number;
  cancelFreeHours: number;
  leadMinutes: number;
  maxDaysAhead: number;
  maxHours: number;
  maxActive: number;
  temporary: boolean;
};

export function SettingsForm({ s }: { s: S }) {
  const [state, action] = useActionState(adminSaveSettings, EMPTY);
  const e = state.errors ?? {};
  const n = (v: number) => String(v);
  return (
    <form action={action} className="adm__stack" noValidate>
      <FormAlert error={state.error} success={state.success} />
      <section className="adm-panel">
        <div className="adm-panel__head">
          <h2>Cenník ľadu</h2>
        </div>
        <div className="adm-price-grid">
          <span />
          <strong>Mimo špičky</strong>
          <strong>Špička (Po – Pi)</strong>
          <strong>Víkend</strong>
          <strong>Celá plocha</strong>
          <Field label="Celá – mimo špičky (€)" name="fullOff" inputMode="numeric" defaultValue={n(s.prices.full.offPeak)} error={e.fullOff} />
          <Field label="Celá – špička (€)" name="fullPeak" inputMode="numeric" defaultValue={n(s.prices.full.peak)} error={e.fullPeak} />
          <Field label="Celá – víkend (€)" name="fullWeekend" inputMode="numeric" defaultValue={n(s.prices.full.weekend)} error={e.fullWeekend} />
        </div>
      </section>

      <section className="adm-panel">
        <div className="adm-panel__head">
          <h2>Čas a pravidlá</h2>
        </div>
        <div className="adm-settings-grid">
          <Field label="Cena spŕch (€ za rezerváciu)" name="showerPrice" inputMode="numeric" defaultValue={n(s.showerPrice)} error={e.showerPrice} hint="Šatňa je v cene prenájmu" />
          <Field label="Ľad od (hodina)" name="openHour" inputMode="numeric" defaultValue={n(s.openHour)} error={e.openHour} hint="napr. 6 = od 6:00" />
          <Field label="Ľad do (hodina)" name="closeHour" inputMode="numeric" defaultValue={n(s.closeHour)} error={e.closeHour} hint="napr. 23 = posledná hodina 22:00 – 23:00" />
          <Field label="Špička od (hodina)" name="peakFromHour" inputMode="numeric" defaultValue={n(s.peakFromHour)} error={e.peakFromHour} hint="v pracovné dni" />
          <Field label="Najviac hodín v rezervácii" name="maxHours" inputMode="numeric" defaultValue={n(s.maxHours)} error={e.maxHours} />
          <Field label="Najviac nadchádzajúcich rezervácií na účet" name="maxActive" inputMode="numeric" defaultValue={n(s.maxActive)} error={e.maxActive} hint="Ochrana pred zablokovaním kalendára" />
          <Field label="Rezervácia dopredu (dni)" name="maxDaysAhead" inputMode="numeric" defaultValue={n(s.maxDaysAhead)} error={e.maxDaysAhead} />
          <Field label="Najneskôr pred začiatkom (min)" name="leadMinutes" inputMode="numeric" defaultValue={n(s.leadMinutes)} error={e.leadMinutes} />
          <Field label="Bezplatné zrušenie (hodín vopred)" name="cancelFreeHours" inputMode="numeric" defaultValue={n(s.cancelFreeHours)} error={e.cancelFreeHours} />
        </div>
        <Check name="showersEnabled" defaultChecked={s.showersEnabled}>
          Ponúkať sprchy pri rezervácii
        </Check>
        <Check name="temporary" defaultChecked={s.temporary}>
          Hodnoty sú zatiaľ orientačné (na webe sa zobrazí upozornenie)
        </Check>
      </section>
      <div>
        <SubmitButton full={false}>Uložiť nastavenia</SubmitButton>
      </div>
    </form>
  );
}
