'use client';

import './global-error.css';
import { useT } from '@/lib/i18n/client';

// Posledná záchrana, keď zlyhá aj hlavné rozloženie stránky.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  const t = useT();
  return (
    <html lang="sk">
      <body className="ge">
        <div className="ge__box">
          <h1>{t('Niečo sa pokazilo')}</h1>
          <p className="ge__lead">{t('Skús obnoviť stránku. Ak problém pretrváva, kontaktuj nás.')}</p>
          {error.digest ? <p className="ge__code">{t('Kód chyby: {digest}', { digest: error.digest })}</p> : null}
          <a href="/" className="ge__link">
            {t('Späť na úvod')}
          </a>
        </div>
      </body>
    </html>
  );
}
