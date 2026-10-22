'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { CloudImage } from '@/components/CloudImage';
import type { WebPhoto } from '@/lib/media';
import type { IceToday } from '@/lib/booking/iceToday';

type Panel = 'lad' | 'komplex';
export type MegaPhotos = { lad: WebPhoto | null; skyboxy: WebPhoto | null; bufet: WebPhoto | null; ihrisko: WebPhoto | null; fitness: WebPhoto | null };

const ICE_PATHS = ['/ladova-plocha', '/cennik', '/rezervacia'];
const KOMPLEX_PATHS = ['/bufet-skyboxy', '/ihrisko', '/fitness-wellness'];
const under = (path: string, list: string[]) => list.some((p) => path === p || path.startsWith(`${p}/`));
const eur = (v: number) => `${v.toLocaleString('sk-SK')} €`;

function Chev() {
  return (
    <svg className="mm__chev" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Photo({ p, sizes }: { p: WebPhoto | null; sizes: string }) {
  return p ? <CloudImage photo={{ ...p, alt: '' }} sizes={sizes} /> : <span className="mm__noimg" aria-hidden="true" />;
}

// Hlavné menu na počítači: Novinky · Ľadová plocha ▾ · Komplex ▾ · Pre kluby · Fotky · Kontakt.
// Ľad a Komplex rozbalia panel na celú šírku (myšou aj klávesnicou, Esc zavrie).
export function MegaNav({ ice, photos }: { ice: IceToday; photos: MegaPhotos }) {
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState<Panel | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const root = useRef<HTMLDivElement | null>(null);

  useEffect(() => setOpen(null), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const btn = root.current?.querySelector<HTMLButtonElement>(`[aria-controls="mm-${open}"]`);
      setOpen(null);
      btn?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  const hoverOpen = (p: Panel) => (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(p), 90);
  };
  const hoverLeave = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(null), 180);
  };
  const keep = () => window.clearTimeout(timer.current);
  const toggle = (p: Panel) => () => setOpen((cur) => (cur === p ? null : p));
  const close = () => setOpen(null);

  const trigger = (p: Panel, label: string, active: boolean) => (
    <button
      type="button"
      className={`mm__item${active ? ' is-current' : ''}${open === p ? ' is-open' : ''}`}
      aria-expanded={open === p}
      aria-controls={`mm-${p}`}
      onClick={toggle(p)}
      onPointerEnter={hoverOpen(p)}
      onPointerLeave={hoverLeave}
    >
      {label}
      <Chev />
    </button>
  );
  const link = (href: string, label: string) => (
    <Link href={href} className={`mm__item${pathname === href || pathname.startsWith(`${href}/`) ? ' is-current' : ''}`} aria-current={pathname === href ? 'page' : undefined} onPointerEnter={() => setOpen(null)}>
      {label}
    </Link>
  );

  const iceTitle = ice.day === 'zajtra' ? 'Ľad zajtra' : 'Ľad dnes';

  return (
    <div className="mm" ref={root}>
      <nav aria-label="Hlavné menu" className="mm__nav">
        {link('/aktuality', 'Novinky')}
        {trigger('lad', 'Ľadová plocha', under(pathname, ICE_PATHS))}
        {trigger('komplex', 'Komplex', under(pathname, KOMPLEX_PATHS))}
        {link('/pre-kluby', 'Pre kluby')}
        {link('/fotky', 'Fotky')}
        {link('/kontakt', 'Kontakt')}
      </nav>

      {open ? <div className="mm__dim" aria-hidden="true" onClick={close} /> : null}

      <div id="mm-lad" className={`mm__panel${open === 'lad' ? ' is-open' : ''}`} hidden={open !== 'lad'} onPointerEnter={keep} onPointerLeave={hoverLeave}>
        <div className="wrap mm__ice">
          <div className="mm__col">
            <Link href="/ladova-plocha" className="mm__ln">
              <b>
                Ľadová plocha <i aria-hidden="true">→</i>
              </b>
              <span>Celá tréningová plocha na prenájom pre kluby, školy, firmy aj partie.</span>
            </Link>
            <Link href="/rezervacia" className="mm__ln">
              <b>
                Rezervácia online <i aria-hidden="true">→</i>
              </b>
              <span>Voľné hodiny hneď, potvrdenie s QR kódom do telefónu.</span>
            </Link>
          </div>
          <div className="mm__col">
            <Link href="/cennik" className="mm__ln">
              <b>
                Cenník <i aria-hidden="true">→</i>
              </b>
              <span>
                Mimo špičky {eur(ice.offPeak)}, špička a víkend {eur(ice.peak)} za hodinu.
              </span>
            </Link>
            <Link href="/pre-kluby" className="mm__ln">
              <b>
                Pre kluby <i aria-hidden="true">→</i>
              </b>
              <span>Sezónny prenájom s pevnými časmi a mesačnou fakturáciou.</span>
            </Link>
          </div>
          <Link href="/rezervacia" className="mm__card">
            <Photo p={photos.lad} sizes="440px" />
            <span className="mm__card-ov" aria-hidden="true" />
            <span className="mm__card-tx">
              <span className="mm__live">
                <i aria-hidden="true" />
                Naživo z rezervácií
              </span>
              <strong className="cond">{iceTitle}</strong>
              {ice.hours.length ? (
                <span className="mm__slots">
                  {ice.hours.slice(0, 4).map((h) => (
                    <span key={h}>{h}</span>
                  ))}
                  {ice.hours.length > 4 ? <span>+{ice.hours.length - 4}</span> : null}
                </span>
              ) : (
                <span className="mm__full">Najbližšie voľné časy nájdeš v rezervácii</span>
              )}
              <span className="mm__go">
                Rezervovať ľad <span aria-hidden="true">→</span>
              </span>
            </span>
          </Link>
        </div>
      </div>

      <div id="mm-komplex" className={`mm__panel${open === 'komplex' ? ' is-open' : ''}`} hidden={open !== 'komplex'} onPointerEnter={keep} onPointerLeave={hoverLeave}>
        <div className="wrap mm__tiles">
          {[
            { href: '/bufet-skyboxy', name: 'Skyboxy', text: 'Presklené boxy nad ľadom', p: photos.skyboxy },
            { href: '/bufet-skyboxy', name: 'Bufet', text: 'Občerstvenie priamo v hale', p: photos.bufet },
            { href: '/ihrisko', name: 'Futbalové ihrisko', text: 'Vonkajšie ihrisko pri komplexe', p: photos.ihrisko },
            { href: '/fitness-wellness', name: 'Fitness a wellness', text: 'Posilňovňa a regenerácia', p: photos.fitness, soon: true },
          ].map((t) => (
            <Link key={t.name} href={t.href} className="mm__tile">
              <span className="mm__tile-im">
                <Photo p={t.p} sizes="300px" />
                {t.soon ? <span className="mm__soon">Pripravujeme</span> : null}
              </span>
              <span className="mm__tile-tx">
                <b>
                  {t.name} <i aria-hidden="true">→</i>
                </b>
                <span>{t.text}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
