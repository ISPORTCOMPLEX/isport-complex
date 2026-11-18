'use client';

import Link from 'next/link';
import { startTransition, useActionState, useState } from 'react';
import { Field } from '@/components/forms/Field';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { registerTeamAction, type TeamFormState } from '@/lib/actions/league';
import { useT } from '@/lib/i18n/client';

type Row = { key: number; name: string; number: string; pos: string };
const COLORS = ['#e30613', '#1f4fd8', '#0f7a3d', '#f5b301', '#0b1626', '#7a2bd8', '#e86a10', '#00a3c4'];

// Prihláška tímu so súpiskou. Odosiela sa bez obnovenia stránky – vyplnené údaje pri chybe ostanú.
export function TeamRegisterForm({ name, email, phone }: { name: string; email: string; phone: string }) {
  const t = useT();
  const [state, action] = useActionState<TeamFormState, FormData>(registerTeamAction, {});
  const [color, setColor] = useState(COLORS[0]);
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: 8 }, (_, i) => ({ key: i, name: '', number: '', pos: i === 0 ? 'G' : i < 3 ? 'D' : 'F' })));
  const e = state.errors ?? {};
  const set = (key: number, patch: Partial<Row>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  if (state.done)
    return (
      <div className="lgreg__done" role="status">
        <h2>{t('Prihláška je odoslaná')}</h2>
        <p>{t('Ďakujeme! Prihlášku tímu skontrolujeme a ozveme sa na zadaný e-mail. Po schválení sa tím objaví v tabuľke súťaže.')}</p>
        <Link href="/sutaz" className="lgbtn">
          {t('Späť na súťaž')}
        </Link>
      </div>
    );

  return (
    <form
      className="lgreg"
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <FormAlert error={state.error} />
      <fieldset className="lgreg__set">
        <legend>{t('Tím')}</legend>
        <div className="lgreg__grid">
          <Field label={t('Názov tímu')} name="name" required maxLength={60} error={e.name} />
          <Field label={t('Skratka (2 – 4 znaky)')} name="short" required maxLength={4} error={e.short} placeholder="KES" />
          <Field label={t('Mesto')} name="city" maxLength={60} optional />
          <div className="field">
            <div className="field__top">
              <span id="lgreg-color">{t('Farba tímu')}</span>
            </div>
            <div className="lgreg__colors" role="radiogroup" aria-labelledby="lgreg-color">
              {COLORS.map((c) => (
                <label key={c} className={`lgreg__sw lgreg__sw--${c.slice(1)}`}>
                  <input type="radio" name="color" value={c} checked={color === c} onChange={() => setColor(c)} />
                  <span className="sr-only">{c}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset className="lgreg__set">
        <legend>{t('Kontaktná osoba')}</legend>
        <div className="lgreg__grid">
          <Field label={t('Meno a priezvisko')} name="contactName" defaultValue={name} required maxLength={120} error={e.contactName} autoComplete="name" />
          <Field label={t('E-mail')} name="contactEmail" type="email" defaultValue={email} required maxLength={254} error={e.contactEmail} autoComplete="email" />
          <Field label={t('Telefón')} name="contactPhone" type="tel" defaultValue={phone} maxLength={30} error={e.contactPhone} optional autoComplete="tel" />
        </div>
      </fieldset>

      <fieldset className="lgreg__set">
        <legend>{t('Súpiska')}</legend>
        <p className="lgreg__hint">{t('Aspoň 5 hráčov, najviac 30. Prázdne riadky sa ignorujú.')}</p>
        {e.roster ? (
          <p className="field__err" role="alert">
            {e.roster}
          </p>
        ) : null}
        <div className="lgreg__roster">
          <div className="lgreg__rh" aria-hidden="true">
            <span>{t('Meno hráča')}</span>
            <span>{t('Číslo')}</span>
            <span>{t('Post')}</span>
            <span />
          </div>
          {rows.map((r, i) => (
            <div key={r.key} className="lgreg__row">
              <input name="playerName" value={r.name} onChange={(ev) => set(r.key, { name: ev.target.value })} maxLength={80} aria-label={t('Meno hráča {n}', { n: i + 1 })} placeholder={t('Meno a priezvisko')} />
              <input name="playerNumber" value={r.number} onChange={(ev) => set(r.key, { number: ev.target.value.replace(/\D/g, '').slice(0, 2) })} inputMode="numeric" aria-label={t('Číslo dresu hráča {n}', { n: i + 1 })} placeholder="#" />
              <select name="playerPos" value={r.pos} onChange={(ev) => set(r.key, { pos: ev.target.value })} aria-label={t('Post hráča {n}', { n: i + 1 })}>
                <option value="F">{t('Útočník')}</option>
                <option value="D">{t('Obranca')}</option>
                <option value="G">{t('Brankár')}</option>
              </select>
              <button type="button" className="lgreg__x" onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))} aria-label={t('Odstrániť hráča {n}', { n: i + 1 })} disabled={rows.length <= 1}>
                ×
              </button>
            </div>
          ))}
        </div>
        {rows.length < 30 ? (
          <button type="button" className="lgreg__add" onClick={() => setRows((x) => [...x, { key: Math.max(-1, ...x.map((y) => y.key)) + 1, name: '', number: '', pos: 'F' }])}>
            + {t('Pridať hráča')}
          </button>
        ) : null}
      </fieldset>

      <fieldset className="lgreg__set">
        <legend>{t('Poznámka')}</legend>
        <label className="sr-only" htmlFor="lgreg-note">
          {t('Poznámka')}
        </label>
        <textarea id="lgreg-note" name="note" rows={3} maxLength={1000} className="textarea" placeholder={t('Napr. úroveň tímu, preferované dni zápasov…')} />
      </fieldset>

      <label className={`lgreg__consent${e.consent ? ' is-err' : ''}`}>
        <input type="checkbox" name="consent" value="1" />
        <span>
          {t('Súhlasím so spracovaním uvedených údajov na účely súťaže. Mená hráčov a štatistiky sa po schválení tímu zobrazia na webe.')}{' '}
          <Link href="/ochrana-osobnych-udajov">{t('Ochrana osobných údajov')}</Link>
        </span>
      </label>
      {e.consent ? <p className="field__err">{e.consent}</p> : null}

      <div className="lgreg__go">
        <SubmitButton full={false}>{t('Odoslať prihlášku')}</SubmitButton>
      </div>
    </form>
  );
}
