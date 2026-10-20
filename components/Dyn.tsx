'use client';

import { createElement, useLayoutEffect, useRef, type ElementType } from 'react';

// Vypočítané rozmery a pozície (grafy, kalendár, priebeh nahrávania) bez atribútu style="…".
// CSP nepovoľuje inline štýly v HTML (style-src bez 'unsafe-inline'); hodnoty preto nastavíme
// po načítaní cez element.style (CSSOM), ktoré CSP neblokuje. Vlastnosti sa píšu ako v CSS: { 'grid-row': '2 / 4' }.
type Props = { as?: ElementType; css: Record<string, string | number | undefined>; [key: string]: unknown };

export function Dyn({ as = 'div', css, ...rest }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const key = JSON.stringify(css);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = JSON.parse(key) as Record<string, string | number | null>;
    for (const [k, v] of Object.entries(set)) {
      if (v === null || v === undefined) el.style.removeProperty(k);
      else el.style.setProperty(k, String(v));
    }
  }, [key]);
  return createElement(as, { ...rest, ref });
}
