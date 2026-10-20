'use client';

import { useEffect, useState } from 'react';

const KEY = 'isp-map-ok';

// Presná mapa Google, ale až po kliknutí návštevníka: dovtedy sa nič nenačíta z Googlu (žiadne cookies,
// žiadne IP adresy tretím stranám – GDPR). Súhlas si zapamätáme v prehliadači, ďalšie mapy sa už ukážu hneď.
export function LocationMap({
  embed,
  address,
  links,
  preview,
  className = '',
}: {
  embed: string;
  address: string;
  links: { google: string; waze: string; apple: string };
  preview: React.ReactNode;
  className?: string;
}) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try {
      if (window.localStorage.getItem(KEY) === '1') setOn(true);
    } catch {
      /* súkromné okno – nevadí */
    }
  }, []);
  const show = () => {
    setOn(true);
    try {
      window.localStorage.setItem(KEY, '1');
    } catch {
      /* nevadí */
    }
  };
  const nw = <span className="sr-only"> (otvorí sa v novom okne)</span>;
  return (
    <div className={`lm ${className}`}>
      <div className="lm__frame">
        {on ? (
          <iframe
            className="lm__iframe"
            src={embed}
            title={`Mapa: ${address}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        ) : (
          <>
            <div className="lm__preview" aria-hidden="true">
              {preview}
            </div>
            <div className="lm__gate">
              <strong className="lm__addr">{address}</strong>
              <button type="button" className="lm__btn" onClick={show}>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
                  <circle cx="12" cy="10" r="2.6" fill="currentColor" />
                </svg>
                Zobraziť presnú mapu
              </button>
              <small className="lm__note">Mapu poskytuje Google. Po zobrazení môže Google spracúvať tvoju IP adresu a ukladať cookies.</small>
            </div>
          </>
        )}
      </div>
      <nav className="lm__nav" aria-label="Navigovať do komplexu">
        <a href={links.google} target="_blank" rel="noopener noreferrer" className="lm__go lm__go--main">
          Navigovať<span className="lm__long"> v Google Mapách</span>{nw}
        </a>
        <a href={links.waze} target="_blank" rel="noopener noreferrer" className="lm__go">
          Waze{nw}
        </a>
        <a href={links.apple} target="_blank" rel="noopener noreferrer" className="lm__go">
          Apple Mapy{nw}
        </a>
      </nav>
    </div>
  );
}
