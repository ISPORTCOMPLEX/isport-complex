'use client';

import { useEffect, useState } from 'react';

const KEY = 'isp-map-ok';

// Mapa Google sa načíta až po kliknutí (GDPR – dovtedy Google nič neukladá). Súhlas si prehliadač zapamätá.
// Pred načítaním: ilustračný náhľad s našou značkou a jedna lišta „Načítať mapu“ dole.
export function LocationMap({ embed, address }: { embed: string; address: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try {
      if (window.localStorage.getItem(KEY) === '1') setOn(true);
    } catch {
      /* súkromné okno */
    }
  }, []);
  const load = () => {
    setOn(true);
    try {
      window.localStorage.setItem(KEY, '1');
    } catch {
      /* nevadí */
    }
  };
  return (
    <div className="loc__mapcol">
      <div className="loc__map">
        {on ? (
          <iframe className="loc__iframe" src={embed} title={`Mapa: ${address}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="loc__bg" src="/brand/mapa-nahlad.svg" alt="" aria-hidden="true" draggable={false} />
            <div className="loc__pin" aria-hidden="true">
              <span className="loc__chip">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/icon-192.png" alt="" width={26} height={26} />
                I-SPORT COMPLEX
              </span>
              <span className="loc__tip" />
              <span className="loc__dot" />
            </div>
            <div className="loc__veil" aria-hidden="true" />
            <div className="loc__gate">
              <small>Interaktívna mapa od Google</small>
              <button type="button" className="loc__load" onClick={load}>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
                  <circle cx="12" cy="10" r="2.6" fill="currentColor" />
                </svg>
                Načítať mapu
              </button>
            </div>
          </>
        )}
      </div>
      {on ? null : <p className="loc__note">Mapa sa načíta až po kliknutí – dovtedy Google neukladá žiadne cookies.</p>}
    </div>
  );
}
