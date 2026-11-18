'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

// Drobnosti, ktoré robia web „živým“ – všetko len ako vylepšenie (bez JavaScriptu web funguje rovnako):
//  • krátke vysunutie novej stránky po prechode (bez čakania na snímku stránky – nič nesekne),
//  • zastavenie animácií mimo obrazovky,
//  • nadpis v úvode sa vysunie po písmenách,
//  • hlavné tlačidlá sa na počítači jemne pritiahnu ku kurzoru (data-magnet),
//  • farba lišty prehliadača na mobile podľa sekcie, ktorá je práve hore.
// Pri „obmedziť pohyb“ sa nič z pohybu nerobí.

const THEME: [string, string][] = [
  ['.ice2', '#dfeaf2'],
  ['.ft2', '#000000'],
  ['.stats', '#0f0f12'],
];
const BASE = '#0A0A0A';

export function Polish() {
  const pathname = usePathname();
  const search = useSearchParams();

  // prechod medzi stránkami: nová stránka sa jemne vysunie (len opacity a posun – plynulé aj na slabom mobile).
  // Navigácia nikdy nečaká na animáciu; prvé načítanie sa neanimuje.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const main = document.getElementById('obsah');
    if (!main) return;
    main.classList.remove('pg-in');
    void main.offsetWidth;
    main.classList.add('pg-in');
    const t = window.setTimeout(() => main.classList.remove('pg-in'), 450);
    return () => window.clearTimeout(t);
  }, [pathname]);

  // animácie ilustrácií mimo obrazovky stoja (šetrí procesor a batériu)
  useEffect(() => {
    const els = document.querySelectorAll('.cxe__art, .band2__art, .zone-art, .tk, .hx2');
    if (!els.length || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((list) => list.forEach((e) => e.target.classList.toggle('is-off', !e.isIntersecting)), { rootMargin: '120px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [pathname, search]);

  // nadpis v úvode po písmenách (raz po načítaní stránky)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const h = document.querySelector('.hx2__title');
    if (!h || h.classList.contains('lt-on')) return;
    let i = 0;
    const walk = (node: Node) => {
      for (const n of [...node.childNodes]) {
        if (n.nodeType === Node.TEXT_NODE && n.textContent) {
          const frag = document.createDocumentFragment();
          for (const ch of n.textContent) {
            const s = document.createElement('span');
            s.className = 'lt';
            s.textContent = ch;
            s.style.setProperty('--i', String(i++));
            frag.appendChild(s);
          }
          n.replaceWith(frag);
        } else if (n.nodeType === Node.ELEMENT_NODE && (n as Element).tagName !== 'BR') walk(n);
      }
    };
    const label = h.textContent ?? '';
    walk(h);
    h.setAttribute('aria-label', label.replace(/\s+/g, ' ').trim());
    h.querySelectorAll('.lt').forEach((s) => s.setAttribute('aria-hidden', 'true'));
    h.classList.add('lt-on');
  }, [pathname]);

  // magnetické tlačidlá (len myš)
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const els = [...document.querySelectorAll<HTMLElement>('[data-magnet]')];
    if (!els.length) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        for (const el of els) {
          const r = el.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          const d = Math.hypot(dx, dy);
          const reach = Math.max(r.width, r.height) * 0.9 + 40;
          if (d < reach) el.style.setProperty('translate', `${(dx * 0.18).toFixed(1)}px ${(dy * 0.28).toFixed(1)}px`);
          else el.style.removeProperty('translate');
        }
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
      els.forEach((el) => el.style.removeProperty('translate'));
    };
  }, [pathname]);

  // farba lišty prehliadača na mobile podľa sekcie pri hornom okraji
  useEffect(() => {
    if (!window.matchMedia('(max-width: 1000px)').matches) return;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    const m = meta;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        let color = BASE;
        for (const [sel, c] of THEME) {
          const el = document.querySelector(sel);
          if (!el) continue;
          const r = el.getBoundingClientRect();
          if (r.top <= 8 && r.bottom > 8) color = c;
        }
        if (m.content !== color) m.content = color;
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      cancelAnimationFrame(raf);
      m.content = BASE;
    };
  }, [pathname]);

  return null;
}
