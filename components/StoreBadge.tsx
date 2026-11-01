'use client';

import { useEffect, useRef, useState } from 'react';

// Tlačidlo do obchodu s aplikáciami. Používa oficiálny odznak Apple / Google zo súborov
// public/brand/app-store.svg a public/brand/google-play.png (stiahnuté z ich stránok pre vývojárov).
// Kým súbor v projekte nie je, ukáže sa čisté textové tlačidlo v rovnakom tvare.
const BADGE = {
  ios: { src: '/brand/app-store.svg', small: 'Stiahnuť v', big: 'App Store', label: 'Stiahnuť v App Store' },
  android: { src: '/brand/google-play.png', small: 'Nájdete na', big: 'Google Play', label: 'Nájdete na Google Play' },
};

export function StoreBadge({ kind, href }: { kind: 'ios' | 'android'; href: string }) {
  const b = BADGE[kind];
  const img = useRef<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);
  return (
    <a href={href} className={`bdg bdg--${kind}${failed ? ' bdg--text' : ''}`} target="_blank" rel="noopener noreferrer" aria-label={`${b.label} (otvorí sa v novom okne)`}>
      {failed ? (
        <span className="bdg__tx">
          <small>{b.small}</small>
          <b>{b.big}</b>
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={img} src={b.src} alt="" height={52} onError={() => setFailed(true)} />
      )}
    </a>
  );
}
