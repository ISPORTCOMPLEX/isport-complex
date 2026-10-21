'use client';

import { useState } from 'react';

// YouTube sa načíta až po kliknutí (rýchlejšia stránka, žiadne cookies od Googlu bez súhlasu).
// Náhľad je náš vlastný – nič sa z YouTube nesťahuje, kým návštevník neklikne.
export function YouTube({ id, title }: { id: string; title: string }) {
  const [on, setOn] = useState(false);
  if (on)
    return (
      <div className="yt">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  return (
    <button type="button" className="yt yt--off" onClick={() => setOn(true)}>
      <span className="yt__play" aria-hidden="true">
        <svg width="30" height="30" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" fill="currentColor" />
        </svg>
      </span>
      <span className="yt__t">
        <b>Prehrať video</b>
        <small>Video sa načíta z YouTube po kliknutí</small>
      </span>
    </button>
  );
}
