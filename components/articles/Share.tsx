'use client';

import { useState } from 'react';

const NW = <span className="sr-only"> (otvorí sa v novom okne)</span>;

// Zdieľanie bez cudzích skriptov – obyčajné odkazy + kopírovanie adresy (na mobile systémové zdieľanie).
export function Share({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const copy = async () => {
    try {
      if (typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* zrušené zdieľanie */
    }
  };
  return (
    <div className="sh" role="group" aria-label="Zdieľať článok">
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${u}`} target="_blank" rel="noopener noreferrer" aria-label="Zdieľať na Facebooku">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H8v4h2v8h4v-8h3l1-4h-4V8z" fill="currentColor" />
        </svg>
        {NW}
      </a>
      <a href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`} target="_blank" rel="noopener noreferrer" aria-label="Poslať cez WhatsApp">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 20l1.3-4A8 8 0 1 1 8.3 19z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        {NW}
      </a>
      <button type="button" onClick={copy} aria-label={copied ? 'Adresa skopírovaná' : 'Kopírovať odkaz'}>
        {copied ? (
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12l5 5 9-10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </button>
    </div>
  );
}
