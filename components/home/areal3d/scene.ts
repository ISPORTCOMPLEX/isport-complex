// 3D areál I-SPORT COMPLEX ako architektonická maketa: svetlé matné haly na podstavci, farba len tam, kde niečo
// znamená (ľad, ihrisko, bazén, dresy). Mäkké tiene, odrazy v ľade, jemná žiara svetiel.
// Pôvodne: realistické svetlo (fyzikálna obloha, tiene, odrazy v ľade, jemná žiara),
// interiéry hál a postavy, ktoré naozaj hrajú. Obloha, slnko a počasie podľa skutočného času v Košiciach.
// Kvalita sa prispôsobí výkonu zariadenia (high → low za behu, ak by animácia sekala).
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { sunPosition, type Scene as SkyScene, type Weather } from '@/lib/sky';
import { build } from './world';
import * as P from './human';
import * as TX from './tex';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const T: any = THREE;
export type Zone3D = 'ice' | 'sky' | 'food' | 'pitch' | 'gym' | 'well';
export type ArealOptions = { font: string; quality: 'high' | 'low'; now: number };
type Cam = { t: any; p: any; fov: number };

export function createAreal(canvas: HTMLCanvasElement, opt: ArealOptions) {
  TX.setFont(opt.font);
  let hi = opt.quality === 'high';
  const month = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Bratislava', month: 'numeric' }).format(opt.now)) - 1;

  const r = new T.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, hi ? 1.5 : 1));
  r.shadowMap.enabled = true;
  r.shadowMap.type = T.PCFShadowMap;
  r.toneMapping = T.ACESFilmicToneMapping;
  r.toneMappingExposure = 0.85;
  const S = new T.Scene();
  const pmrem = new T.PMREMGenerator(r);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  S.environment = envTex;

  // ---------- obloha ----------
  const sky = new Sky();
  sky.scale.setScalar(4500);
  S.add(sky);
  const su = sky.material.uniforms;
  su.mieCoefficient.value = 0.006;
  su.mieDirectionalG.value = 0.86;
  S.fog = new T.FogExp2(0xbfd0e0, 0.0016);
  const starGeo = new T.BufferGeometry();
  {
    const N = 2500;
    const p = new Float32Array(N * 3);
    const rr = TX.rng(4);
    for (let i = 0; i < N; i++) {
      const t = rr() * Math.PI * 2;
      const u = 0.08 + rr() * 0.92;
      const R = 3000;
      p[i * 3] = Math.cos(t) * Math.sqrt(1 - u * u) * R;
      p[i * 3 + 1] = u * R;
      p[i * 3 + 2] = Math.sin(t) * Math.sqrt(1 - u * u) * R;
    }
    starGeo.setAttribute('position', new T.BufferAttribute(p, 3));
  }
  const stars = new T.Points(starGeo, new T.PointsMaterial({ color: 0xdfe8f5, size: 2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.9 }));
  S.add(stars);
  const moon = new T.Mesh(new T.SphereGeometry(40, 32, 16), new T.MeshBasicMaterial({ color: 0xf4f1e8, fog: false }));
  moon.position.set(-900, 1100, -2600);
  S.add(moon);
  const hemi = new T.HemisphereLight(0xcfe0ff, 0x4a4535, 0.55);
  S.add(hemi);
  const sun = new T.DirectionalLight(0xfff1dd, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(hi ? 2048 : 1024, hi ? 2048 : 1024);
  Object.assign(sun.shadow.camera, { left: -95, right: 95, top: 70, bottom: -70, near: 10, far: 400 });
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.03;
  S.add(sun, sun.target);
  const moonL = new T.DirectionalLight(0x8fa6cc, 0);
  moonL.position.set(-60, 120, -80);
  S.add(moonL);

  // ---------- areál ----------
  const W: any = build(S, { hi, month });
  const RINK = W.rink;
  let refl: any = null;
  {
    const rg = new T.ShapeGeometry(RINK.shape, 24);
    refl = new Reflector(rg, { textureWidth: 1024, textureHeight: 512, color: 0xb8c4cc, clipBias: 0.003 });
    refl.rotation.x = -Math.PI / 2;
    refl.position.set(RINK.RX, 0.1, RINK.RZ);
    W.H1.add(refl);
  }
  const setIceMirror = (on: boolean) => {
    refl.visible = on;
    W.iceMat.transparent = on;
    W.iceMat.opacity = on ? 0.8 : 1;
    W.iceMat.needsUpdate = true;
  };
  setIceMirror(hi);

  // ===== maketa: matné materiály, podstavec, štúdiové pozadie =====
  sky.visible = false;
  S.fog = null;
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = 512;
  bgCanvas.height = 256;
  const bgTex = new T.CanvasTexture(bgCanvas);
  bgTex.colorSpace = T.SRGBColorSpace;
  const paintBg = (day: number) => {
    const g = bgCanvas.getContext('2d')!;
    const mix = (a: number[], b: number[]) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * day)).join(',')})`;
    const gr = g.createRadialGradient(256, 150, 20, 256, 150, 330);
    gr.addColorStop(0, mix([16, 28, 43], [27, 47, 69]));
    gr.addColorStop(1, mix([3, 7, 12], [7, 14, 23]));
    g.fillStyle = gr;
    g.fillRect(0, 0, 512, 256);
    bgTex.needsUpdate = true;
  };
  paintBg(1);
  S.background = bgTex;
  W.grass.visible = false;
  W.far.forEach((m: any) => (m.visible = false));
  W.road.scale.x = 0.43;
  W.road.position.x = 13;
  W.dashes.scale.x = 0.43;
  W.dashes.position.x = 8.7;
  W.walk.scale.x = 0.86;
  W.walk.position.x = 13;
  const treeMat = new T.MeshStandardMaterial({ color: 0xf2f4f6, roughness: 0.9 });
  const stemMat = new T.MeshStandardMaterial({ color: 0xb9c1c9, roughness: 0.8 });
  W.trees.forEach((t: any) => {
    if (t.position.x < -70 || t.position.x > 98 || t.position.z < -29) t.visible = false;
    t.traverse((o: any) => {
      if (!o.isMesh) return;
      const leaf = o.geometry.type === 'IcosahedronGeometry';
      o.material = leaf ? treeMat : stemMat;
      if (leaf) o.geometry = new T.SphereGeometry(o.geometry.parameters.radius * 0.95, 20, 14);
    });
  });
  S.traverse((o: any) => {
    if (!o.isMesh) return;
    [].concat(o.material).forEach((m: any) => {
      if (m.userData.done || m === treeMat || m === stemMat) return;
      m.userData.done = 1;
      if (m.userData.keep || m.vertexColors || m.transparent || m === W.iceMat || !m.isMeshStandardMaterial) return;
      if (m.emissive && m.emissiveIntensity > 0 && m.emissive.r + m.emissive.g + m.emissive.b > 0.05) return;
      const h: any = {};
      m.color.getHSL(h);
      const had = !!m.map;
      if (!had && h.s > 0.35 && h.l > 0.12) return;
      m.map = null;
      if (m.userData.clay) m.color.set(m.userData.clay);
      else m.color.setHSL(0.58, 0.05, had ? 0.84 : 0.36 + 0.5 * h.l);
      m.metalness = Math.min(m.metalness, 0.08);
      m.roughness = Math.max(m.roughness, 0.62);
      m.needsUpdate = true;
    });
  });
  const plinthMat = new T.MeshStandardMaterial({ color: 0xc4ccd4, roughness: 0.75 });
  const plinth = new T.Mesh(new RoundedBoxGeometry(178, 2.6, 80, 4, 0.8), plinthMat);
  plinth.position.set(13, -1.34, 8);
  plinth.receiveShadow = true;
  S.add(plinth);
  {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(128, 128, 40, 128, 128, 128);
    gr.addColorStop(0, 'rgba(0,0,0,0.75)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
    const sh = new T.Mesh(new T.PlaneGeometry(250, 130), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.set(13, -2.8, 12);
    S.add(sh);
  }
  r.toneMapping = T.NeutralToneMapping;
  r.toneMappingExposure = 1.02;

  // zrážky
  const PN = hi ? 14000 : 6000;
  const pGeo = new T.BufferGeometry();
  {
    const p = new Float32Array(PN * 3);
    const rr = TX.rng(8);
    for (let i = 0; i < PN; i++) {
      p[i * 3] = -90 + rr() * 200;
      p[i * 3 + 1] = rr() * 50;
      p[i * 3 + 2] = -40 + rr() * 90;
    }
    pGeo.setAttribute('position', new T.BufferAttribute(p, 3));
  }
  const pMat = new T.PointsMaterial({ map: TX.dotTex(), color: 0xffffff, size: 0.3, transparent: true, opacity: 0.95, depthWrite: false });
  const precip = new T.Points(pGeo, pMat);
  precip.visible = false;
  S.add(precip);
  let precipKind: 'none' | 'snow' | 'rain' = 'none';

  // ---------- postavy ----------
  const { RX, RZ, RW, RD } = RINK;
  const rr = TX.rng(17);
  const loop = (cx: number, cz: number, sx: number, sz: number, n: number) => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const k = 0.55 + rr() * 0.45;
      pts.push(new T.Vector3(cx + Math.cos(a) * sx * k, 0.12, cz + Math.sin(a) * sz * k));
    }
    return new T.CatmullRomCurve3(pts, true, 'centripetal');
  };
  const teams = [
    ['#e30613', '#ffffff'],
    ['#0b2a6b', '#ffffff'],
  ];
  const nums = [
    [20, 17, 9, 44],
    [11, 4, 27, 8],
  ];
  const skaters: any[] = [];
  for (let t = 0; t < 2; t++)
    for (let i = 0; i < 4; i++) {
      const H = P.human({ kind: 'hockey', c1: teams[t][0], c2: teams[t][1], number: nums[t][i], skin: (i * 3 + t) % 3, sock1: teams[t][0], sock2: teams[t][1] });
      const path = loop(RX + (i - 1.5) * 6 + (t ? 2 : -2), RZ + (i % 2 ? 2.5 : -2.5), 8 + rr() * 5, 3.5 + rr() * 2.5, 6);
      W.H1.add(H.root);
      skaters.push({ H, team: t, path, len: path.getLength(), s: rr(), v: 5.2 + rr() * 1.8, ph: rr() * 6, shoot: -1, lean: 0 });
    }
  const goalies = [0, 1].map((t) => {
    const H = P.human({ kind: 'goalie', c1: teams[t][0], c2: teams[t][1], maskColor: t ? 0x0b2a6b : 0xe30613, sock1: teams[t][0], sock2: teams[t][1] });
    const gx = RX + (t ? -1 : 1) * (RW / 2 - 4.1);
    H.root.position.set(gx, 0.12, RZ);
    H.root.rotation.y = t ? Math.PI / 2 : -Math.PI / 2;
    W.H1.add(H.root);
    return { H, gx, drop: 0, side: 0 };
  });
  const puck = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.03, 16), new T.MeshStandardMaterial({ color: 0x0a0b0d, roughness: 0.4 }));
  puck.castShadow = true;
  W.H1.add(puck);
  const pk: any = { mode: 'carry', who: 0, timer: 1.2, from: new T.Vector3(), to: new T.Vector3(), ft: 0, dur: 0.5, target: -1, goal: -1 };
  const _p = new T.Vector3();
  const _t = new T.Vector3();
  const _t2 = new T.Vector3();
  const bladePos = (k: any, out: any) => {
    k.H.blade.getWorldPosition(out);
    W.H1.worldToLocal(out);
    out.y = 0.135;
    return out;
  };
  const people: { f: (t: number) => void }[] = [];
  const AX = W.annexX;
  (
    [
      [AX + 0.6, -12.5, 0],
      [AX + 0.3, -8.2, 1],
      [AX + 0.8, -3.5, 1],
      [AX + 0.4, 0.8, 0],
    ] as [number, number, number][]
  ).forEach(([x, z, m], i) => {
    const H = P.human({ kind: 'casual', c1: ['#e30613', '#f2c230', '#0b2a6b', '#ffffff'][i], c2: '#222', hair: [0x2a1e17, 0x6b4a2e, 0xd9b26f, 0x111111][i], longHair: i === 1, skin: i % 3, pants: 0x2c3747 });
    H.root.position.set(x, 4.56, z);
    H.root.rotation.y = -Math.PI / 2;
    H.root.scale.setScalar(0.95);
    W.H1.add(H.root);
    people.push({ f: (t) => P.cheer(H, t, i, m) });
  });
  for (let i = 0; i < (hi ? 14 : 8); i++) {
    const row = i % 3;
    const H = P.human({ kind: 'casual', c1: ['#e30613', '#1d2430', '#f3f5f7', '#0b2a6b', '#7a8a9a'][i % 5], c2: '#111', hair: [0x2a1e17, 0x6b4a2e, 0xd9b26f][i % 3], skin: i % 3, longHair: i % 4 === 1 });
    H.root.position.set(RX - 14 + i * 2.1 + rr() * 0.6, 0.9 + row * 0.42 - 0.42, RZ - RD / 2 - 2.6 - row * 0.75 + 0.05);
    H.root.scale.setScalar(0.92);
    W.H1.add(H.root);
    people.push({ f: (t) => (i % 5 === 2 ? P.cheer(H, t, i, 0) : P.sit(H, t, i)) });
  }
  {
    const H = P.human({ kind: 'casual', c1: '#1b1f26', c2: '#e30613', hair: 0x2a1e17, skin: 0 });
    H.root.position.set(AX + 2.3, 0.02, -1);
    H.root.rotation.y = -Math.PI / 2;
    W.H1.add(H.root);
    people.push({ f: (t) => P.wipe(H, t) });
  }
  // futbal
  const PX = W.pitch.PX;
  const ball = new T.Mesh(
    new T.IcosahedronGeometry(0.16, 2),
    new T.MeshStandardMaterial({
      map: TX.canvas(128, 64, (g: CanvasRenderingContext2D) => {
        g.fillStyle = '#fff';
        g.fillRect(0, 0, 128, 64);
        g.fillStyle = '#111';
        for (let i = 0; i < 8; i++) {
          g.beginPath();
          g.arc(16 + i * 16, i % 2 ? 20 : 44, 6, 0, 7);
          g.fill();
        }
      }),
      roughness: 0.5,
    }),
  );
  ball.castShadow = true;
  S.add(ball);
  const kickers = (
    [
      [PX - 6, -3, 0],
      [PX + 2, 4, 1],
      [PX + 5, -4, 0],
      [PX - 2, 5, 1],
    ] as [number, number, number][]
  ).map(([x, z, t], i) => {
    const H = P.human({ kind: 'football', c1: t ? '#1d4fd8' : '#e30613', c2: '#ffffff', number: [7, 10, 9, 5][i], hair: [0x2a1e17, 0x111111, 0x6b4a2e, 0xd9b26f][i], skin: i % 3, pants: t ? 0x1d4fd8 : 0xffffff, sock1: t ? '#1d4fd8' : '#e30613', sock2: '#ffffff' });
    S.add(H.root);
    return { H, home: new T.Vector3(x, 0.05, z), pos: new T.Vector3(x, 0.05, z), ph: i, kick: -1 };
  });
  const keeper = P.human({ kind: 'football', c1: '#f2c230', c2: '#111111', number: 1, hair: 0x2a1e17, pants: 0x111111, sock1: '#f2c230', sock2: '#111' });
  keeper.root.rotation.y = -Math.PI / 2;
  S.add(keeper.root);
  const bl: any = { who: 0, timer: 1, mode: 'carry', from: new T.Vector3(), to: new T.Vector3(), ft: 0, dur: 1, target: 1 };
  // posilňovňa a wellness
  const HX = W.hall2.HX;
  const lifter = P.human({ kind: 'gym', c1: '#1b1f26', c2: '#e30613', hair: 0x2a1e17, pants: 0x1b1f26 });
  lifter.root.position.set(W.rackX, 5.6, -8);
  S.add(lifter.root);
  const runners = [HX + 6, HX + 8.4].map((x, i) => {
    const H = P.human({ kind: 'gym', c1: i ? '#f2c230' : '#e30613', c2: '#111', hair: i ? 0xd9b26f : 0x6b4a2e, longHair: i === 1, pants: 0x1b1f26, skin: i });
    H.root.position.set(x, 5.9, -3);
    H.root.rotation.y = Math.PI;
    S.add(H.root);
    return H;
  });
  const curler = P.human({ kind: 'gym', c1: '#3a4552', c2: '#111', hair: 0x111111, pants: 0x1b1f26, skin: 2 });
  curler.root.position.set(HX + 1.5, 5.6, -10.8);
  S.add(curler.root);
  [curler.aL.wr, curler.aR.wr].forEach((wr: any) => {
    const g = new T.Group();
    for (const s of [-1, 1]) {
      const m = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.06, 10), new T.MeshStandardMaterial({ color: 0x111111 }));
      m.rotation.z = Math.PI / 2;
      m.position.x = s * 0.1;
      g.add(m);
    }
    g.position.y = -0.06;
    wr.add(g);
  });
  const lounger = P.human({ kind: 'casual', c1: '#f3f5f7', c2: '#f3f5f7', hair: 0x6b4a2e, pants: 0xf3f5f7, longHair: true, skin: 3 });
  lounger.root.position.set(HX - 2, 0.25, -1.9);
  S.add(lounger.root);
  const walker = P.human({ kind: 'casual', c1: '#0b2a6b', c2: '#e30613', hair: 0x2a1e17, pants: 0x1b1f26 });
  S.add(walker.root);
  const bag = new T.Mesh(new T.BoxGeometry(0.9, 0.38, 0.36), new T.MeshStandardMaterial({ color: 0x111418, roughness: 0.6 }));
  bag.castShadow = true;
  bag.position.set(0, -0.2, 0);
  walker.aR.wr.add(bag);

  // ---------- simulácia (pevný krok) ----------
  function step(t: number, dt: number, active: Zone3D | null) {
    const fast = (z: Zone3D) => (active === z ? 1.35 : 1);
    const di = dt * fast('ice');
    for (const k of skaters) {
      const sp = k.v * (k.shoot >= 0 ? 0.55 : 1);
      k.s = (k.s + (sp * di) / k.len) % 1;
      k.path.getPointAt(k.s, _p);
      const tan = k.path.getTangentAt(k.s, _t);
      const tan2 = k.path.getTangentAt((k.s + 0.01) % 1, _t2);
      const turn = Math.atan2(tan.x * tan2.z - tan.z * tan2.x, tan.x * tan2.x + tan.z * tan2.z);
      k.lean += (Math.max(-0.4, Math.min(0.4, -turn * 30)) - k.lean) * Math.min(1, di * 4);
      k.H.root.position.copy(_p);
      k.H.root.rotation.set(0, Math.atan2(tan.x, tan.z), 0);
      k.H.root.rotateZ(k.lean * 0.6);
      k.ph += di * (3.6 + sp * 0.35);
      if (k.shoot >= 0) {
        k.shoot += di / 0.7;
        if (k.shoot >= 1) k.shoot = -1;
      }
      P.skate(k.H, k.ph, Math.min(1, sp / 7), k.lean, Math.max(0, k.shoot), t + k.ph);
    }
    pk.timer -= di;
    if (pk.mode === 'carry') {
      const k = skaters[pk.who];
      bladePos(k, puck.position);
      if (pk.timer <= 0 && k.shoot < 0) {
        const shoot = rr() < 0.3;
        k.shoot = 0;
        pk.mode = 'wind';
        pk.timer = 0.36;
        pk.goal = shoot ? 1 - k.team : -1;
        if (!shoot) {
          let j;
          do j = Math.floor(rr() * skaters.length);
          while (j === pk.who);
          pk.target = j;
        }
      }
    } else if (pk.mode === 'wind') {
      bladePos(skaters[pk.who], puck.position);
      if (pk.timer <= 0) {
        pk.mode = 'fly';
        pk.ft = 0;
        pk.from.copy(puck.position);
        if (pk.goal >= 0) {
          const g = goalies[pk.goal];
          pk.to.set(g.gx + (pk.goal ? -1 : 1) * 0.6, 0.5, RZ + (rr() - 0.5) * 1.2);
          pk.dur = 0.35;
        } else {
          const k2 = skaters[pk.target];
          pk.dur = Math.max(0.35, k2.H.root.position.distanceTo(puck.position) / 16);
          k2.path.getPointAt((k2.s + (k2.v * pk.dur) / k2.len) % 1, pk.to);
        }
      }
    } else if (pk.mode === 'fly') {
      pk.ft += di / pk.dur;
      const k = Math.min(1, pk.ft);
      puck.position.lerpVectors(pk.from, pk.to, k);
      puck.position.y = pk.goal >= 0 ? 0.135 + Math.sin(k * Math.PI * 0.5) * (pk.to.y - 0.1) : 0.135;
      if (pk.goal >= 0) goalies[pk.goal].drop = Math.min(1, goalies[pk.goal].drop + di * 6);
      if (k >= 1) {
        if (pk.goal >= 0) {
          pk.mode = 'save';
          pk.timer = 0.8;
        } else {
          pk.mode = 'carry';
          pk.who = pk.target;
          pk.timer = 0.8 + rr() * 1.6;
        }
      }
    } else if (pk.mode === 'save' && pk.timer <= 0) {
      pk.from.copy(puck.position);
      pk.from.y = 0.135;
      pk.target = Math.floor(rr() * skaters.length);
      pk.to.copy(skaters[pk.target].H.root.position);
      pk.dur = 0.6;
      pk.ft = 0;
      pk.goal = -1;
      pk.mode = 'fly';
    }
    goalies.forEach((g, i) => {
      if (pk.goal !== i || pk.mode === 'carry') g.drop = Math.max(0, g.drop - di * 1.6);
      g.side += (Math.max(-0.5, Math.min(0.5, (puck.position.z - RZ) * 0.15)) - g.side) * Math.min(1, di * 3);
      g.H.root.position.z = RZ + g.side;
      P.goalie(g.H, t + i, g.drop, 0);
    });
    // futbal
    const dp = dt * fast('pitch');
    bl.timer -= dp;
    kickers.forEach((k, i) => {
      const carry = bl.mode === 'carry' && bl.who === i;
      const target = k.home.clone().add(new T.Vector3(Math.sin(t * (carry ? 0.7 : 0.4) + i * (carry ? 1 : 2)) * (carry ? 2.2 : 3), 0, Math.cos(t * (carry ? 0.5 : 0.3) + i) * (carry ? 1.6 : 2.4)));
      const d = target.sub(k.pos);
      const dist = d.length();
      const spd = Math.min(4.5, dist * 1.4);
      if (dist > 0.05) {
        k.pos.addScaledVector(d.normalize(), spd * dp);
        k.H.root.rotation.y = Math.atan2(d.x, d.z);
      }
      if (bl.mode === 'fly' && bl.target === i) {
        const dd = ball.position.clone().sub(k.pos);
        k.H.root.rotation.y = Math.atan2(dd.x, dd.z);
      }
      k.H.root.position.copy(k.pos);
      k.ph += dp * (4 + spd * 1.6);
      if (k.kick >= 0) {
        k.kick += dp / 0.5;
        if (k.kick >= 1) k.kick = -1;
      }
      P.run(k.H, k.ph, Math.min(1, spd / 4), Math.max(0, k.kick));
    });
    if (bl.mode === 'carry') {
      const k = kickers[bl.who];
      ball.position.copy(k.pos).add(new T.Vector3(Math.sin(k.H.root.rotation.y) * 0.45, 0, Math.cos(k.H.root.rotation.y) * 0.45));
      ball.position.y = 0.21;
      ball.rotation.x += dp * 6;
      if (bl.timer <= 0 && k.kick < 0) {
        k.kick = 0;
        bl.mode = 'kick';
        bl.timer = 0.22;
        let j;
        do j = Math.floor(rr() * 4);
        while (j === bl.who);
        bl.target = j;
      }
    } else if (bl.mode === 'kick') {
      if (bl.timer <= 0) {
        bl.mode = 'fly';
        bl.ft = 0;
        bl.from.copy(ball.position);
        bl.to.copy(kickers[bl.target].pos);
        bl.dur = Math.max(0.5, bl.from.distanceTo(bl.to) / 11);
      }
    } else {
      bl.ft += dp / bl.dur;
      const k = Math.min(1, bl.ft);
      ball.position.lerpVectors(bl.from, bl.to, k);
      ball.position.y = 0.21 + Math.sin(k * Math.PI) * 0.6;
      ball.rotation.x += dp * 14;
      if (k >= 1) {
        bl.mode = 'carry';
        bl.who = bl.target;
        bl.timer = 1 + rr() * 1.5;
      }
    }
    keeper.root.position.set(PX + W.pitch.PWd / 2 - 1.2, 0.05, Math.max(-1.6, Math.min(1.6, ball.position.z * 0.3)));
    P.goalie(keeper, t, 0, 0);
    keeper.aL.sh.rotation.set(-0.9, 0, 0.6);
    keeper.aR.sh.rotation.set(-0.9, 0, -0.6);
    // posilňovňa, wellness, ľudia
    const tg = t * (active === 'gym' ? 1.3 : 1);
    const d = P.squat(lifter, tg);
    W.bar.position.set(W.rackX, 5.6 + 1.52 - d * 0.42, -8 - d * 0.12 - 0.05);
    runners.forEach((H, i) => P.run(H, tg * 9.5 + i * 1.3, 0.85));
    P.curl(curler, tg);
    P.sit(lounger, t * 0.3, 1);
    lounger.spine.rotation.x = -0.6;
    lounger.lL.hp.rotation.x = -0.9;
    lounger.lR.hp.rotation.x = -0.9;
    lounger.lL.kn.rotation.x = 0.1;
    lounger.lR.kn.rotation.x = 0.1;
    lounger.hips.position.y = 0.45;
    W.water.normalMap.offset.set(t * 0.03, t * 0.017);
    people.forEach((p) => p.f(t * (active === 'sky' ? 1.4 : 1)));
    const wp = (t * 0.08) % 1;
    walker.root.position.set(-40 + wp * 40, 0.01, 27.5);
    walker.root.rotation.y = Math.PI / 2;
    P.walk(walker, t * 5.2);
    walker.aR.sh.rotation.set(0.05, 0, -0.2);
    walker.aR.el.rotation.x = 0;
    // dres sa vlní
    const jp = W.jersey.geo.attributes.position;
    const b = W.jersey.base;
    for (let i = 0; i < jp.count; i++) {
      const x = b[i * 3];
      const y = b[i * 3 + 1];
      const k = (1.8 - y) / 3.6;
      jp.setZ(i, Math.sin(x * 1.6 + t * 1.7) * 0.09 * k + Math.sin(y * 2 + t * 1.1) * 0.04 * k);
    }
    jp.needsUpdate = true;
    W.jersey.geo.computeVertexNormals();
    if (precip.visible) {
      const a = pGeo.attributes.position.array as Float32Array;
      const v = precipKind === 'snow' ? 1.1 : 14;
      for (let i = 0; i < a.length; i += 3) {
        a[i + 1] -= v * dt;
        if (precipKind === 'snow') a[i] += Math.sin(t + i) * 0.01;
        if (a[i + 1] < 0) a[i + 1] += 50;
      }
      pGeo.attributes.position.needsUpdate = true;
    }
  }

  // ---------- obloha, svetlo a počasie ----------
  function setSky(s: SkyScene, w: Weather, _ms: number) {
    // maketa: štúdiové svetlo zhora zľava; v noci stmavne a rozsvietia sa lampy, ihrisko a nápis
    void _ms;
    const day = s.dayness;
    const night = day < 0.25;
    paintBg(day);
    stars.visible = false;
    moon.visible = false;
    const d = new T.Vector3(-0.5, 0.78, 0.42).normalize();
    sun.position.copy(d).multiplyScalar(170).add(new T.Vector3(12, 0, 6));
    sun.target.position.set(12, 0, 6);
    sun.shadow.radius = 3;
    sun.shadow.bias = -0.0003;
    Object.assign(sun.shadow.camera, { left: -125, right: 125, top: 90, bottom: -90 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.color.set(night ? 0x8fa8d8 : 0xffffff);
    sun.intensity = 0.5 + day * 1.5;
    hemi.color.set(night ? 0x34466a : 0xffffff);
    hemi.groundColor.set(night ? 0x05080d : 0x5f6b78);
    hemi.intensity = 0.2 + day * 0.3;
    S.environmentIntensity = 0.08 + day * 0.22;
    moonL.intensity = 0;
    plinthMat.color.set(night ? 0x1b2838 : 0xc4ccd4);
    treeMat.color.set(night ? 0x8fa0b3 : 0xf2f4f6);
    const lit = s.lights || night;
    W.lamps.forEach((l: any) => (l.m.emissiveIntensity = lit ? l.on : 0));
    W.heads.forEach((l: any, i: number) => (l.m.emissiveIntensity = night && i % 6 < 2 ? l.on * 6 : 0));
    W.night.forEach((n: any) => (n.l.intensity = lit ? n.on : 0));
    W.flood.forEach((f: any) => (f.intensity = lit ? 380 : 0));
    W.cityWin.opacity = 0;
    W.signMat.emissiveIntensity = lit ? 2.2 : 0.15;
    W.iceBeamMat.opacity = night ? 0.1 : 0.05;
    precipKind = w.precip === 'snow' || w.precip === 'sleet' ? 'snow' : w.precip === 'rain' ? 'rain' : 'none';
    precip.visible = precipKind !== 'none';
    pMat.size = precipKind === 'rain' ? 0.08 : 0.3;
    pMat.color.set(precipKind === 'rain' ? 0xb9cde0 : 0xffffff);
    pMat.opacity = precipKind === 'rain' ? 0.6 : 0.95;
    W.beams.forEach((m: any) => (m.opacity = lit ? (precipKind === 'snow' ? 0.09 : 0.045) : 0));
    bloom.strength = night ? 0.45 : 0.12;
    bloom.threshold = night ? 1.0 : 1.6;
  }

  // ---------- kamera ----------
  const camera = new T.PerspectiveCamera(13.2, 1, 1, 6000);
  const TARGET = new T.Vector3(13, 0, 8);
  const view = { ang: 0.5, el: 0.4, R: 410 };
  const over = (): Cam => ({ t: TARGET.clone(), p: new T.Vector3(TARGET.x + view.R * Math.sin(view.ang) * Math.cos(view.el), TARGET.y + view.R * Math.sin(view.el), TARGET.z + view.R * Math.cos(view.ang) * Math.cos(view.el)), fov: 13.2 });
  const FOCUS: Record<Zone3D, Cam> = {
    ice: { t: new T.Vector3(-17, 2, -3), p: new T.Vector3(-17 + 230 * Math.sin(0.42) * Math.cos(0.5), 2 + 230 * Math.sin(0.5), -3 + 230 * Math.cos(0.42) * Math.cos(0.5)), fov: 13 },
    sky: { t: new T.Vector3(11, 5.4, -6), p: new T.Vector3(11 + 120 * Math.sin(0.2) * Math.cos(0.28), 5.4 + 120 * Math.sin(0.28), -6 + 120 * Math.cos(0.2) * Math.cos(0.28)), fov: 13 },
    food: { t: new T.Vector3(11, 1.8, -3), p: new T.Vector3(11 + 120 * Math.sin(0.2) * Math.cos(0.2), 1.8 + 120 * Math.sin(0.2), -3 + 120 * Math.cos(0.2) * Math.cos(0.2)), fov: 13 },
    pitch: { t: new T.Vector3(30, 1, 0), p: new T.Vector3(30 + 170 * Math.sin(0.35) * Math.cos(0.55), 1 + 170 * Math.sin(0.55), 170 * Math.cos(0.35) * Math.cos(0.55)), fov: 13 },
    gym: { t: new T.Vector3(58, 6, -4), p: new T.Vector3(58 + 150 * Math.sin(0.25) * Math.cos(0.32), 6 + 150 * Math.sin(0.32), -4 + 150 * Math.cos(0.25) * Math.cos(0.32)), fov: 13 },
    well: { t: new T.Vector3(58, 1.5, -4), p: new T.Vector3(58 + 150 * Math.sin(0.25) * Math.cos(0.22), 1.5 + 150 * Math.sin(0.22), -4 + 150 * Math.cos(0.25) * Math.cos(0.22)), fov: 13 },
  };
  const HIT: Record<Zone3D, { c: any; r: number }> = {
    ice: { c: new T.Vector3(RX, 1, RZ), r: 22 },
    sky: { c: new T.Vector3(11, 6, -6), r: 6 },
    food: { c: new T.Vector3(11, 1.5, -3), r: 6 },
    pitch: { c: new T.Vector3(30, 0.5, 0), r: 13 },
    gym: { c: new T.Vector3(58, 7.5, -5), r: 11 },
    well: { c: new T.Vector3(58, 1.5, -5), r: 11 },
  };
  const LABEL: Record<Zone3D, any> = {
    ice: new T.Vector3(RX, 8, RZ),
    sky: new T.Vector3(11, 8.3, -1),
    food: new T.Vector3(11, 3.4, 2),
    pitch: new T.Vector3(30, 5, 0),
    gym: new T.Vector3(58, 10, -2),
    well: new T.Vector3(58, 4.2, 1),
  };
  let cur: Cam = over();
  let fromCam: Cam = cur;
  let toCam: Cam | null = null;
  let flyT = 1;
  let flyStart = -1;
  let focusZone: Zone3D | null = null;
  let started = false;
  const flyTo = (to: Cam) => {
    fromCam = { t: cur.t.clone(), p: cur.p.clone(), fov: cur.fov };
    toCam = to;
    flyT = 0;
    flyStart = -1;
  };
  function focus(z: Zone3D | null) {
    if (z === focusZone && started) return;
    focusZone = z;
    if (!z) return flyTo(over());
    // vpravo sa vysúva panel s fotkami – kamera sa posunie doprava, aby časť areálu ostala vľavo
    const f0 = FOCUS[z];
    // o niečo ďalej, aby bolo vidno aj okolie časti
    const f = { t: f0.t, p: f0.t.clone().add(f0.p.clone().sub(f0.t).multiplyScalar(1.3)), fov: f0.fov };
    const fwd = f.t.clone().sub(f.p);
    const right = fwd.clone().cross(new T.Vector3(0, 1, 0)).normalize().multiplyScalar(fwd.length() * Math.tan((f.fov * Math.PI) / 360) * 0.75);
    flyTo({ t: f.t.clone().add(right), p: f.p.clone().add(right), fov: f.fov });
  }
  function rotate(dx: number, dy: number) {
    if (focusZone) return;
    flyT = 1;
    view.ang = Math.max(-0.9, Math.min(1.1, view.ang - dx * 0.0032));
    view.el = Math.max(0.2, Math.min(0.95, view.el + dy * 0.003));
    cur = over();
  }
  function zoom(f: number) {
    if (focusZone) return;
    flyT = 1;
    view.R = Math.max(220, Math.min(560, view.R * f));
    cur = over();
  }
  function reset() {
    view.ang = 0.5;
    view.el = 0.4;
    view.R = 410;
    focusZone = null;
    flyTo(over());
  }
  const ray = new T.Raycaster();
  function pick(nx: number, ny: number): Zone3D | null {
    ray.setFromCamera(new T.Vector2(nx, ny), camera);
    let best: Zone3D | null = null;
    let bestD = Infinity;
    for (const z of Object.keys(HIT) as Zone3D[]) {
      const h = HIT[z];
      const d = ray.ray.distanceSqToPoint(h.c);
      if (d < h.r * h.r * 0.35) {
        const score = d / (h.r * h.r) + ray.ray.origin.distanceTo(h.c) * 0.0005;
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
    return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h, visible: v.z < 1 && v.x > -1.1 && v.x < 1.1 };
  }

  // ---------- postprocess ----------
  const comp = new EffectComposer(r);
  comp.addPass(new RenderPass(S, camera));
  const ao = new GTAOPass(S, camera, 2, 2);
  ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1.5, scale: 1.2, samples: 12 });
  ao.blendIntensity = 0.85;
  ao.enabled = hi;
  comp.addPass(ao);
  const bloom = new UnrealBloomPass(new T.Vector2(256, 256), 0.12, 0.3, 1.6);
  comp.addPass(bloom);
  comp.addPass(new OutputPass());
  const smaa = new SMAAPass();
  comp.addPass(smaa);

  // nižšia kvalita za behu, ak by to sekalo
  function setQuality(q: 'high' | 'low') {
    hi = q === 'high';
    ao.enabled = hi;
    setIceMirror(hi);
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, hi ? 1.5 : 1));
    sun.shadow.mapSize.set(hi ? 2048 : 1024, hi ? 2048 : 1024);
    sun.shadow.map?.dispose();
    sun.shadow.map = null;
    W.spots.forEach((sp: any) => (sp.castShadow = hi));
    lastW = 0;
  }

  let lastT = -1;
  let acc = 0;
  let lastW = 0;
  let lastH = 0;
  function render(t: number, w: number, h: number, active: Zone3D | null) {
    started = true;
    const dt = lastT < 0 ? 1 / 60 : Math.min(0.1, t - lastT);
    lastT = t;
    acc += dt;
    let n = 0;
    while (acc >= 1 / 60 && n < 4) {
      step(t, 1 / 60, active);
      acc -= 1 / 60;
      n++;
    }
    if (n === 4) acc = 0;
    if (toCam && flyT < 1) {
      if (flyStart < 0) flyStart = t;
      flyT = Math.min(1, (t - flyStart) / 1.2);
      const k = flyT < 0.5 ? 4 * flyT ** 3 : 1 - Math.pow(-2 * flyT + 2, 3) / 2;
      cur = { t: new T.Vector3().lerpVectors(fromCam.t, toCam.t, k), p: new T.Vector3().lerpVectors(fromCam.p, toCam.p, k), fov: fromCam.fov + (toCam.fov - fromCam.fov) * k };
    }
    if (w !== lastW || h !== lastH) {
      lastW = w;
      lastH = h;
      r.setSize(w, h, false);
      comp.setSize(w, h);
      const pr = r.getPixelRatio();
      ao.setSize(w * pr, h * pr);
      bloom.resolution.set((w * pr) / 2, (h * pr) / 2);
    }
    camera.aspect = w / h;
    camera.fov = cur.fov;
    camera.position.copy(cur.p);
    camera.lookAt(cur.t);
    camera.updateProjectionMatrix();
    comp.render();
  }

  function dispose() {
    S.traverse((o: any) => {
      o.geometry?.dispose?.();
      [].concat(o.material || []).forEach((m: any) => {
        m.map?.dispose?.();
        m.dispose?.();
      });
    });
    envTex.dispose();
    pmrem.dispose();
    comp.dispose?.();
    r.dispose();
  }

  return { render, setSky, focus, rotate, zoom, reset, pick, project, dispose, setQuality };
}
export type Areal = ReturnType<typeof createAreal>;
