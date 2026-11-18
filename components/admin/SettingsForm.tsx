'use client';

import { useActionState } from 'react';
import { adminSaveSettings } from '@/lib/actions/adminBooking';
import { EMPTY } from '@/lib/formState';
import { Check, Field } from '@/components/forms/Field';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { useT } from '@/lib/i18n/client';

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
  const t = useT();
  const [state, action] = useActionState(adminSaveSettings, EMPTY);
  const e = state.errors ?? {};
  const n = (v: number) => String(v);
  return (
    <form action={action} className="adm__stack" noValidate>
      <FormAlert error={state.error} success={state.success} />
      <section className="adm-panel">
        <div className="adm-panel__head">
          <h2>{t('Cenník ľadu')}</h2>
        </div>
        <div className="adm-price-grid">
          <span />
          <strong>{t('Mimo špičky')}</strong>
          <strong>{t('Špička (Po – Pi)')}</strong>
          <strong>{t('Víkend')}</strong>
          <strong>{t('Celá plocha')}</strong>
          <Field label={t('Celá – mimo špičky (€)')} name="fullOff" inputMode="numeric" defaultValue={n(s.prices.full.offPeak)} error={e.fullOff} />
          <Field label={t('Celá – špička (€)')} name="fullPeak" inputMode="numeric" defaultValue={n(s.prices.full.peak)} error={e.fullPeak} />
          <Field label={t('Celá – víkend (€)')} name="fullWeekend" inputMode="numeric" defaultValue={n(s.prices.full.weekend)} error={e.fullWeekend} />
        </div>
      </section>

      <section className="adm-panel">
        <div className="adm-panel__head">
          <h2>{t('Čas a pravidlá')}</h2>
        </div>
        <div className="adm-settings-grid">
          <Field label={t('Cena spŕch (€ za rezerváciu)')} name="showerPrice" inputMode="numeric" defaultValue={n(s.showerPrice)} error={e.showerPrice} hint={t('Šatňa je v cene prenájmu')} />
          <Field label={t('Ľad od (hodina)')} name="openHour" inputMode="numeric" defaultValue={n(s.openHour)} error={e.openHour} hint={t('napr. 6 = od 6:00')} />
          <Field label={t('Ľad do (hodina)')} name="closeHour" inputMode="numeric" defaultValue={n(s.closeHour)} error={e.closeHour} hint={t('napr. 23 = posledná hodina 22:00 – 23:00')} />
          <Field label={t('Špička od (hodina)')} name="peakFromHour" inputMode="numeric" defaultValue={n(s.peakFromHour)} error={e.peakFromHour} hint={t('v pracovné dni')} />
          <Field label={t('Najviac hodín v rezervácii')} name="maxHours" inputMode="numeric" defaultValue={n(s.maxHours)} error={e.maxHours} />
          <Field label={t('Najviac nadchádzajúcich rezervácií na účet')} name="maxActive" inputMode="numeric" defaultValue={n(s.maxActive)} error={e.maxActive} hint={t('Ochrana pred zablokovaním kalendára')} />
          <Field label={t('Rezervácia dopredu (dni)')} name="maxDaysAhead" inputMode="numeric" defaultValue={n(s.maxDaysAhead)} error={e.maxDaysAhead} />
          <Field label={t('Najneskôr pred začiatkom (min)')} name="leadMinutes" inputMode="numeric" defaultValue={n(s.leadMinutes)} error={e.leadMinutes} />
          <Field label={t('Bezplatné zrušenie (hodín vopred)')} name="cancelFreeHours" inputMode="numeric" defaultValue={n(s.cancelFreeHours)} error={e.cancelFreeHours} />
        </div>
        <Check name="showersEnabled" defaultChecked={s.showersEnabled}>
          {t('Ponúkať sprchy pri rezervácii')}
        </Check>
        <Check name="temporary" defaultChecked={s.temporary}>
          {t('Hodnoty sú zatiaľ orientačné (na webe sa zobrazí upozornenie)')}
        </Check>
      </section>
      <div>
        <SubmitButton full={false}>{t('Uložiť nastavenia')}</SubmitButton>
      </div>
    </form>
  );
}
