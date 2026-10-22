'use client';

import { useEffect, useState } from 'react';

// Tlačidlá pod adresou: Navigovať + na počítači Kopírovať adresu, na mobile Zavolať (ak je telefón).
export function LocationActions({ links, address, phone = '' }: { links: { directions: string; google: string; waze: string }; address: string; phone?: string }) {
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
    <div className="loc2__btns">
      <a href={links.directions} target="_blank" rel="noopener noreferrer" className="sbtn sbtn--md">
        Navigovať<span className="sr-only"> (otvorí sa v novom okne)</span>
      </a>
      {mobile && phone ? (
        <a href={`tel:${phone.replace(/\s/g, '')}`} className="sbtn sbtn--md sbtn--ghost">
          Zavolať
        </a>
      ) : (
        <button type="button" className="sbtn sbtn--md sbtn--ghost" onClick={copy} aria-live="polite">
          {copied ? 'Skopírované' : 'Kopírovať adresu'}
        </button>
      )}
    </div>
  );
}
