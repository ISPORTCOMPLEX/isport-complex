'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ZoneInfo } from '@/components/home/ComplexExplorer';
import type { Weather } from '@/lib/sky';

// Areál (ilustrácia aj 3D) sa nenačíta s úvodom – kód, obrázky ani 3D scéna sa nesťahujú,
// kým návštevník neklikne na „Prejdi si areál v 3D“ (odkaz #komplex) alebo nepríde priamo na /#komplex.
const Explorer = dynamic(() => import('@/components/home/ComplexExplorer').then((m) => m.ComplexExplorer), {
  ssr: false,
  loading: () => <div className="cxe cxe--loading" aria-hidden="true" />,
});

export function ComplexGate({ head, zones, now, weather }: { head: ReactNode; zones: ZoneInfo[]; now: number; weather?: Weather }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const scroll = useRef(false);

  useEffect(() => {
    const show = (jump: boolean) => {
      scroll.current = jump;
      setOpen(true);
      if (jump) requestAnimationFrame(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    };
    if (window.location.hash === '#komplex') show(true);
    const onHash = () => {
      if (window.location.hash === '#komplex') show(true);
    };
    // klik na odkaz #komplex aj keď je adresa už s #komplex (vtedy hashchange nepríde)
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href="#komplex"]');
      if (!a) return;
      e.preventDefault();
      if (window.location.hash !== '#komplex') history.pushState(null, '', '#komplex');
      show(true);
    };
    window.addEventListener('hashchange', onHash);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('hashchange', onHash);
      document.removeEventListener('click', onClick);
    };
  }, []);

  return (
    <section id="komplex" ref={ref} className="cx3" aria-labelledby={open ? 'cx2-t' : undefined} hidden={!open}>
      {open ? (
        <div className="wrap cx2">
          {head}
          <Explorer zones={zones} now={now} weather={weather} />
        </div>
      ) : null}
    </section>
  );
}
