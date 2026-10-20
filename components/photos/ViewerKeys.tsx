'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Ovládanie prehliadača fotiek: ← → klávesy, Esc, potiahnutie prstom. Susedné fotky sa načítajú vopred.
export function ViewerKeys({ prev, next, close, preload }: { prev: string; next: string; close: string; preload: { src: string; srcSet: string }[] }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight') router.replace(next, { scroll: false });
      else if (e.key === 'ArrowLeft') router.replace(prev, { scroll: false });
      else if (e.key === 'Escape') router.push(close);
    };
    let x0: number | null = null;
    let y0 = 0;
    const onStart = (e: TouchEvent) => {
      x0 = e.touches[0]?.clientX ?? null;
      y0 = e.touches[0]?.clientY ?? 0;
    };
    const onEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (x0 === null || !t) return;
      const dx = t.clientX - x0;
      const dy = t.clientY - y0;
      x0 = null;
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
      router.replace(dx < 0 ? next : prev, { scroll: false });
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd);
    for (const p of preload) {
      const img = new Image();
      img.sizes = '100vw';
      img.srcset = p.srcSet;
      img.src = p.src;
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
    };
  }, [router, prev, next, close, preload]);
  return null;
}
