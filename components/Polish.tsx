'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

// Drobnosti, ktoré robia web „živým“ – všetko len ako vylepšenie (bez JavaScriptu web funguje rovnako):
//  • plynulé prechody medzi stránkami (View Transitions API; prvky s rovnakým view-transition-name sa „premenia“),
//  • nadpis v úvode sa vysunie po písmenách,
//  • hlavné tlačidlá sa na počítači jemne pritiahnu ku kurzoru (data-magnet),
//  • farba lišty prehliadača na mobile podľa sekcie, ktorá je práve hore.
// Pri „obmedziť pohyb“ sa nič z pohybu nerobí.

type VT = { finished: Promise<void> };
type DocVT = Document & { startViewTransition?: (cb: () => Promise<void>) => VT };
let done: (() => void) | null = null;

const THEME: [string, string][] = [
  ['.ice2', '#dfeaf2'],
  ['.ft2', '#000000'],
  ['.stats', '#0f0f12'],
];
const BASE = '#0A0A0A';

export function Polish() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  // nová stránka je vykreslená – prechod môže dobehnúť
  useEffect(() => {
    if (done) {
      const d = done;
      done = null;
      requestAnimationFrame(() => d());
    }
  }, [pathname, search]);

  // prechody medzi stránkami: zachytí kliknutie na interný odkaz skôr než Next Link
  useEffect(() => {
    const doc = document as DocVT;
    if (!doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target || a.hasAttribute('download') || a.dataset.noVt !== undefined) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (/^\/(admin|api|videa|obrazky|aplikacia)(\/|$)/.test(url.pathname)) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return; // kotva na tej istej stránke
      e.preventDefault();
      e.stopPropagation();
      const href = url.pathname + url.search + url.hash;
      doc.startViewTransition!(
        () =>
          new Promise<void>((resolve) => {
            done = resolve;
            window.setTimeout(() => {
              if (done === resolve) {
                done = null;
                resolve();
              }
            }, 1800);
            router.push(href, { scroll: !url.hash });
          }),
      );
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [router]);

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
