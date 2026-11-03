// 3D areál I-SPORT COMPLEX (Three.js): hala 1 s odkrytou prednou stenou, ihrisko medzi halami, hala 2.
// Postavičky majú kĺby a hýbu sa v čase (korčuľovanie, strela, prihrávky, drep, beh, fanúšikovia).
// Svetlo a obloha podľa skutočného slnka a počasia v Košiciach (lib/sky). Bez knižníc okrem three.
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from 'three';
import type { Scene as SkyScene, Weather } from '@/lib/sky';

const T: any = THREE;

export type Zone3D = 'ice' | 'sky' | 'food' | 'pitch' | 'gym' | 'well';
export type ArealOptions = { font: string; quality: 'high' | 'low' };
type Cam = { t: any; p: any; fov: number };

// --- pomocníci ---
const M = (c: number, o: Record<string, unknown> = {}) => new T.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0.05, ...o });
const SKIN = [0xf2c9a8, 0xc68b5e, 0x8d5a3b];
const ease = (x: number) => 0.5 - 0.5 * Math.cos(x);
const smooth = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}

// --- postavička s kĺbmi ---
type P = { color: number; number?: number; helmet?: number; hair?: number; mask?: boolean; gloves?: number; skates?: boolean; stick?: boolean; pads?: boolean; bulk?: number; pants?: number; socks?: number; boots?: number; skin?: number };
function limb(parent: any, len: number, r: number, mat: any) {
  const j = new T.Group();
  parent.add(j);
  const m = new T.Mesh(new T.CapsuleGeometry(r, len, 4, 10), mat);
  m.position.y = -len / 2 - r * 0.2;
  m.castShadow = true;
  j.add(m);
  const end = new T.Group();
  end.position.y = -len - r * 0.4;
  j.add(end);
  return { j, end };
}
function person(o: P, font: string) {
  const root = new T.Group();
  const hips = new T.Group();
  hips.position.y = 1;
  root.add(hips);
  const pants = M(o.pants ?? 0x1b2230, { roughness: 0.7 });
  const shirt = M(o.color, { roughness: 0.55 });
  const skin = M(SKIN[o.skin ?? 0]);
  const torso = new T.Group();
  hips.add(torso);
  const tm = new T.Mesh(new T.CapsuleGeometry(o.bulk ?? 0.3, 0.55, 4, 12), shirt);
  tm.position.y = 0.45;
  tm.scale.set(1.15, 1, 0.8);
  tm.castShadow = true;
  torso.add(tm);
  if (o.number) {
    const tex = canvasTex(128, 128, (g) => {
      g.fillStyle = '#' + o.color.toString(16).padStart(6, '0');
      g.fillRect(0, 0, 128, 128);
      g.fillStyle = '#fff';
      g.fillRect(0, 70, 128, 10);
      g.font = `900 italic 64px ${font}`;
      g.textAlign = 'center';
      g.fillText(String(o.number), 64, 58);
    });
    const back = new T.Mesh(new T.PlaneGeometry(0.5, 0.5), new T.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
    back.position.set(0, 0.5, -0.255);
    back.rotation.y = Math.PI;
    torso.add(back);
  }
  const neck = new T.Group();
  neck.position.y = 0.95;
  torso.add(neck);
  const head = new T.Mesh(new T.SphereGeometry(0.2, 18, 14), skin);
  head.position.y = 0.14;
  head.castShadow = true;
  neck.add(head);
  if (o.helmet !== undefined) {
    const h = new T.Mesh(new T.SphereGeometry(0.225, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), M(o.helmet, { roughness: 0.3, metalness: 0.1 }));
    h.position.y = 0.16;
    neck.add(h);
    const v = new T.Mesh(new T.BoxGeometry(0.3, 0.07, 0.05), new T.MeshPhysicalMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.6, roughness: 0.05 }));
    v.position.set(0, 0.14, 0.2);
    neck.add(v);
  } else if (o.hair !== undefined) {
    const h = new T.Mesh(new T.SphereGeometry(0.212, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), M(o.hair));
    h.position.y = 0.16;
    h.rotation.x = -0.25;
    neck.add(h);
  }
  if (o.mask) {
    const m = new T.Mesh(new T.SphereGeometry(0.24, 16, 12), M(0xf4f7fa, { roughness: 0.3 }));
    m.position.y = 0.15;
    neck.add(m);
    const g = new T.Mesh(new T.BoxGeometry(0.26, 0.2, 0.05), M(0x1b2230));
    g.position.set(0, 0.12, 0.22);
    neck.add(g);
  }
  const arm = (side: number) => {
    const sh = new T.Group();
    sh.position.set(side * 0.38, 0.82, 0);
    torso.add(sh);
    const up = limb(sh, 0.32, 0.085, shirt);
    const handMat = o.gloves !== undefined ? M(o.gloves) : skin;
    const lo = limb(up.end, 0.28, 0.075, handMat);
    lo.end.add(new T.Mesh(new T.SphereGeometry(0.09, 10, 8), handMat));
    return { sh: up.j, el: lo.j };
  };
  const leg = (side: number) => {
    const hp = new T.Group();
    hp.position.set(side * 0.16, 0, 0);
    hips.add(hp);
    const th = limb(hp, 0.4, 0.11, pants);
    const sh = limb(th.end, 0.38, 0.095, o.socks !== undefined ? M(o.socks) : pants);
    const foot = new T.Mesh(new T.BoxGeometry(0.16, 0.12, 0.34), M(o.boots ?? 0x111111));
    foot.position.set(0, -0.02, 0.07);
    sh.end.add(foot);
    if (o.skates) {
      const bl = new T.Mesh(new T.BoxGeometry(0.03, 0.06, 0.42), M(0xd8dee4, { metalness: 0.9, roughness: 0.2 }));
      bl.position.set(0, -0.11, 0.06);
      sh.end.add(bl);
    }
    if (o.pads) {
      const pd = new T.Mesh(new T.BoxGeometry(0.3, 0.75, 0.22), M(0xf4f7fa));
      pd.position.set(0, 0.25, 0.08);
      sh.end.add(pd);
    }
    return { hp: th.j, kn: sh.j };
  };
  const L: any = { root, hips, torso, neck, aL: arm(1), aR: arm(-1), lL: leg(1), lR: leg(-1) };
  if (o.stick) {
    const st = new T.Group();
    st.position.set(-0.22, 0.62, 0.32);
    torso.add(st);
    const shaft = new T.Mesh(new T.CylinderGeometry(0.028, 0.028, 1.75, 6), M(0xd6b07a));
    shaft.position.y = -0.85;
    shaft.castShadow = true;
    st.add(shaft);
    const blade = new T.Mesh(new T.BoxGeometry(0.06, 0.09, 0.38), M(0x1b2230));
    blade.position.set(0, -1.72, 0.16);
    st.add(blade);
    L.stick = st;
  }
  return L;
}
function poseSkater(L: any, ph: number, shoot = 0) {
  L.hips.position.y = 0.92 + Math.sin(ph * 2) * 0.03;
  L.torso.rotation.x = 0.55 - shoot * 0.2;
  L.torso.rotation.y = Math.sin(ph) * 0.15 + shoot * 0.6;
  L.neck.rotation.x = -0.45;
  for (const [l, s] of [[L.lL, 1], [L.lR, -1]] as [any, number][]) {
    const k = Math.sin(ph + (s > 0 ? 0 : Math.PI));
    l.hp.rotation.x = -0.6 + k * 0.25;
    l.hp.rotation.z = s * (0.15 + Math.max(0, k) * 0.45);
    l.kn.rotation.x = 0.9 - k * 0.2;
  }
  L.aR.sh.rotation.set(-0.5 - shoot * 1.2, 0, 0.15);
  L.aR.el.rotation.x = -0.5;
  L.aL.sh.rotation.set(-0.7 - shoot * 0.9, 0, -0.55);
  L.aL.el.rotation.x = -0.9;
  if (L.stick) L.stick.rotation.set(0.25 - shoot * 0.9, 0, 0.12);
}
function poseGoalie(L: any, t: number) {
  L.hips.position.y = 0.72;
  L.torso.rotation.x = 0.35;
  L.neck.rotation.x = -0.25;
  const sh = Math.sin(t * 2.2) * 0.12;
  L.lL.hp.rotation.set(-0.9, 0, 0.55 + sh);
  L.lR.hp.rotation.set(-0.9, 0, -0.55 + sh);
  L.lL.kn.rotation.x = 1.2;
  L.lR.kn.rotation.x = 1.2;
  L.aL.sh.rotation.set(-0.9, 0, 0.9);
  L.aL.el.rotation.x = -0.6;
  L.aR.sh.rotation.set(-0.8, 0, -0.6);
  L.aR.el.rotation.x = -0.5;
  if (L.stick) L.stick.rotation.set(0.55, 0, 0.1);
}
function poseRun(L: any, ph: number, kick = 0) {
  L.hips.position.y = 1 + Math.abs(Math.sin(ph)) * 0.06;
  L.torso.rotation.x = 0.2;
  L.neck.rotation.x = -0.1;
  L.lL.hp.rotation.x = Math.sin(ph) * 0.8 - kick * 1.2;
  L.lR.hp.rotation.x = -Math.sin(ph) * 0.8;
  L.lL.kn.rotation.x = Math.max(0, -Math.cos(ph)) * 1.2 + kick * 0.2;
  L.lR.kn.rotation.x = Math.max(0, Math.cos(ph)) * 1.2;
  L.aL.sh.rotation.set(-Math.sin(ph) * 0.8, 0, 0.12);
  L.aR.sh.rotation.set(Math.sin(ph) * 0.8, 0, -0.12);
  L.aL.el.rotation.x = -1.1;
  L.aR.el.rotation.x = -1.1;
}
function poseCheer(L: any, t: number, k: number) {
  const up = 0.5 + 0.5 * Math.sin(t * 6 + k);
  L.hips.position.y = 1 + up * 0.12;
  L.aL.sh.rotation.set(-2.7 - up * 0.2, 0, 0.35);
  L.aR.sh.rotation.set(-2.7 - up * 0.2, 0, -0.35);
  L.aL.el.rotation.x = -0.3;
  L.aR.el.rotation.x = -0.3;
  L.neck.rotation.x = -0.15;
}
function poseSquat(L: any, t: number) {
  const d = ease(t * 2.6);
  L.hips.position.y = 1 - d * 0.42;
  L.torso.rotation.x = 0.15 + d * 0.35;
  for (const [l, s] of [[L.lL, 1], [L.lR, -1]] as [any, number][]) {
    l.hp.rotation.set(-d * 1.25, 0, s * 0.18);
    l.kn.rotation.x = d * 1.9;
  }
  L.aL.sh.rotation.set(-2.9, 0, 0.6);
  L.aR.sh.rotation.set(-2.9, 0, -0.6);
  L.aL.el.rotation.x = -2.2;
  L.aR.el.rotation.x = -2.2;
  return d;
}

