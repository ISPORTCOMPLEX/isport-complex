'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const STEPS = ['Termín', 'Údaje', 'Potvrdenie'];

export function bookingStep(path: string): number {
  if (path === '/rezervacia') return 1;
  if (path === '/rezervacia/udaje') return 2;
  return 3;
}

// Kroky rezervácie v hlavičke: na počítači šikmé štítky, na mobile tri pásiky a „1 / 3“.
export function BookingSteps() {
  const step = bookingStep(usePathname() ?? '/rezervacia');
  return (
    <>
      <ol className="bk-steps" aria-label="Kroky rezervácie">
        {STEPS.map((s, i) => (
          <li key={s} className={i + 1 === step ? 'is-on' : i + 1 < step ? 'is-done' : undefined} aria-current={i + 1 === step ? 'step' : undefined}>
            <span className="wide-display">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <span className="bk-bars" role="img" aria-label={`Krok ${step} z 3`}>
        {STEPS.map((s, i) => (
          <i key={s} className={i < step ? 'is-on' : undefined} />
        ))}
      </span>
    </>
  );
}

export function BookingBack() {
  const step = bookingStep(usePathname() ?? '/rezervacia');
  return (
    <Link href={step === 2 ? '/rezervacia' : '/'} className="bk-back" aria-label={step === 2 ? 'Späť na výber termínu' : 'Späť na úvod'}>
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2.8" />
      </svg>
    </Link>
  );
}

export function BookingCount() {
  const step = bookingStep(usePathname() ?? '/rezervacia');
  return (
    <span className="bk-count" aria-hidden="true">
      {step} / 3
    </span>
  );
}
