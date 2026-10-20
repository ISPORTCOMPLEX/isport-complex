'use client';

import './global-error.css';

// Posledná záchrana, keď zlyhá aj hlavné rozloženie stránky.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="sk">
      <body className="ge">
        <div className="ge__box">
          <h1>Niečo sa pokazilo</h1>
          <p className="ge__lead">Skús obnoviť stránku. Ak problém pretrváva, kontaktuj nás.</p>
          {error.digest ? <p className="ge__code">Kód chyby: {error.digest}</p> : null}
          <a href="/" className="ge__link">
            Späť na úvod
          </a>
        </div>
      </body>
    </html>
  );
}
