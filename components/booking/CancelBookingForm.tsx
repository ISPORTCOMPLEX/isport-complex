'use client';

import { useActionState } from 'react';
import { cancelMyBookingAction } from '@/lib/actions/booking';
import { EMPTY } from '@/lib/formState';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { useT } from '@/lib/i18n/client';

export function CancelBookingForm({ code, cancelFreeHours, paidByCard = false }: { code: string; cancelFreeHours: number; paidByCard?: boolean }) {
  const t = useT();
  const [state, action] = useActionState(cancelMyBookingAction, EMPTY);
  return (
    <details className="tfa__more">
      <summary>{t('Zrušiť rezerváciu bez poplatku')}</summary>
      <form action={action} className="form">
        <input type="hidden" name="code" value={code} />
        <p className="muted">{t('Bezplatné zrušenie platí do {cancelFreeHours} hodín pred začiatkom. Čas sa hneď uvoľní pre iných.', { cancelFreeHours })} </p>
        {paidByCard ? <p className="muted">{t('Zaplatenú sumu ti automaticky vrátime na kartu, ktorou si platil.')}</p> : null}
        <FormAlert error={state.error} />
        <SubmitButton variant="danger" full={false}>
          {t('Áno, zrušiť rezerváciu')}
        </SubmitButton>
      </form>
    </details>
  );
}
