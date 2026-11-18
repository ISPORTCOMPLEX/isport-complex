'use client';

import Link from 'next/link';
import { BigMessage } from '@/components/BigMessage';
import { useT } from '@/lib/i18n/client';

// Chybová stránka – nikdy neukazuje technické detaily, len kód pre podporu.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  return (
    <BigMessage kicker={t('Chyba')} title={t('Niečo sa pokazilo')} text={t('Stránku sa nepodarilo načítať. Skús to znova o chvíľu. Ak problém pretrváva, kontaktuj nás a uveď kód nižšie.')}>
      {error.digest ? <p className="v3-small">{t('Kód chyby: {digest}', { digest: error.digest })}</p> : null}
      <div className="nf__actions">
        <button type="button" className="qb__cta u-btnreset" onClick={() => reset()}>
          {t('Skúsiť znova')}
        </button>
        <Link href="/" className="ulink">
          {t('Späť na úvod')}
        </Link>
      </div>
    </BigMessage>
  );
}
