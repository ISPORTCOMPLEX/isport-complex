'use client';

import { useFormStatus } from 'react-dom';
import { ArrowRight } from '@/components/Icons';

export function SubmitButton({ children, variant = 'red', full = true }: { children: React.ReactNode; variant?: 'red' | 'ghost' | 'danger'; full?: boolean }) {
  const { pending } = useFormStatus();
  const cls = ['btn', 'btn--icon', full ? 'btn--full' : '', variant === 'ghost' ? 'btn--ghost' : '', variant === 'danger' ? 'btn--danger' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <button type="submit" className={cls} disabled={pending} aria-busy={pending}>
      {pending ? 'Spracúvam…' : children}
      <span className="btn__ic">{pending ? <span className="spinner" aria-hidden="true" /> : <ArrowRight />}</span>
    </button>
  );
}
