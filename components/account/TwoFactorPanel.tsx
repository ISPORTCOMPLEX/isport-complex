'use client';

import { useActionState } from 'react';
import {
  confirmTwoFactorAction,
  disableTwoFactorAction,
  regenerateBackupCodesAction,
  startTwoFactorAction,
} from '@/lib/actions/account';
import { EMPTY, type FormState } from '@/lib/formState';
import { Field } from '@/components/forms/Field';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';

export function TwoFactorPanel({ enabled, backupLeft }: { enabled: boolean; backupLeft: number }) {
  return (
    <div className="tfa">
      <div className="tfa__head">
        <h2 className="h-card">Dvojstupňové overenie</h2>
        <span className={`status ${enabled ? 'status--ok' : 'status--warn'}`}>{enabled ? 'Zapnuté' : 'Vypnuté'}</span>
      </div>
      <p className="muted">
        Pri prihlásení okrem hesla zadáš aj 6-miestny kód z aplikácie v telefóne (Google Authenticator, Microsoft Authenticator, 1Password…). Aj keby
        niekto zistil tvoje heslo, bez telefónu sa neprihlási.
      </p>
      {enabled ? <EnabledView backupLeft={backupLeft} /> : <SetupView />}
    </div>
  );
}

function SetupView() {
  const [start, startAction] = useActionState(startTwoFactorAction, EMPTY);
  const [confirm, confirmAction] = useActionState(confirmTwoFactorAction, EMPTY);

  if (confirm.backupCodes) return <BackupCodes state={confirm} />;

  const qr = confirm.qr ?? start.qr;
  const secret = confirm.secret ?? start.secret;

  if (!qr) {
    return (
      <form action={startAction} className="form">
        <FormAlert error={start.error} />
        <SubmitButton full={false}>Zapnúť dvojstupňové overenie</SubmitButton>
      </form>
    );
  }

  return (
    <div className="tfa__setup">
      <ol className="tfa__steps">
        <li>Otvor v telefóne overovaciu aplikáciu a pridaj nový účet.</li>
        <li>Naskenuj QR kód alebo prepíš kľúč ručne.</li>
        <li>Zadaj 6-miestny kód, ktorý ti aplikácia zobrazí.</li>
      </ol>
      <div className="tfa__qr">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} width={200} height={200} alt="QR kód pre overovaciu aplikáciu" />
        <div>
          <small className="muted">Kľúč na ručné zadanie</small>
          <code className="tfa__secret">{secret}</code>
        </div>
      </div>
      <form action={confirmAction} className="form">
        <FormAlert error={confirm.error} />
        <Field label="Kód z aplikácie" name="code" autoComplete="one-time-code" inputMode="numeric" maxLength={7} required placeholder="123456" />
        <SubmitButton full={false}>Potvrdiť a zapnúť</SubmitButton>
      </form>
    </div>
  );
}

function EnabledView({ backupLeft }: { backupLeft: number }) {
  const [regen, regenAction] = useActionState(regenerateBackupCodesAction, EMPTY);
  const [off, offAction] = useActionState(disableTwoFactorAction, EMPTY);

  if (regen.backupCodes) return <BackupCodes state={regen} />;

  return (
    <div className="tfa__enabled">
      <FormAlert success={off.success} />
      <p>
        Zostávajúce záložné kódy: <strong>{backupLeft}</strong> z 8{backupLeft <= 2 ? ' – odporúčame vytvoriť nové.' : '.'}
      </p>
      <details className="tfa__more">
        <summary>Vytvoriť nové záložné kódy</summary>
        <form action={regenAction} className="form">
          <FormAlert error={regen.error} />
          <Field label="Heslo" name="password" type="password" autoComplete="current-password" error={regen.errors?.password} required />
          <SubmitButton variant="ghost" full={false}>
            Vytvoriť nové kódy
          </SubmitButton>
        </form>
      </details>
      <details className="tfa__more">
        <summary>Vypnúť dvojstupňové overenie</summary>
        <form action={offAction} className="form">
          <FormAlert error={off.error} />
          <Field label="Heslo" name="password" type="password" autoComplete="current-password" error={off.errors?.password} required />
          <Field label="Kód z aplikácie alebo záložný kód" name="code" autoComplete="one-time-code" error={off.errors?.code} required maxLength={20} />
          <SubmitButton variant="danger" full={false}>
            Vypnúť
          </SubmitButton>
        </form>
      </details>
    </div>
  );
}

function BackupCodes({ state }: { state: FormState }) {
  const codes = state.backupCodes ?? [];
  const text = `I-SPORT COMPLEX – záložné kódy\n${codes.join('\n')}\n`;
  const href = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
  return (
    <div className="tfa__codes">
      <FormAlert success={state.success} />
      <p>
        <strong>Ulož si tieto záložné kódy.</strong> Každý sa dá použiť raz, keď nebudeš mať telefón. Zobrazujú sa iba teraz.
      </p>
      <ul className="codes">
        {codes.map((c) => (
          <li key={c}>
            <code>{c}</code>
          </li>
        ))}
      </ul>
      <div className="tfa__actions">
        <a href={href} download="isport-zalozne-kody.txt" className="btn btn--ghost btn--sm">
          Stiahnuť ako súbor
        </a>
        <a href="/ucet/zabezpecenie" className="btn btn--sm">
          Mám ich uložené
        </a>
      </div>
    </div>
  );
}
