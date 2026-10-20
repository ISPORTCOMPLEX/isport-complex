'use client';

import Link from 'next/link';

// Chybová stránka – nikdy neukazuje technické detaily, len kód pre podporu.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="soon">
      <div className="wrap soon__in">
        <span className="kicker">Chyba</span>
        <h1 className="display h2">Niečo sa pokazilo</h1>
        <p className="lead">Stránku sa nepodarilo načítať. Skús to znova o chvíľu. Ak problém pretrváva, kontaktuj nás a uveď kód nižšie.</p>
        {error.digest ? <p className="muted" style={{ margin: 0 }}>Kód chyby: {error.digest}</p> : null}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <button type="button" className="btn" onClick={() => reset()}>
            Skúsiť znova
          </button>
          <Link href="/" className="btn btn--ghost">
            Späť na úvod
          </Link>
        </div>
      </div>
    </section>
  );
}
