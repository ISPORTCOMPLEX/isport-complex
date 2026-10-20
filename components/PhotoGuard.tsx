'use client';

import { useEffect } from 'react';

// Na fotkách webu vypne kontextové menu (Uložiť obrázok ako…) a ťahanie myšou.
// Len fotky z úložiska webu (.ph) – QR kód rezervácie si zákazník uložiť môže.
export function PhotoGuard() {
  useEffect(() => {
    const isPhoto = (t: EventTarget | null) => t instanceof Element && t.closest('.ph') !== null;
    const block = (e: Event) => {
      if (isPhoto(e.target)) e.preventDefault();
    };
    document.addEventListener('contextmenu', block);
    document.addEventListener('dragstart', block);
    return () => {
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('dragstart', block);
    };
  }, []);
  return null;
}
