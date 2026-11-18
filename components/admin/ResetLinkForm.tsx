'use client';

import { useActionState, useState } from 'react';
import { adminResetLinkAction } from '@/lib/actions/admin';
import { EMPTY } from '@/lib/formState';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { useT } from '@/lib/i18n/client';

export function ResetLinkForm({ userId }: { userId: string }) {
  const t = useT();
  const [state, action] = useActionState(adminResetLinkAction, EMPTY);
  const [copied, setCopied] = useState(false);
  const link = state.values?.link;
  return (
    <details className="tfa__more">
      <summary>{t('Vytvoriť odkaz na nové heslo (bez e-mailu)')}</summary>
      <form action={action} className="adm-inline-form">
        <input type="hidden" name="userId" value={userId} />
        <p className="muted">{t('Len po overení totožnosti zákazníka (osobne alebo telefonicky). Odkaz pošli SMS-kou, nikdy ho nezverejňuj.')}</p>
        <SubmitButton variant="ghost" full={false}>
          {t('Vytvoriť odkaz')}
        </SubmitButton>
      </form>
      <FormAlert error={state.error} success={state.success} />
      {link ? (
        <div className="devlink u-mt10">
          <code className="u-break">{link}</code>
          <button
            type="button"
            className="btn btn--sm btn--ghost u-start"
           
            onClick={() => {
              navigator.clipboard?.writeText(link).then(() => setCopied(true));
            }}
          >
            {copied ? t('Skopírované') : t('Kopírovať odkaz')}
          </button>
        </div>
      ) : null}
    </details>
  );
}
