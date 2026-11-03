'use client';

import { useEffect, useRef, useState } from 'react';

// Video na pozadí úvodu: bez zvuku, dookola, s náhľadom (poster) kým sa načíta. Pri „obmedziť pohyb“
// alebo šetrení dát sa nespustí samo (ostane náhľad). Tlačidlo pauzy – pohyb na stránke sa dá vždy zastaviť (WCAG 2.2.2).
export function HeroVideo({ src, poster }: { src: string; poster: string }) {
  const v = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = v.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const save = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (reduce || save) return;
    el.src = src;
    el.play().catch(() => setPlaying(false));
  }, [src]);

  const toggle = () => {
    const el = v.current;
    if (!el) return;
    if (!el.src) el.src = src;
    if (el.paused) el.play().catch(() => undefined);
    else el.pause();
  };

  return (
    <>
      <video
        ref={v}
        className="hx2__video"
        poster={poster}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
        onPlaying={() => {
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
      />
      <button type="button" className="hx2__vbtn" onClick={toggle} aria-label={playing ? 'Pozastaviť video v pozadí' : 'Prehrať video v pozadí'}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          {playing ? <path d="M3 2h3v10H3zM8 2h3v10H8z" fill="currentColor" /> : <path d="M3 1.5v11l9-5.5z" fill="currentColor" />}
        </svg>
      </button>
    </>
  );
}
