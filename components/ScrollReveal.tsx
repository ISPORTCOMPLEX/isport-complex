'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

// Jemné objavovanie sekcií pri posúvaní a „načítanie“ čísel v páse štatistík.
// Triedy pridáva až skript – bez JavaScriptu (a pre vyhľadávače) je obsah normálne viditeľný.
// Čo je pri načítaní už na obrazovke, zobrazí sa hneď. Pri „obmedziť pohyb“ sa nerobí nič.
const SEL = ['.sec-head', '.nw2__big', '.nw2__row', '.qb2', '.stats__in > div', '.cxe', '.who__card', '.loc2__info', '.loc2__map', '.pp__copy', '.pp__steps', '.ix__prices > div', '[data-rv]'].join(',');

function countUp(el: Element) {
  const txt = el.textContent ?? '';
  const m = txt.match(/\d+/);
  if (!m) return;
  const end = Number(m[0]);
  const t0 = performance.now();
  const step = (t: number) => {
    const k = Math.min(1, (t - t0) / 1100);
    el.textContent = txt.replace(/\d+/, String(Math.round(end * (1 - Math.pow(1 - k, 3)))));
    if (k < 1) requestAnimationFrame(step);
    else el.textContent = txt;
  };
  requestAnimationFrame(step);
}

export function ScrollReveal() {
  const pathname = usePathname();
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const els = [...document.querySelectorAll(SEL)].filter((el) => !el.classList.contains('rv'));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const t = e.target;
          t.classList.add('in');
          io.unobserve(t);
          // po dobehnutí triedy zmiznú, aby nebránili vlastným efektom prvku (napr. zdvihnutie karty)
          window.setTimeout(() => t.classList.remove('rv', 'rv-l', 'rv-d0', 'rv-d1', 'rv-d2', 'rv-d3', 'rv-d4', 'in'), 1600);
          if (e.target.matches('.stats__in > div')) {
            const n = e.target.querySelector('.wide-display');
            if (n) countUp(n);
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) continue; // už viditeľné – nechať tak
      const sibs = el.parentElement ? [...el.parentElement.children].filter((c) => c.matches(SEL)) : [];
      const k = Math.min(4, Math.max(0, sibs.indexOf(el)));
      el.classList.add('rv', `rv-d${k}`);
      if (el.matches('.sec-head')) el.classList.add('rv-l');
      io.observe(el);
    }
    return () => io.disconnect();
  }, [pathname]);
  return null;
}