// --- hlavná stavba scény ---
export function createAreal(canvas: HTMLCanvasElement, opt: ArealOptions) {
  const hi = opt.quality === 'high';
  const r = new T.WebGLRenderer({ canvas, antialias: hi, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, hi ? 1.75 : 1.25));
  r.shadowMap.enabled = hi;
  r.shadowMap.type = T.PCFSoftShadowMap;
  r.localClippingEnabled = true;
  r.toneMapping = T.ACESFilmicToneMapping;
  const S = new T.Scene();
  const font = opt.font;

  const add = (geo: any, mat: any, x: number, y: number, z: number, o: { to?: any; cast?: boolean; rx?: number; ry?: number; rz?: number } = {}) => {
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z);
    const clipped = [].concat(mat).some((mm: any) => mm.clippingPlanes && mm.clippingPlanes.length);
    m.castShadow = clipped ? false : (o.cast ?? true);
    m.receiveShadow = true;
    if (o.rx) m.rotation.x = o.rx;
    if (o.ry) m.rotation.y = o.ry;
    if (o.rz) m.rotation.z = o.rz;
    (o.to || S).add(m);
    return m;
  };
  const box = (w: number, h: number, d: number) => new T.BoxGeometry(w, h, d);

  // obloha (farby sa menia podľa času)
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 4;
  skyCanvas.height = 256;
  const skyTex = new T.CanvasTexture(skyCanvas);
  skyTex.colorSpace = T.SRGBColorSpace;
  S.add(new T.Mesh(new T.SphereGeometry(600, 32, 16), new T.MeshBasicMaterial({ map: skyTex, side: T.BackSide, fog: false })));
  S.fog = new T.Fog(0xcfe6f8, 140, 420);
  const hemi = new T.HemisphereLight(0xcfe2ff, 0x3a3a30, 1.1);
  S.add(hemi);
  const sun = new T.DirectionalLight(0xfff2dc, 2.6);
  sun.castShadow = hi;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 70, bottom: -70, near: 1, far: 400 });
  sun.shadow.bias = -0.0005;
  S.add(sun);
  S.add(sun.target);
  const sunDisk = new T.Mesh(new T.SphereGeometry(9, 24, 16), new T.MeshBasicMaterial({ color: 0xfff6d8, fog: false }));
  S.add(sunDisk);
  const moon = new T.Mesh(new T.SphereGeometry(6, 24, 16), new T.MeshBasicMaterial({ color: 0xe8eef5, fog: false }));
  S.add(moon);

  // zem, cesta, tráva
  const ground = add(new T.PlaneGeometry(1200, 1200), M(0x4d6b48), 0, 0, 0, { rx: -Math.PI / 2, cast: false });
  const pad = add(new T.PlaneGeometry(150, 46), M(0x59616c), 10, 0.015, 0, { rx: -Math.PI / 2, cast: false });
  const road = add(new T.PlaneGeometry(260, 22), M(0x2b3038), 10, 0.02, 34, { rx: -Math.PI / 2, cast: false });
  for (let x = -110; x < 130; x += 9) add(box(4, 0.05, 0.4), M(0xd8dde3), x, 0.05, 34, { cast: false });
  const grass = add(new T.PlaneGeometry(260, 8), M(0x3f6b45), 10, 0.03, 20, { rx: -Math.PI / 2, cast: false });

  const cut = [new T.Plane(new T.Vector3(0, 0, -1), 4)];

  // ===== HALA 1 =====
  const H1 = new T.Group();
  S.add(H1);
  const wallMat = M(0x1e2530, { clippingPlanes: cut, side: T.DoubleSide });
  add(box(56, 8, 0.6), wallMat, -14, 4, -16, { to: H1 });
  add(box(0.6, 8, 32), wallMat, -42, 4, 0, { to: H1 });
  add(box(0.6, 8, 32), wallMat, 14, 4, 0, { to: H1 });
  add(box(56, 8, 0.6), wallMat, -14, 4, 16, { to: H1 });
  const upper = new T.Plane(new T.Vector3(0, 1, 0), -8.02);
  const roofGeo = new T.CylinderGeometry(17, 17, 57, 64, 1, true);
  roofGeo.rotateZ(Math.PI / 2);
  roofGeo.scale(1, 0.42, 1);
  add(roofGeo, M(0x8f9aa8, { metalness: 0.5, roughness: 0.4, clippingPlanes: [...cut, upper], side: T.DoubleSide }), -14, 8, 0, { to: H1, cast: false });
  for (let x = -40; x <= 12; x += 6.5) {
    const rib = new T.TorusGeometry(17, 0.18, 6, 40, Math.PI);
    rib.scale(1, 0.42, 1);
    add(rib, M(0x56606c, { clippingPlanes: cut }), x, 8, 0, { to: H1, ry: Math.PI / 2 });
  }
  add(box(56, 0.2, 32), M(0x232a33), -14, 0.1, 0, { to: H1, cast: false });
  // ľad
  const rink = new T.Shape();
  const RW = 40,
    RD = 20,
    RR = 6;
  rink.moveTo(-RW / 2 + RR, -RD / 2);
  rink.lineTo(RW / 2 - RR, -RD / 2);
  rink.quadraticCurveTo(RW / 2, -RD / 2, RW / 2, -RD / 2 + RR);
  rink.lineTo(RW / 2, RD / 2 - RR);
  rink.quadraticCurveTo(RW / 2, RD / 2, RW / 2 - RR, RD / 2);
  rink.lineTo(-RW / 2 + RR, RD / 2);
  rink.quadraticCurveTo(-RW / 2, RD / 2, -RW / 2, RD / 2 - RR);
  rink.lineTo(-RW / 2, -RD / 2 + RR);
  rink.quadraticCurveTo(-RW / 2, -RD / 2, -RW / 2 + RR, -RD / 2);
  const rp = rink.getPoints(24).filter((p: any, i: number, a: any[]) => i === 0 || p.distanceTo(a[i - 1]) > 0.01);
  if (rp[0].distanceTo(rp[rp.length - 1]) < 0.01) rp.pop();
  const ice = new T.Mesh(new T.ShapeGeometry(new T.Shape(rp)), new T.MeshStandardMaterial({ color: 0xeef6fc, roughness: 0.12, metalness: 0.15 }));
  ice.rotation.x = -Math.PI / 2;
  ice.position.set(-17, 0.25, 0);
  ice.receiveShadow = true;
  H1.add(ice);
  const pts = rink.getPoints(80);
  const ring = (h: number, y: number, mat: any, thick: number, cast: boolean) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const a0 = pts[i],
        a1 = pts[i + 1];
      const dx = a1.x - a0.x,
        dy = a1.y - a0.y;
      const len = Math.hypot(dx, dy);
      if (len < 0.01) continue;
      const m = new T.Mesh(new T.BoxGeometry(len + 0.05, h, thick), mat);
      m.position.set(-17 + (a0.x + a1.x) / 2, y, -(a0.y + a1.y) / 2);
      m.rotation.y = Math.atan2(dy, dx);
      m.castShadow = cast;
      m.receiveShadow = true;
      H1.add(m);
    }
  };
  ring(1.1, 0.8, M(0xf2f5f8, { roughness: 0.5 }), 0.22, true);
  ring(0.2, 0.35, M(0xf2c230), 0.24, false);
  ring(1.6, 2.15, new T.MeshPhysicalMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.14, roughness: 0.05, clippingPlanes: cut }), 0.06, false);
  const line = (x: number, c: number, w = 0.35) => add(box(w, 0.02, RD), new T.MeshStandardMaterial({ color: c, roughness: 0.3 }), x, 0.27, 0, { to: H1, cast: false });
  line(-17, 0xe30613, 0.5);
  line(-24, 0x2e6be6);
  line(-10, 0x2e6be6);
  line(-34, 0xe30613, 0.12);
  line(0, 0xe30613, 0.12);
  const circ = new T.Mesh(new T.RingGeometry(2.8, 3, 48), new T.MeshStandardMaterial({ color: 0x2e6be6 }));
  circ.rotation.x = -Math.PI / 2;
  circ.position.set(-17, 0.28, 0);
  H1.add(circ);
  for (let i = 0; i < 8; i++) add(box(3.6, 0.7, 0.05), M([0xe30613, 0x2e6be6, 0x1b2230][i % 3], { emissive: [0x3a0004, 0x0a1a3a, 0x000000][i % 3] }), -32 + i * 4.3, 0.8, -10.55, { to: H1, cast: false });
  const goal = (x: number, s: number) => {
    const gm = M(0xe30613, { metalness: 0.3 });
    add(box(0.12, 1.2, 1.8), gm, x, 0.85, 0, { to: H1 });
    add(box(0.9, 0.12, 1.8), gm, x + s * 0.45, 1.45, 0, { to: H1 });
    add(box(0.9, 1.2, 1.8), new T.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }), x + s * 0.45, 0.85, 0, { to: H1, cast: false });
  };
  goal(-34.5, -1);
  goal(0.5, 1);
  // svetlá pod strechou
  const rinkLamps: any[] = [];
  for (let x = -32; x <= -2; x += 7.5)
    for (const z of [-5, 5]) rinkLamps.push(add(box(4, 0.2, 0.8), new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeaf4ff, emissiveIntensity: 2.2 }), x, 12.5, z, { to: H1, cast: false }));
  const fills = [
    [-17, 11, 0, 260],
    [-30, 10, 0, 160],
    [-4, 10, 0, 160],
  ].map(([x, y, z, i]) => {
    const l = new T.PointLight(0xe8f2ff, i, 60, 1.6);
    l.position.set(x, y, z);
    H1.add(l);
    return l;
  });
  // tabuľa a dres
  const scoreTex = canvasTex(256, 128, (g) => {
    g.fillStyle = '#0a0e14';
    g.fillRect(0, 0, 256, 128);
    g.fillStyle = '#ff3d45';
    g.font = `900 italic 84px ${font}`;
    g.textAlign = 'center';
    g.fillText('2 : 1', 128, 98);
  });
  const sb = new T.MeshBasicMaterial({ map: scoreTex });
  add(box(3.2, 1.6, 3.2), [M(0x0a0e14), M(0x0a0e14), M(0x0a0e14), M(0x0a0e14), sb, sb], -17, 10.5, 0, { to: H1 });
  const jerseyTex = canvasTex(256, 256, (g) => {
    g.fillStyle = '#AF1E2D';
    g.beginPath();
    g.moveTo(78, 20);
    g.lineTo(20, 46);
    g.lineTo(0, 120);
    g.lineTo(38, 134);
    g.lineTo(56, 96);
    g.lineTo(56, 250);
    g.lineTo(200, 250);
    g.lineTo(200, 96);
    g.lineTo(218, 134);
    g.lineTo(256, 120);
    g.lineTo(236, 46);
    g.lineTo(178, 20);
    g.quadraticCurveTo(128, 44, 78, 20);
    g.fill();
    g.fillStyle = '#fff';
    g.fillRect(56, 128, 144, 6);
    g.fillRect(56, 168, 144, 6);
    g.fillStyle = '#1D3A8A';
    g.fillRect(56, 134, 144, 34);
    g.fillRect(56, 222, 144, 14);
    g.fillStyle = '#fff';
    g.textAlign = 'center';
    g.font = `900 italic 24px ${font}`;
    g.fillText('SLAFKOVSKY', 128, 80);
    g.font = `900 italic 92px ${font}`;
    g.lineWidth = 6;
    g.strokeStyle = '#1D3A8A';
    g.strokeText('20', 128, 196);
    g.fillText('20', 128, 196);
  });
  const jersey = add(new T.PlaneGeometry(3.2, 3.2), new T.MeshStandardMaterial({ map: jerseyTex, transparent: true, side: T.DoubleSide, emissive: 0x220000, emissiveIntensity: 0.4 }), -8, 10.4, -6, { to: H1, cast: false });
  // prístavba: skybox hore, bufet dole
  const annexX = 9;
  add(box(9.5, 0.4, 30), M(0x2c3747), annexX, 4.2, 0, { to: H1 });
  const warm = new T.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffb020, emissiveIntensity: 0.5, transparent: true, opacity: 0.5 });
  add(box(0.15, 3.2, 26), warm, annexX - 4.6, 5.9, 0, { to: H1, cast: false });
  add(box(0.15, 3.4, 26), warm, annexX - 4.6, 2, 0, { to: H1, cast: false });
  for (const y of [6.5, 2.5]) {
    const l = new T.PointLight(0xffb020, 60, 18, 1.5);
    l.position.set(annexX, y, 2);
    H1.add(l);
  }
  add(box(6, 1.1, 1.2), M(0xe30613), annexX, 0.75, 6, { to: H1 });
  // nápis na streche
  const signTex = canvasTex(1024, 160, (g) => {
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    let fs = 130;
    g.font = `900 italic ${fs}px ${font}`;
    while (fs > 40 && g.measureText('I-SPORT COMPLEX').width > 980) g.font = `900 italic ${(fs -= 6)}px ${font}`;
    g.fillText('I-SPORT COMPLEX', 512, 130);
    g.fillStyle = '#E30613';
    g.fillRect(300, 146, 424, 12);
  });
  const sign = add(new T.PlaneGeometry(30, 4.7), new T.MeshBasicMaterial({ map: signTex, transparent: true }), -14, 18.6, -13, { to: H1, cast: false });
  sign.rotation.x = -0.15;

  // ===== IHRISKO =====
  const PG = new T.Group();
  S.add(PG);
  const px = 30;
  add(box(26, 0.12, 22), M(0x1f8a4b, { roughness: 0.9 }), px, 0.06, 0, { to: PG, cast: false });
  for (let i = 1; i < 6; i += 2) add(box(26 / 6, 0.13, 22), M(0x239a55, { roughness: 0.9 }), px - 13 + 26 / 12 + i * (26 / 6), 0.065, 0, { to: PG, cast: false });
  const wl = M(0xffffff, { roughness: 0.4 });
  const ln = (w: number, d: number, x: number, z: number) => add(box(w, 0.14, d), wl, x, 0.07, z, { to: PG, cast: false });
  ln(25, 0.15, px, -10.4);
  ln(25, 0.15, px, 10.4);
  ln(0.15, 21, px - 12.4, 0);
  ln(0.15, 21, px + 12.4, 0);
  ln(0.15, 21, px, 0);
  const cc = new T.Mesh(new T.RingGeometry(2.6, 2.75, 40), wl);
  cc.rotation.x = -Math.PI / 2;
  cc.position.set(px, 0.15, 0);
  PG.add(cc);
  const fgoal = (x: number, s: number) => {
    add(box(0.15, 2, 0.15), wl, x, 1, -2.5, { to: PG });
    add(box(0.15, 2, 0.15), wl, x, 1, 2.5, { to: PG });
    add(box(0.15, 0.15, 5.1), wl, x, 2, 0, { to: PG });
    add(box(1.4, 2, 5), new T.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 }), x + s * 0.7, 1, 0, { to: PG, cast: false });
  };
  fgoal(px - 12.6, -1);
  fgoal(px + 12.6, 1);
  for (let x = px - 13; x <= px + 13; x += 3.25) add(box(0.12, 4, 0.12), M(0x4a5868), x, 2, -11.4, { to: PG });
  add(box(26, 4, 0.05), new T.MeshStandardMaterial({ color: 0xc9d4de, transparent: true, opacity: 0.12, side: T.DoubleSide }), px, 2, -11.4, { to: PG, cast: false });
  const floodHeads: any[] = [];
  const floods: any[] = [];
  for (const [x, z] of [
    [px - 13.5, -12.5],
    [px + 13.5, -12.5],
    [px - 13.5, 12.5],
    [px + 13.5, 12.5],
  ]) {
    add(new T.CylinderGeometry(0.18, 0.25, 16, 8), M(0x5a6470, { metalness: 0.4 }), x, 8, z, { to: PG });
    floodHeads.push(add(box(2.2, 1, 0.5), new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4cf, emissiveIntensity: 0 }), x, 16.2, z, { to: PG, cast: false }));
    const sp = new T.SpotLight(0xfff4cf, 0, 60, 0.75, 0.6, 1.6);
    sp.position.set(x, 16, z);
    sp.target.position.set(px, 0, 0);
    PG.add(sp);
    PG.add(sp.target);
    floods.push(sp);
  }

  // ===== HALA 2 =====
  const H2 = new T.Group();
  S.add(H2);
  const hx = 58;
  const h2wall = M(0x1e2530, { clippingPlanes: cut, side: T.DoubleSide });
  add(box(24, 11, 0.6), h2wall, hx, 5.5, -12, { to: H2 });
  add(box(0.6, 11, 24), h2wall, hx - 12, 5.5, 0, { to: H2 });
  add(box(0.6, 11, 24), h2wall, hx + 12, 5.5, 0, { to: H2 });
  add(box(24, 11, 0.6), h2wall, hx, 5.5, 12, { to: H2 });
  add(box(25, 0.8, 25), M(0x8f9aa8, { metalness: 0.5, roughness: 0.4, clippingPlanes: cut }), hx, 11.2, 0, { to: H2 });
  add(box(0.6, 11, 0.6), M(0xe30613, { emissive: 0x400000 }), hx - 12, 5.5, 12.1, { to: H2 });
  add(box(23.4, 0.4, 23.4), M(0x2c3747), hx, 5.5, 0, { to: H2 });
  add(box(0.15, 2.4, 0.15), M(0x7c8794), hx - 7, 6.9, -2, { to: H2 });
  add(box(0.15, 2.4, 0.15), M(0x7c8794), hx - 4, 6.9, -2, { to: H2 });
  const bar = add(box(3.6, 0.1, 0.1), M(0xc9d1da), hx - 5.5, 7.6, -2, { to: H2 });
  const plates = [-1, 1].map((s) => add(new T.CylinderGeometry(0.45, 0.45, 0.2, 18), M(0xe30613), hx - 5.5 + s * 1.9, 7.6, -2, { to: H2, rz: Math.PI / 2 }));
  add(box(3, 0.4, 1.2), M(0x2c3747), hx + 4, 5.9, -3, { to: H2 });
  add(box(0.2, 1.4, 1), M(0x7c8794), hx + 5.4, 6.6, -3, { to: H2 });
  add(box(23, 0.1, 0.1), new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeaf4ff, emissiveIntensity: 2 }), hx, 10.5, 0, { to: H2, cast: false });
  const g2 = new T.PointLight(0xeaf4ff, 90, 25, 1.5);
  g2.position.set(hx, 9.5, 2);
  H2.add(g2);
  add(box(5, 3.6, 4), M(0xa86f40, { roughness: 0.7 }), hx - 6, 2, -6, { to: H2 });
  add(box(1.2, 0.9, 0.05), new T.MeshStandardMaterial({ color: 0xffb020, emissive: 0xffb020, emissiveIntensity: 1.4 }), hx - 6, 2.6, -3.97, { to: H2, cast: false });
  add(box(7, 0.8, 5), M(0xd5dee6), hx + 3, 0.6, -4, { to: H2 });
  add(box(6.4, 0.2, 4.4), new T.MeshPhysicalMaterial({ color: 0x47cfd6, roughness: 0.05, emissive: 0x0c4c58, emissiveIntensity: 0.6 }), hx + 3, 0.95, -4, { to: H2, cast: false });
  const w2 = new T.PointLight(0xffb020, 70, 18, 1.5);
  w2.position.set(hx, 4, 2);
  H2.add(w2);

  // stromy a mesto
  const treeTops: any[] = [];
  for (const [x, z, s] of [
    [-50, 22, 1.2],
    [-30, 23, 0.9],
    [-8, 22, 1.1],
    [16, 23, 0.8],
    [43, 23, 1],
    [70, 22, 1.2],
    [-55, -18, 1.3],
    [80, -10, 1.1],
    [42, -16, 0.9],
  ]) {
    add(new T.CylinderGeometry(0.25 * s, 0.35 * s, 2.4 * s, 8), M(0x3a2a1c), x, 1.2 * s, z);
    treeTops.push(add(new T.IcosahedronGeometry(2.2 * s, 1), M(0x1f5a3a, { flatShading: true }), x, 3.6 * s, z));
  }
  const cityMat = M(0x8a9bb0);
  for (let i = 0; i < 46; i++) {
    const h = 5 + ((i * 37) % 14);
    add(box(7 + (i % 3) * 3, h, 7), cityMat, -180 + i * 8.5, h / 2, -120 - (i % 4) * 10, { cast: false });
  }
  add(box(5, 22, 5), cityMat, 22, 11, -128, { cast: false });
  add(new T.ConeGeometry(3, 14, 4), cityMat, 22, 29, -128, { cast: false });
  const winMat = new T.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0 });
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 160; i++) add(box(0.8, 0.8, 0.1), winMat, -180 + rnd() * 390, 1 + rnd() * 14, -116, { cast: false });

  // snehová pokrývka (zapína sa podľa počasia)
  const snowCover = new T.Group();
  S.add(snowCover);
  const snowMat = M(0xf2f6fa);
  const roofSnow = new T.CylinderGeometry(17.1, 17.1, 57, 64, 1, true);
  roofSnow.rotateZ(Math.PI / 2);
  roofSnow.scale(1, 0.43, 1);
  add(roofSnow, M(0xf2f6fa, { clippingPlanes: [new T.Plane(new T.Vector3(0, 0, -1), 4), new T.Plane(new T.Vector3(0, 1, 0), -8.3)], side: T.DoubleSide }), -14, 8.05, 0, { to: snowCover });
  add(box(25.2, 0.3, 25.2), M(0xf2f6fa, { clippingPlanes: cut }), hx, 11.75, 0, { to: snowCover });
  add(box(26, 0.14, 22), snowMat, px, 0.08, 0, { to: snowCover, cast: false });

  // zrážky
  const N = hi ? 7000 : 3000;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = -120 + rnd() * 260;
    pos[i * 3 + 1] = rnd() * 60;
    pos[i * 3 + 2] = -60 + rnd() * 120;
  }
  const pGeo = new T.BufferGeometry();
  pGeo.setAttribute('position', new T.BufferAttribute(pos, 3));
  const pMat = new T.PointsMaterial({ color: 0xffffff, size: 0.35, transparent: true, opacity: 0.9 });
  const precip = new T.Points(pGeo, pMat);
  precip.visible = false;
  S.add(precip);
  let precipKind: 'none' | 'snow' | 'rain' = 'none';

  // ===== postavičky =====
  const skaters = [
    { c: 0xe30613, n: 17, cx: -22, cz: 0, rx: 7, rz: 4.5, w: 0.55, p: 0, skin: 0 },
    { c: 0xe30613, n: 9, cx: -18, cz: 1, rx: 6, rz: 5, w: 0.62, p: 2.1, skin: 1 },
    { c: 0xe30613, n: 20, cx: -13, cz: -1, rx: 5, rz: 4, w: 0.5, p: 4.2, skin: 0, shooter: true },
    { c: 0x2e6be6, n: 4, cx: -8, cz: 2, rx: 4, rz: 4, w: -0.5, p: 1, skin: 2 },
    { c: 0x2e6be6, n: 11, cx: -12, cz: -3, rx: 5, rz: 3.5, w: -0.58, p: 3, skin: 0 },
  ].map((k) => ({ ...k, L: person({ color: k.c, number: k.n, helmet: k.c, gloves: 0x1b2230, skates: true, stick: true, skin: k.skin, socks: k.c }, font) }));
  skaters.forEach((k) => H1.add(k.L.root));
  const gk = person({ color: 0x2e6be6, number: 30, mask: true, gloves: 0xf4f7fa, skates: true, stick: true, pads: true, bulk: 0.38 }, font);
  gk.root.rotation.y = -Math.PI / 2;
  H1.add(gk.root);
  const gk2 = person({ color: 0xe30613, number: 1, mask: true, gloves: 0xf4f7fa, skates: true, stick: true, pads: true, bulk: 0.38 }, font);
  gk2.root.position.set(-32.4, 0.25, 0);
  gk2.root.rotation.y = Math.PI / 2;
  H1.add(gk2.root);
  const puck = add(new T.CylinderGeometry(0.2, 0.2, 0.08, 16), M(0x0a0e14), 0, 0.3, 0, { to: H1 });
  const fans = (
    [
      [-6, 0xe30613, 0],
      [-2, 0x2e6be6, 1],
      [2, 0xf4f7fa, 2],
      [-9, 0xe30613, 0],
    ] as [number, number, number][]
  ).map(([z, c, sk]) => {
    const f = person({ color: c, hair: [0x2a1e17, 0x6b4a2e, 0xd9b26f][sk], skin: sk, pants: 0x2c3747 }, font);
    f.root.position.set(annexX - 2.6, 4.4, z);
    f.root.rotation.y = -Math.PI / 2;
    f.root.scale.setScalar(0.85);
    H1.add(f.root);
    return { f, z };
  });
  const ball = new T.Mesh(new T.IcosahedronGeometry(0.22, 1), M(0xffffff, { flatShading: true }));
  ball.castShadow = true;
  PG.add(ball);
  const PA = new T.Vector3(px - 6, 0, -2),
    PB = new T.Vector3(px + 3, 0, 3);
  const footballers = (
    [
      [PA, 0xe30613, 0, 7, PB],
      [PB, 0x2e6be6, 1, 10, PA],
    ] as [any, number, number, number, any][]
  ).map(([at, c, sk, n, toward]) => {
    const f = person({ color: c, number: n, hair: 0x2a1e17, skin: sk, pants: 0xffffff, socks: c }, font);
    f.root.position.set(at.x, 0.12, at.z);
    f.root.rotation.y = Math.atan2(toward.x - at.x, toward.z - at.z);
    f.root.scale.setScalar(0.95);
    PG.add(f.root);
    return { f, at };
  });
  const fk = person({ color: 0xf2c230, number: 1, hair: 0x6b4a2e, gloves: 0xe7eef4 }, font);
  fk.root.rotation.y = -Math.PI / 2;
  PG.add(fk.root);
  const lifter = person({ color: 0x2e6be6, hair: 0x2a1e17, pants: 0x2c3747 }, font);
  lifter.root.position.set(hx - 5.5, 5.7, -2);
  H2.add(lifter.root);
  const runner = person({ color: 0xf2c230, hair: 0xd9b26f }, font);
  runner.root.position.set(hx + 4, 6.1, -3);
  runner.root.rotation.y = Math.PI / 2;
  runner.root.scale.setScalar(0.9);
  H2.add(runner.root);

  // pohyb v čase t (s); speed > 1 = zvýraznená časť (prejdenie myšou)
  function animate(t: number, active: Zone3D | null) {
    const fast = (z: Zone3D) => (active === z ? 1.6 : 1);
    const ti = t * fast('ice');
    let shooter: any = null;
    for (const k of skaters) {
      const a = ti * k.w + k.p;
      const x = k.cx + Math.cos(a) * k.rx,
        z = k.cz + Math.sin(a) * k.rz;
      k.L.root.position.set(x, 0.25, z);
      k.L.root.rotation.y = Math.atan2(-Math.sin(a) * k.rx * k.w, Math.cos(a) * k.rz * k.w);
      k.L.root.rotation.z = -Math.sign(k.w) * 0.12;
      const shoot = k.shooter ? Math.pow(Math.max(0, Math.sin(ti * 1.4)), 6) : 0;
      poseSkater(k.L, ti * 5 + k.p, shoot);
      if (k.shooter) shooter = { x, z };
    }
    gk.root.position.set(-1.6, 0.25, Math.sin(ti * 0.9) * 0.8);
    poseGoalie(gk, ti);
    poseGoalie(gk2, ti + 1);
    const sp = ((ti * 1.4) / (Math.PI * 2)) % 1;
    const pt = Math.max(0, Math.min(1, (sp - 0.22) / 0.3));
    puck.position.set(shooter.x + 0.6 + (-0.2 - shooter.x - 0.6) * pt, 0.3 + Math.sin(pt * Math.PI) * 0.4, shooter.z + (0.4 - shooter.z) * pt);
    jersey.rotation.z = Math.sin(t * 0.8) * 0.05;
    fans.forEach(({ f, z }) => poseCheer(f, t * (active === 'sky' ? 1.6 : 0.6), z));
    const tp = t * fast('pitch');
    const pass = (tp * 0.6) % 2;
    const fwd = pass < 1;
    const bt = fwd ? pass : pass - 1;
    const from = fwd ? PA : PB,
      to = fwd ? PB : PA;
    ball.position.lerpVectors(from, to, ease(bt * Math.PI));
    ball.position.y = 0.34;
    ball.rotation.x = tp * 6;
    footballers.forEach(({ f, at }, i) => {
      const near = at === PA ? (fwd ? 1 - bt : bt) : fwd ? bt : 1 - bt;
      poseRun(f, tp * 4 + i, near > 0.9 ? 1 : 0);
    });
    fk.root.position.set(px + 11.3, 0.3, Math.sin(tp * 1.3) * 1.2);
    poseGoalie(fk, tp);
    const tg = t * fast('gym');
    const d = poseSquat(lifter, tg);
    bar.position.y = 7.6 - d * 0.42;
    plates.forEach((pl) => (pl.position.y = 7.6 - d * 0.42));
    poseRun(runner, tg * 7);
    // zrážky
    if (precip.visible) {
      const arr = pGeo.attributes.position.array as Float32Array;
      const v = precipKind === 'rain' ? 0.9 : 0.12;
      for (let i = 0; i < N; i++) {
        let y = arr[i * 3 + 1] - v;
        if (y < 0) y += 60;
        arr[i * 3 + 1] = y;
        if (precipKind === 'snow') arr[i * 3] += Math.sin(t + i) * 0.01;
      }
      pGeo.attributes.position.needsUpdate = true;
    }
  }

  // obloha, slnko a počasie podľa lib/sky
  function setSky(s: SkyScene, w: Weather) {
    const g = skyCanvas.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, s.sky.top);
    grad.addColorStop(0.6, s.sky.mid);
    grad.addColorStop(1, s.sky.low);
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 256);
    skyTex.needsUpdate = true;
    S.fog.color.set(s.sky.low);
    const day = s.dayness;
    hemi.intensity = 0.35 + day * 0.75;
    hemi.color.set(day > 0.5 ? 0xcfe2ff : 0x34405a);
    hemi.groundColor.set(day > 0.5 ? 0x3a3a30 : 0x0b0d12);
    // slnko: azimut/výška z obrázkových súradníc scény (x 0–1600 ~ východ–západ, y ~ výška)
    const az = ((s.sun.x - 800) / 760) * (Math.PI / 1.5);
    const el = Math.max(-0.2, ((345 - s.sun.y) / 300) * 1.1);
    const dir = new T.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el) * 0.6 + 0.4).normalize();
    sun.position.copy(dir).multiplyScalar(150).add(new T.Vector3(10, 0, 0));
    sun.target.position.set(10, 0, 0);
    sun.intensity = s.sun.visible ? (0.4 + day * 2.2) * (1 - w.clouds * 0.6) : 0.08;
    sun.color.set(s.sun.color);
    sunDisk.visible = s.sun.visible && w.clouds < 0.85;
    sunDisk.position.copy(dir).multiplyScalar(450);
    sunDisk.material.color.set(s.sun.color);
    moon.visible = s.moon.visible && !sunDisk.visible && w.clouds < 0.85;
    const maz = ((s.moon.x - 800) / 760) * (Math.PI / 1.5);
    const mel = Math.max(0.05, ((345 - s.moon.y) / 300) * 1.1);
    moon.position.set(Math.sin(maz) * 400, Math.sin(mel) * 400, -Math.cos(maz) * 300);
    r.toneMappingExposure = day > 0.5 ? 1 : 1.1;
    // farby okolia podľa dňa
    const mix = (a: number, b: number) => new T.Color(a).lerp(new T.Color(b), day);
    ground.material.color.copy(w.snowCover ? new T.Color(0xcfd8e2) : mix(0x111a14, 0x4d6b48));
    pad.material.color.copy(mix(0x14181f, 0x59616c));
    road.material.color.copy(mix(0x0d1016, 0x2b3038));
    grass.material.color.copy(mix(0x1a2a1f, 0x3f6b45));
    cityMat.color.copy(mix(0x111823, 0x8a9bb0));
    winMat.opacity = Math.max(0, 1 - day * 1.4);
    treeTops.forEach((tt) => tt.material.color.set(w.snowCover ? 0xdfe8ef : 0x1f5a3a));
    snowCover.visible = w.snowCover;
    warm.emissiveIntensity = 0.5 + (1 - day) * 0.5;
    fills.forEach((f, i) => (f.intensity = (i === 0 ? 120 : 80) + (1 - day) * (i === 0 ? 140 : 80)));
    rinkLamps.forEach((l) => (l.material.emissiveIntensity = 2.2));
    const lit = s.lights;
    floodHeads.forEach((h) => (h.material.emissiveIntensity = lit ? 3 : 0));
    floods.forEach((f) => (f.intensity = lit ? (w.snowCover ? 380 : 900) : 0));
    precipKind = w.precip === 'snow' || w.precip === 'sleet' ? 'snow' : w.precip === 'rain' ? 'rain' : 'none';
    precip.visible = precipKind !== 'none';
    pMat.size = precipKind === 'rain' ? 0.18 : 0.35;
    pMat.color.set(precipKind === 'rain' ? 0xb9cde0 : 0xffffff);
    pMat.opacity = precipKind === 'rain' ? 0.6 : 0.9;
  }

  // ===== kamera =====
  const camera = new T.PerspectiveCamera(38, 1, 0.5, 2000);
  const view = { ang: 0.3, el: 0.36, R: 104 };
  const over = (): Cam => {
    const t = new T.Vector3(10, 4, 0);
    return { t, p: new T.Vector3(t.x + view.R * Math.sin(view.ang) * Math.cos(view.el), t.y + view.R * Math.sin(view.el), t.z + view.R * Math.cos(view.ang) * Math.cos(view.el)), fov: 38 };
  };
  const FOCUS: Record<Zone3D, () => Cam> = {
    ice: () => ({ t: new T.Vector3(-16, 2, 0), p: new T.Vector3(-16 + 30 * Math.sin(0.5) * 0.9, 2 + 30 * 0.4, 30 * Math.cos(0.5) * 0.9), fov: 50 }),
    sky: () => ({ t: new T.Vector3(7, 5.5, 0), p: new T.Vector3(-6, 8.5, 12), fov: 50 }),
    food: () => ({ t: new T.Vector3(8, 1.8, 2), p: new T.Vector3(-4, 4.5, 14), fov: 50 }),
    pitch: () => ({ t: new T.Vector3(30, 1.2, 0), p: new T.Vector3(34, 9, 24), fov: 45 }),
    gym: () => ({ t: new T.Vector3(58, 6.8, -2), p: new T.Vector3(58, 9, 14), fov: 48 }),
    well: () => ({ t: new T.Vector3(58, 1.8, -4), p: new T.Vector3(58, 4.5, 14), fov: 48 }),
  };
  // oblasti na klik (stred a polomer v metroch)
  const HIT: Record<Zone3D, { c: any; r: number }> = {
    ice: { c: new T.Vector3(-17, 2, 0), r: 22 },
    sky: { c: new T.Vector3(9, 6, 0), r: 6 },
    food: { c: new T.Vector3(9, 2, 0), r: 6 },
    pitch: { c: new T.Vector3(30, 1, 0), r: 13 },
    gym: { c: new T.Vector3(58, 8, 0), r: 10 },
    well: { c: new T.Vector3(58, 3, 0), r: 10 },
  };
  const LABEL: Record<Zone3D, any> = {
    ice: new T.Vector3(-17, 9, 0),
    sky: new T.Vector3(9, 8.2, 0),
    food: new T.Vector3(9, 3.2, 6),
    pitch: new T.Vector3(30, 5, 0),
    gym: new T.Vector3(58, 9.5, 0),
    well: new T.Vector3(58, 3.6, 4),
  };
  let cur: Cam = over();
  let fromCam: Cam = cur;
  let toCam: Cam | null = null;
  let flyT = 1;
  let flyStart = -1;
  let focusZone: Zone3D | null = null;
  let started = false;
  function focus(z: Zone3D | null, instant = false) {
    if (z === focusZone && started) return;
    focusZone = z;
    fromCam = { t: cur.t.clone(), p: cur.p.clone(), fov: cur.fov };
    toCam = z ? FOCUS[z]() : over();
    if (z) {
      // vpravo sa vysúva panel s fotkami – kamera sa posunie doprava, aby časť areálu ostala vľavo
      const fwd = toCam.t.clone().sub(toCam.p);
      const right = fwd.clone().cross(new T.Vector3(0, 1, 0)).normalize().multiplyScalar(fwd.length() * 0.2);
      toCam.t.add(right);
      toCam.p.add(right);
    }
    flyT = instant ? 1 : 0;
    flyStart = -1;
    if (instant) cur = toCam;
  }
  function rotate(dx: number, dy: number) {
    if (focusZone) return;
    flyT = 1;
    view.ang = Math.max(-0.85, Math.min(0.95, view.ang - dx * 0.0032));
    view.el = Math.max(0.16, Math.min(0.85, view.el + dy * 0.003));
    cur = over();
  }
  function zoom(f: number) {
    if (focusZone) return;
    flyT = 1;
    view.R = Math.max(55, Math.min(150, view.R * f));
    cur = over();
  }
  function reset() {
    view.ang = 0.3;
    view.el = 0.36;
    view.R = 104;
    focusZone = null;
    fromCam = { t: cur.t.clone(), p: cur.p.clone(), fov: cur.fov };
    toCam = over();
    flyT = 0;
    flyStart = -1;
  }

  const ray = new T.Raycaster();
  function pick(nx: number, ny: number): Zone3D | null {
    ray.setFromCamera(new T.Vector2(nx, ny), camera);
    let best: Zone3D | null = null;
    let bestD = Infinity;
    for (const z of Object.keys(HIT) as Zone3D[]) {
      const h = HIT[z];
      const d = ray.ray.distanceSqToPoint(h.c);
      const ok = d < h.r * h.r * 0.35;
      // skybox a bufet sú nad sebou – rozhodne výška bodu najbližšie k lúču
      if (ok) {
        const along = ray.ray.origin.distanceTo(h.c);
        const score = d / (h.r * h.r) + along * 0.0005;
        if (score < bestD) {
          bestD = score;
          best = z;
        }
      }
    }
    return best;
  }
  function project(z: Zone3D, w: number, h: number) {
    const v = LABEL[z].clone().project(camera);
    return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h, visible: v.z < 1 };
  }

  function render(t: number, w: number, h: number, active: Zone3D | null) {
    started = true;
    if (toCam && flyT < 1) {
      // prelet trvá 1,2 s bez ohľadu na počet snímok za sekundu
      if (flyStart < 0) flyStart = t;
      flyT = Math.min(1, (t - flyStart) / 1.2);
      const k = smooth(flyT);
      cur = { t: new T.Vector3().lerpVectors(fromCam.t, toCam.t, k), p: new T.Vector3().lerpVectors(fromCam.p, toCam.p, k), fov: fromCam.fov + (toCam.fov - fromCam.fov) * k };
    }
    animate(t, active);
    camera.aspect = w / h;
    camera.fov = cur.fov;
    camera.position.copy(cur.p);
    camera.lookAt(cur.t);
    camera.updateProjectionMatrix();
    r.setSize(w, h, false);
    r.render(S, camera);
  }

  function dispose() {
    S.traverse((o: any) => {
      o.geometry?.dispose?.();
      [].concat(o.material || []).forEach((m: any) => {
        m.map?.dispose?.();
        m.dispose?.();
      });
    });
    r.dispose();
  }

  return { render, setSky, focus, rotate, zoom, reset, pick, project, dispose };
}
export type Areal = ReturnType<typeof createAreal>;
