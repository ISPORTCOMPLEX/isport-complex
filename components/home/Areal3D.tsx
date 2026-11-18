'use client';

import { useEffect, useRef, useState } from 'react';
import type { Scene, Weather } from '@/lib/sky';
import type { Areal, Zone3D } from '@/components/home/areal3d/scene';
import { useT } from '@/lib/i18n/client';

// 3D režim areálu (len počítač s WebGL a bez „obmedziť pohyb“). Three.js sa načíta až tu, samostatným balíkom.
// Ťahaním sa areál otáča, klik na časť ju priblíži (rovnako ako 2D). Animácia stojí, keď areál nie je vidno
// alebo je karta na pozadí. Polohy štítkov sa nastavujú cez CSSOM (žiadne inline štýly v HTML – CSP).

type Label = { zone: Zone3D; name: string };

export function supports3D(): boolean {
  if (typeof window === 'undefined') return false;
  if (!window.matchMedia('(min-width: 1001px) and (pointer: fine)').matches) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function Areal3D({
  sky,
  now,
  weather,
  labels,
  open,
  active,
  onPick,
  onHover,
  onReady,
}: {
  sky: Scene;
  now: number;
  weather: Weather;
  labels: Label[];
  open: Zone3D | null;
  active: Zone3D | null;
  onPick: (z: Zone3D | null) => void;
  onHover: (z: Zone3D | null) => void;
  onReady?: (ok: boolean) => void;
}) {
  const tr = useT();
  const wrap = useRef<HTMLDivElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const tags = useRef<Map<Zone3D, HTMLElement>>(new Map());
  const areal = useRef<Areal | null>(null);
  const activeRef = useRef<Zone3D | null>(active);
  const openRef = useRef<Zone3D | null>(open);
  const cb = useRef({ onPick, onHover });
  const [ready, setReady] = useState(false);
  activeRef.current = active;
  openRef.current = open;
  cb.current = { onPick, onHover };
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  // stavba scény a slučka
  useEffect(() => {
    let dead = false;
    let raf = 0;
    let visible = true;
    let io: IntersectionObserver | null = null;
    const t0 = performance.now();
    const perf = { n: 0, sum: 0, last: 0, low: false };
    const el = canvas.current!;
    const box = wrap.current!;

    const loop = () => {
      raf = 0;
      const a = areal.current;
      if (!a || dead || !visible || document.hidden) return;
      const w = box.clientWidth;
      const h = box.clientHeight;
      const t = performance.now();
      a.render((t - t0) / 1000, w, h, activeRef.current);
      // prvé 3 s merania: ak snímka trvá dlho, prepne na nižšiu kvalitu (raz)
      if (perf.n < 180 && !perf.low) {
        if (perf.last) perf.sum += t - perf.last;
        perf.last = t;
        perf.n++;
        if (perf.n === 90 && perf.sum / 89 > 30) {
          perf.low = true;
          a.setQuality('low');
        }
      }
      tags.current.forEach((node, z) => {
        const p = a.project(z, w, h);
        node.style.setProperty('translate', `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`);
        node.classList.toggle('is-hidden', !p.visible || (!!openRef.current && openRef.current !== z));
      });
      raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop);
    };

    let started = false;
    const start = async () => {
      if (started) return;
      started = true;
      try {
        const font = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim() || 'sans-serif';
        // písmo na nápisy v 3D (tabuľa, dres, strecha) musí byť načítané skôr, než sa nakreslí do textúr
        await Promise.all([document.fonts?.load(`900 italic 64px ${font}`), document.fonts?.ready]).catch(() => undefined);
        const mod = await import('@/components/home/areal3d/scene');
        if (dead) return;
        const cores = navigator.hardwareConcurrency || 4;
        areal.current = mod.createAreal(el, { font, now: Date.now(), quality: cores >= 6 && (window.devicePixelRatio || 1) <= 2 ? 'high' : 'low' });
        el.addEventListener('webglcontextlost', () => onReadyRef.current?.(false));
        setReady(true);
        onReadyRef.current?.(true);
        kick();
      } catch {
        onReadyRef.current?.(false);
      }
    };

    // 3D sa načíta až keď sa areál blíži k obrazovke
    io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible) start();
        kick();
      },
      { rootMargin: '300px 0px' },
    );
    io.observe(box);
    const onVis = () => kick();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      areal.current?.dispose();
      areal.current = null;
    };
  }, []);
  // obloha a počasie
  useEffect(() => {
    if (ready) areal.current?.setSky(sky, weather, now);
  }, [ready, sky, weather, now]);
  // kamera na otvorenú časť
  useEffect(() => {
    if (ready) areal.current?.focus(open);
  }, [ready, open]);

  // ovládanie myšou: ťahanie otáča, klik vyberie časť
  const drag = useRef<{ x: number; y: number; moved: number } | null>(null);
  const norm = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1] as const;
  };
  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, moved: 0 };
    canvas.current?.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const a = areal.current;
    if (!a) return;
    const d = drag.current;
    if (d) {
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      d.moved += Math.abs(dx) + Math.abs(dy);
      d.x = e.clientX;
      d.y = e.clientY;
      if (d.moved > 4) {
        a.rotate(dx, dy);
        wrap.current?.classList.add('is-dragging');
      }
      return;
    }
    if (openRef.current) return;
    const [nx, ny] = norm(e);
    const z = a.pick(nx, ny);
    if (z !== activeRef.current) cb.current.onHover(z);
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    wrap.current?.classList.remove('is-dragging');
    if (!d || d.moved > 4 || !areal.current) return;
    const [nx, ny] = norm(e);
    const z = areal.current.pick(nx, ny);
    if (openRef.current && z === openRef.current) cb.current.onPick(null);
    else if (z) cb.current.onPick(z);
  };

  return (
    <div ref={wrap} className={`a3d${ready ? ' is-ready' : ''}${active ? ' is-hot' : ''}`}>
      <canvas
        ref={canvas}
        className="a3d__canvas"
        aria-hidden="true"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={() => {
          if (!drag.current && !openRef.current) cb.current.onHover(null);
        }}
      />
      <div className="a3d__tags" aria-hidden="true">
        {labels.map((l) => (
          <span
            key={l.zone}
            ref={(n) => {
              if (n) tags.current.set(l.zone, n);
              else tags.current.delete(l.zone);
            }}
            className={`a3d__tag${active === l.zone ? ' is-on' : ''}`}
          >
            {l.name}
          </span>
        ))}
      </div>
      {ready && !open ? (
        <div className="a3d__ctl">
          <button type="button" className="a3d__btn" aria-label={tr('Priblížiť')} onClick={() => areal.current?.zoom(0.85)}>
            +
          </button>
          <button type="button" className="a3d__btn" aria-label={tr('Oddialiť')} onClick={() => areal.current?.zoom(1.18)}>
            −
          </button>
          <button type="button" className="a3d__btn a3d__btn--w" onClick={() => areal.current?.reset()}>
            {tr('Pôvodný pohľad')}
          </button>
        </div>
      ) : null}
      {!ready ? <span className="a3d__load">{tr('Načítavam 3D areál…')}</span> : null}
    </div>
  );
}
