'use client';

// Posledná záchrana, keď zlyhá aj hlavné rozloženie stránky.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="sk">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#070708', color: '#F4F6F7', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 520, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h1 style={{ margin: 0 }}>Niečo sa pokazilo</h1>
          <p style={{ margin: 0, color: '#C8CDD2' }}>Skús obnoviť stránku. Ak problém pretrváva, kontaktuj nás.</p>
          {error.digest ? <p style={{ margin: 0, color: '#9AA1A8' }}>Kód chyby: {error.digest}</p> : null}
          <a href="/" style={{ color: '#FF3D45' }}>
            Späť na úvod
          </a>
        </div>
      </body>
    </html>
  );
}
