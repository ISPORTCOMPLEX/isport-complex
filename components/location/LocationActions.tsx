'use client';

import { useEffect, useState } from 'react';

const NW = <span className="sr-only"> (otvorí sa v novom okne)</span>;

// Tlačidlá pod adresou: navigácia, Google Mapy a na mobile Waze, na počítači kopírovanie adresy.
export function LocationActions({ links, address }: { links: { directions: string; google: string; waze: string }; address: string }) {
  const [mobile, setMobile] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setMobile(window.matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent));
  }, []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* staršie prehliadače – adresa je aj tak napísaná vyššie */
    }
  };
  return (
    <div className="loc__btns">
      <a href={links.directions} target="_blank" rel="noopener noreferrer" className="loc__primary">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 11l18-8-8 18-2-8z" fill="currentColor" />
        </svg>
        Navigovať do haly{NW}
      </a>
      <div className="loc__pair">
        <a href={links.google} target="_blank" rel="noopener noreferrer" className="loc__secondary">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
            <circle cx="12" cy="10" r="2.6" fill="currentColor" />
          </svg>
          Google Mapy{NW}
        </a>
        {mobile ? (
          <a href={links.waze} target="_blank" rel="noopener noreferrer" className="loc__secondary">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 16l1.5-5h11L19 16M4 16h16v3H4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            Waze{NW}
          </a>
        ) : (
          <button type="button" className="loc__secondary" onClick={copy} aria-live="polite">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
            {copied ? 'Skopírované' : 'Kopírovať adresu'}
          </button>
        )}
      </div>
    </div>
  );
}
