'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Pano } from '@/lib/media';

// 360° prehliadka: panoráma 2:1 natiahnutá zvnútra na guľu (three.js, načíta sa až tu).
// Ťahanie (myš, prst) otáča pohľad, koliesko / štipnutie / +− približuje, šípky na klávesnici tiež.
// Bez WebGL ostane plochá panoráma s vodorovným posúvaním. Pri „obmedziť pohyb“ sa pohľad sám neotáča.
/* eslint-disable @typescript-eslint/no-explicit-any */

export function PanoViewer({ scenes }: { scenes: Pano[] }) {
  const box = useRef<HTMLDivElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const api = useRef<{ load: (src: string) => Promise<void>; zoom: (f: number) => void; look: (dx: number, dy: number) => void; dispose: () => void } | null>(null);
  const [idx, setIdx] = useState(0);
  const [state, setState] = useState<'init' | 'loading' | 'ready' | 'flat'>('init');
  const [full, setFull] = useState(false);
  const cur = scenes[idx];

  useEffect(() => {
    let dead = false;
    let raf = 0;
    (async () => {
      let ok = false;
      try {
        const c = document.createElement('canvas');
        ok = !!(c.getContext('webgl2') || c.getContext('webgl'));
      } catch {}
      if (!ok) return setState('flat');
      const T: any = await import('three');
      if (dead) return;
      const el = canvas.current!;
      const r = new T.WebGLRenderer({ canvas: el, antialias: true });
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      const S = new T.Scene();
      const cam = new T.PerspectiveCamera(75, 1, 0.1, 100);
      const geo = new T.SphereGeometry(10, 64, 40);
      geo.scale(-1, 1, 1);
      const mat = new T.MeshBasicMaterial({ color: 0xffffff });
      S.add(new T.Mesh(geo, mat));
      const loader = new T.TextureLoader();
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let lon = 0;
      let lat = 0;
      let fov = 75;
      let idle = performance.now();
      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (document.hidden) return;
        const w = el.clientWidth;
        const h = el.clientHeight;
        if (!reduce && performance.now() - idle > 4000) lon += 0.03;
        lat = Math.max(-80, Math.min(80, lat));
        const phi = T.MathUtils.degToRad(90 - lat);
        const th = T.MathUtils.degToRad(lon);
        cam.aspect = w / h;
        cam.fov = fov;
        cam.updateProjectionMatrix();
        cam.lookAt(Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th));
        r.setSize(w, h, false);
        r.render(S, cam);
      };
      api.current = {
        load: (src) =>
          new Promise((res, rej) =>
            loader.load(
              src,
              (t: any) => {
                t.colorSpace = T.SRGBColorSpace;
                t.anisotropy = r.capabilities.getMaxAnisotropy?.() ?? 1;
                mat.map?.dispose?.();
                mat.map = t;
                mat.needsUpdate = true;
                res();
              },
              undefined,
              rej,
            ),
          ),
        zoom: (f) => {
          fov = Math.max(35, Math.min(95, fov * f));
          idle = performance.now();
        },
        look: (dx, dy) => {
          lon -= dx * 0.12 * (fov / 75);
          lat += dy * 0.12 * (fov / 75);
          idle = performance.now();
        },
        dispose: () => {
          cancelAnimationFrame(raf);
          mat.map?.dispose?.();
          mat.dispose();
          geo.dispose();
          r.dispose();
        },
      };
      setState('loading');
      loop();
    })();
    return () => {
      dead = true;
      api.current?.dispose();
      api.current = null;
    };
  }, []);

  // načítanie scény
  useEffect(() => {
    if (state === 'init' || state === 'flat' || !api.current || !cur) return;
    let live = true;
    setState('loading');
    api.current
      .load(cur.src)
      .then(() => live && setState('ready'))
      .catch(() => live && setState('flat'));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, state === 'init']);

  // ťahanie a štipnutie
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef(0);
  const onDown = (e: React.PointerEvent) => {
    canvas.current?.setPointerCapture(e.pointerId);
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const onMove = (e: React.PointerEvent) => {
    const p = pts.current.get(e.pointerId);
    if (!p || !api.current) return;
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()];
      const d0 = Math.hypot(a.x - b.x, a.y - b.y);
      pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [c, d] = [...pts.current.values()];
      const d1 = Math.hypot(c.x - d.x, c.y - d.y);
      if (pinch.current && d0 > 0) api.current.zoom(d0 / d1);
      pinch.current = d1;
      return;
    }
    api.current.look(e.clientX - p.x, e.clientY - p.y);
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const onUp = (e: React.PointerEvent) => {
    pts.current.delete(e.pointerId);
    if (pts.current.size < 2) pinch.current = 0;
  };
  // koliesko len nad prehliadačom (stránka sa inak posúva normálne)
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!api.current) return;
      e.preventDefault();
      api.current.zoom(e.deltaY > 0 ? 1.06 : 0.94);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  const onKey = (e: React.KeyboardEvent) => {
    const a = api.current;
    if (!a) return;
    const k: Record<string, () => void> = { ArrowLeft: () => a.look(60, 0), ArrowRight: () => a.look(-60, 0), ArrowUp: () => a.look(0, 40), ArrowDown: () => a.look(0, -40), '+': () => a.zoom(0.9), '-': () => a.zoom(1.1) };
    if (k[e.key]) {
      e.preventDefault();
      k[e.key]();
    }
  };

  const toggleFull = useCallback(() => {
    const el = box.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else el.requestFullscreen?.().catch(() => undefined);
  }, []);
  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  if (!cur) return null;
  return (
    <div className="pv360">
      <div ref={box} className={`pv360__stage is-${state}`}>
        {state === 'flat' ? (
          <div className="pv360__flat" tabIndex={0} aria-label={`${cur.title} – panoráma, posúvaj do strán`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cur.src} alt={cur.title} />
          </div>
        ) : (
          <canvas
            ref={canvas}
            className="pv360__canvas"
            tabIndex={0}
            role="img"
            aria-label={`${cur.title} – 360° pohľad. Otáčaj ťahaním alebo šípkami, približuj kolieskom alebo + a −.`}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onKeyDown={onKey}
          />
        )}
        {state === 'loading' || state === 'init' ? <span className="pv360__load">Načítavam panorámu…</span> : null}
        <div className="pv360__bar">
          <p className="pv360__title">
            <span className="pv360__n">
              {idx + 1} / {scenes.length}
            </span>
            {cur.title}
          </p>
          {state === 'ready' ? (
            <div className="pv360__ctl">
              <button type="button" className="a3d__btn" aria-label="Priblížiť" onClick={() => api.current?.zoom(0.85)}>
                +
              </button>
              <button type="button" className="a3d__btn" aria-label="Oddialiť" onClick={() => api.current?.zoom(1.18)}>
                −
              </button>
              <button type="button" className="a3d__btn a3d__btn--w" onClick={toggleFull}>
                {full ? 'Zavrieť celú obrazovku' : 'Celá obrazovka'}
              </button>
            </div>
          ) : null}
        </div>
        {state === 'ready' ? (
          <p className="pv360__hint" aria-hidden="true">
            Ťahaj pre rozhliadnutie
          </p>
        ) : null}
      </div>
      {scenes.length > 1 ? (
        <ul className="pv360__list" aria-label="Miesta prehliadky">
          {scenes.map((s, i) => (
            <li key={s.id}>
              <button type="button" aria-pressed={i === idx} onClick={() => setIdx(i)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.thumb} alt="" loading="lazy" width={240} height={120} />
                <span>{s.title}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
