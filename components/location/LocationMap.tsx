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
    <div className="loc2__map">
      {on ? (
        <iframe className="loc2__iframe" src={embed} title={`Mapa: ${address}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
      ) : (
        <>
          <svg className="loc2__art" viewBox="0 0 800 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <rect width="800" height="520" fill="#0F1013" />
            <path d="M-20 410 C 160 360, 300 380, 420 300 S 700 160, 840 120" fill="none" stroke="#1E2026" strokeWidth="34" />
            <path d="M-20 410 C 160 360, 300 380, 420 300 S 700 160, 840 120" fill="none" stroke="#2A2D35" strokeWidth="2" strokeDasharray="14 12" />
            <path d="M120 -20 L 260 540" stroke="#1A1C21" strokeWidth="18" />
            <path d="M560 -20 L 470 540" stroke="#1A1C21" strokeWidth="22" />
            <path d="M-20 140 L 840 230" stroke="#17191D" strokeWidth="12" />
            <path d="M-20 520 L 840 470" stroke="#17191D" strokeWidth="10" />
            <rect x="300" y="160" width="120" height="70" fill="#15161A" transform="rotate(-8 360 195)" />
            <rect x="600" y="300" width="140" height="90" fill="#15161A" transform="rotate(6 670 345)" />
            <rect x="80" y="220" width="110" height="80" fill="#15161A" />
            <rect x="340" y="250" width="150" height="96" rx="6" fill="#1D1013" stroke="#E30613" strokeWidth="2.5" transform="rotate(-10 415 298)" />
            <circle cx="415" cy="298" r="60" fill="rgba(227,6,19,0.12)" />
            <circle cx="415" cy="298" r="9" fill="#E30613" />
            <circle cx="415" cy="298" r="20" fill="none" stroke="#E30613" strokeWidth="2" opacity="0.6" />
          </svg>
          <span className="wide-display loc2__label" aria-hidden="true">
            I-SPORT COMPLEX
          </span>
          <button type="button" className="loc2__load" onClick={load} title="Mapa od Google sa načíta až po kliknutí – dovtedy Google neukladá žiadne cookies.">
            Načítať Google mapu
          </button>
        </>
      )}
    </div>
  );
}
