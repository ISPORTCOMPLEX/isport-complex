'use client';

import Link from 'next/link';
import { BigMessage } from '@/components/BigMessage';

// Chybová stránka – nikdy neukazuje technické detaily, len kód pre podporu.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <BigMessage kicker="Chyba" title="Niečo sa pokazilo" text="Stránku sa nepodarilo načítať. Skús to znova o chvíľu. Ak problém pretrváva, kontaktuj nás a uveď kód nižšie.">
      {error.digest ? <p className="v3-small">Kód chyby: {error.digest}</p> : null}
      <div className="nf__actions">
        <button type="button" className="qb__cta u-btnreset" onClick={() => reset()}>
          Skúsiť znova
        </button>
        <Link href="/" className="ulink">
          Späť na úvod
        </Link>
      </div>
    </BigMessage>
  );
}
