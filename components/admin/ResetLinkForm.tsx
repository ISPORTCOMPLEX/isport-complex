'use client';

import { useActionState, useState } from 'react';
import { adminResetLinkAction } from '@/lib/actions/admin';
import { EMPTY } from '@/lib/formState';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';

export function ResetLinkForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(adminResetLinkAction, EMPTY);
  const [copied, setCopied] = useState(false);
  const link = state.values?.link;
  return (
    <details className="tfa__more">
      <summary>Vytvoriť odkaz na nové heslo (bez e-mailu)</summary>
      <form action={action} className="adm-inline-form">
        <input type="hidden" name="userId" value={userId} />
        <p className="muted">Len po overení totožnosti zákazníka (osobne alebo telefonicky). Odkaz pošli SMS-kou, nikdy ho nezverejňuj.</p>
        <SubmitButton variant="ghost" full={false}>
          Vytvoriť odkaz
        </SubmitButton>
      </form>
      <FormAlert error={state.error} success={state.success} />
      {link ? (
        <div className="devlink" style={{ marginTop: 10 }}>
          <code style={{ wordBreak: 'break-all' }}>{link}</code>
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => {
              navigator.clipboard?.writeText(link).then(() => setCopied(true));
            }}
          >
            {copied ? 'Skopírované' : 'Kopírovať odkaz'}
          </button>
        </div>
      ) : null}
    </details>
  );
}
