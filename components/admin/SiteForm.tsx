'use client';

import { useActionState } from 'react';
import { adminSaveSiteAction } from '@/lib/actions/adminBooking';
import { EMPTY } from '@/lib/formState';
import { Field } from '@/components/forms/Field';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';

type SiteData = {
  phone: string;
  email: string;
  notifyEmail: string;
  hall: { street: string; city: string; mapUrl: string; lat: string; lng: string };
  company: { name: string; street: string; city: string; ico: string; dic: string; icDph: string; register: string };
  social: { facebook: string; instagram: string };
  hours: { days: string; time: string }[];
  iban: string;
  bankName: string;
  apps: { ios: string; android: string };
};

export function SiteForm({ s }: { s: SiteData }) {
  const [state, action] = useActionState(adminSaveSiteAction, EMPTY);
  const e = state.errors ?? {};
  return (
    <form action={action} className="adm__stack" noValidate>
      <FormAlert error={state.error} success={state.success} />
      <section className="adm-panel">
        <div className="adm-panel__head">
          <h2>Kontakt a hala</h2>
        </div>
        <div className="adm-settings-grid">
          <Field label="Telefón" name="phone" type="tel" defaultValue={s.phone} optional maxLength={40} placeholder="+421 9xx xxx xxx" />
          <Field label="E-mail pre zákazníkov" name="email" type="email" defaultValue={s.email} error={e.email} optional maxLength={200} />
          <Field label="E-mail pre upozornenia" name="notifyEmail" type="email" defaultValue={s.notifyEmail} error={e.notifyEmail} optional maxLength={200} hint="Sem chodia nové dopyty. Prázdne = e-mail pre zákazníkov." />
          <Field label="Ulica haly" name="hallStreet" defaultValue={s.hall.street} optional />
          <Field label="Mesto haly" name="hallCity" defaultValue={s.hall.city} optional />
          <Field label="Presná poloha (GPS)" name="gps" defaultValue={s.hall.lat && s.hall.lng ? `${s.hall.lat}, ${s.hall.lng}` : ''} error={e.gps} optional maxLength={60} placeholder="48.70123, 21.25456" hint="V Google Mapách klikni pravým tlačidlom presne na vchod do haly a klikni na čísla hore – skopírujú sa. Prázdne = mapa hľadá podľa adresy." />
          <Field label="Vlastný odkaz na mapu" name="mapUrl" defaultValue={s.hall.mapUrl} error={e.mapUrl} optional maxLength={500} placeholder="https://maps.app.goo.gl/…" hint="Nepovinné – napr. odkaz na firemný profil v Google. Inak sa odkaz vytvorí z polohy." />
        </div>
      </section>

      <section className="adm-panel">
        <div className="adm-panel__head">
          <h2>Otváracie hodiny</h2>
        </div>
        <div className="adm-settings-grid">
          {s.hours.map((h, i) => (
            <Field key={h.days} label={h.days} name={`hours${i}`} defaultValue={h.time} optional maxLength={60} placeholder="napr. 6:00 – 23:00" />
          ))}
        </div>
      </section>

      <section className="adm-panel">
        <div className="adm-panel__head">
          <h2>Firma a platby prevodom</h2>
        </div>
        <div className="adm-settings-grid">
          <Field label="Obchodné meno" name="companyName" defaultValue={s.company.name} />
          <Field label="Sídlo – ulica" name="companyStreet" defaultValue={s.company.street} />
          <Field label="Sídlo – PSČ a mesto" name="companyCity" defaultValue={s.company.city} />
          <Field label="IČO" name="ico" defaultValue={s.company.ico} optional maxLength={20} />
          <Field label="DIČ" name="dic" defaultValue={s.company.dic} optional maxLength={20} />
          <Field label="IČ DPH" name="icDph" defaultValue={s.company.icDph} optional maxLength={20} />
          <Field label="Zápis v registri" name="register" defaultValue={s.company.register} optional placeholder="OR OS Košice I, oddiel Sro, vložka č. …" />
          <Field label="IBAN" name="iban" defaultValue={s.iban} error={e.iban} optional maxLength={40} hint="Zobrazí sa pri platbe prevodom." />
          <Field label="Banka" name="bankName" defaultValue={s.bankName} optional maxLength={100} />
        </div>
      </section>

      <section className="adm-panel">
        <div className="adm-panel__head">
          <h2>Sociálne siete</h2>
        </div>
        <div className="adm-settings-grid">
          <Field label="Facebook" name="facebook" defaultValue={s.social.facebook} error={e.facebook} optional maxLength={500} placeholder="https://facebook.com/…" />
          <Field label="Instagram" name="instagram" defaultValue={s.social.instagram} error={e.instagram} optional maxLength={500} placeholder="https://instagram.com/…" />
        </div>
      </section>
      <section className="adm-panel">
        <div className="adm-panel__head">
          <h2>Mobilná aplikácia</h2>
        </div>
        <div className="adm-settings-grid">
          <Field label="Odkaz do App Store" name="appIos" defaultValue={s.apps.ios} error={e.appIos} optional maxLength={500} placeholder="https://apps.apple.com/sk/app/…" hint="Keď vyplníš aspoň jeden odkaz, v pätičke webu sa zobrazí blok „I-SPORT v mobile“." />
          <Field label="Odkaz do Google Play" name="appAndroid" defaultValue={s.apps.android} error={e.appAndroid} optional maxLength={500} placeholder="https://play.google.com/store/apps/details?id=…" />
        </div>
      </section>
      <div>
        <SubmitButton full={false}>Uložiť údaje</SubmitButton>
      </div>
    </form>
  );
}
