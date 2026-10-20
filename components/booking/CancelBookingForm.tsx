'use client';

import { useActionState } from 'react';
import { cancelMyBookingAction } from '@/lib/actions/booking';
import { EMPTY } from '@/lib/formState';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';

export function CancelBookingForm({ code, cancelFreeHours }: { code: string; cancelFreeHours: number }) {
  const [state, action] = useActionState(cancelMyBookingAction, EMPTY);
  return (
    <details className="tfa__more">
      <summary>Zrušiť rezerváciu bez poplatku</summary>
      <form action={action} className="form">
        <input type="hidden" name="code" value={code} />
        <p className="muted">Bezplatné zrušenie platí do {cancelFreeHours} hodín pred začiatkom. Čas sa hneď uvoľní pre iných.</p>
        <FormAlert error={state.error} />
        <SubmitButton variant="danger" full={false}>
          Áno, zrušiť rezerváciu
        </SubmitButton>
      </form>
    </details>
  );
}
