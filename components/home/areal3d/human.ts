// @ts-nocheck – 3D stavba (three.js), typovú kontrolu robí scene.ts na rozhraní
// Postavy s kostrou (skupiny = kĺby) a tvarmi z rotačných profilov – mäkké, ľudské proporcie.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvas, FONT } from './tex';

const SKIN = [0xe9b996, 0xc98d64, 0x8a5a3c, 0xf1cdb0];
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });

// zúžená „kapsula“ – profil otočený okolo osi (r1 hore, r2 dole, dĺžka len)
function taper(len, r1, r2, seg = 14) {
  const n = 7;
  const prof = [];
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * (Math.PI / 2);
    prof.push(new THREE.Vector2(Math.max(0.0001, Math.cos(a) * r2), -len + Math.sin(a) * r2 * 0.8));
  }
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * (Math.PI / 2);
    prof.push(new THREE.Vector2(Math.max(0.0001, Math.cos(a) * r1), Math.sin(a) * r1 * 0.8));
  }
  return new THREE.LatheGeometry(prof, seg);
}
function mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const joint = (parent, x = 0, y = 0, z = 0) => {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
};

// textúra dresu: farba, pruhy pri leme a na rukávoch, číslo
function jerseyTex(c1, c2) {
  return canvas(256, 256, (g, w, h) => {
    g.fillStyle = c1;
    g.fillRect(0, 0, w, h);
    g.fillStyle = c2;
    g.fillRect(0, h * 0.06, w, h * 0.07);
    g.fillRect(0, h * 0.16, w, h * 0.03);
  });
}
function sockTex(c1, c2) {
  return canvas(64, 128, (g, w, h) => {
    g.fillStyle = c1;
    g.fillRect(0, 0, w, h);
    g.fillStyle = c2;
    g.fillRect(0, h * 0.3, w, h * 0.1);
    g.fillRect(0, h * 0.5, w, h * 0.06);
  });
}
function numberTex(n, c1, c2) {
  return canvas(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = c2;
    g.font = `900 italic 92px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 6;
    g.strokeStyle = c1 === '#ffffff' ? '#0b1622' : '#ffffff';
    g.strokeText(String(n), w / 2, h / 2 + 6);
    g.fillText(String(n), w / 2, h / 2 + 6);
  });
}

/*
  o: { kind: 'hockey'|'goalie'|'casual'|'football'|'gym', c1, c2, number, skin, hair, pants, shoes, scale }
*/
export function human(o: any): any {
  const H: any = {};
  const root = new THREE.Group();
  const skin = std(SKIN[o.skin ?? 0], { roughness: 0.55 });
  const hockey = o.kind === 'hockey' || o.kind === 'goalie';
  const c1 = o.c1 ?? '#e30613';
  const c2 = o.c2 ?? '#ffffff';
  const shirt = std(0xffffff, { map: jerseyTex(c1, c2), roughness: 0.8 });
  const pantsMat = std(o.pants ?? (hockey ? 0x10141a : 0x2c3747), { roughness: 0.85 });
  const shoe = std(o.shoes ?? 0x111316, { roughness: 0.5 });

  const hips = joint(root, 0, 0.98, 0);
  H.hips = hips;
  // panva / nohavice
  const pelvisW = hockey ? 0.21 : 0.17;
  const pelvis = mesh(new RoundedBoxGeometry(pelvisW * 2, 0.22, 0.24, 3, 0.08), pantsMat, hips, 0, -0.02, 0);
  if (hockey) pelvis.scale.set(1.12, 1.25, 1.15);

  const spine = joint(hips, 0, 0.08, 0);
  H.spine = spine;
  // trup – profil: pás, hrudník, ramená
  const shoulder = hockey ? 0.27 : 0.2;
  const prof = [
    [0.0001, 0],
    [hockey ? 0.21 : 0.165, 0.02],
    [hockey ? 0.22 : 0.155, 0.16],
    [hockey ? 0.25 : 0.18, 0.34],
    [shoulder, 0.46],
    [shoulder * 0.85, 0.53],
    [0.08, 0.58],
    [0.0001, 0.59],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const torso = mesh(new THREE.LatheGeometry(prof, 20), o.kind === 'gym' || o.kind === 'casual' || o.kind === 'football' || hockey ? shirt : shirt, spine);
  torso.scale.set(1, 1, hockey ? 0.78 : 0.68);
  if (o.number && hockey) {
    const num = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshStandardMaterial({ map: numberTex(o.number, c1, c2), transparent: true, roughness: 0.8 }));
    num.position.set(0, 0.3, -0.19);
    num.rotation.y = Math.PI;
    spine.add(num);
  }
  if (o.number && o.kind === 'football') {
    const num = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshStandardMaterial({ map: numberTex(o.number, c1, c2), transparent: true }));
    num.position.set(0, 0.3, -0.125);
    num.rotation.y = Math.PI;
    spine.add(num);
  }
  const neck = joint(spine, 0, 0.56, 0);
  H.neck = neck;
  mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 10), skin, neck, 0, 0.03, 0);
  const head = joint(neck, 0, 0.1, 0);
  H.head = head;
  const skull = mesh(new THREE.SphereGeometry(0.11, 22, 16), skin, head, 0, 0.1, 0.01);
  skull.scale.set(0.92, 1.12, 1);
  // nos a uši – drobnosti, ktoré robia hlavu hlavou
  mesh(new THREE.SphereGeometry(0.018, 8, 6), skin, head, 0, 0.09, 0.115);
  for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.022, 8, 6), skin, head, s * 0.1, 0.1, 0).scale.set(0.5, 1, 0.8);
  if (o.kind === 'goalie') {
    const mask = mesh(new THREE.SphereGeometry(0.135, 22, 16), std(o.maskColor ?? 0xf3f5f7, { roughness: 0.25, metalness: 0.1 }), head, 0, 0.11, 0.0);
    mask.scale.set(0.95, 1.12, 1.05);
    const cage = mesh(new THREE.SphereGeometry(0.128, 14, 8, -0.9, 1.8, 1.1, 1.0), new THREE.MeshStandardMaterial({ color: 0x1a1d22, wireframe: true }), head, 0, 0.1, 0.03);
    cage.rotation.y = Math.PI / 2 - Math.PI / 2;
  } else if (hockey) {
    const helm = std(o.helmet ?? c1, { roughness: 0.3, metalness: 0.15 });
    const h = mesh(new THREE.SphereGeometry(0.128, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), helm, head, 0, 0.12, -0.005);
    h.scale.set(0.95, 1.05, 1.07);
    for (const s of [-1, 1]) mesh(new RoundedBoxGeometry(0.03, 0.07, 0.08, 2, 0.012), helm, head, s * 0.11, 0.09, 0.0);
    const visor = mesh(
      new THREE.CylinderGeometry(0.128, 0.128, 0.065, 18, 1, true, -0.95, 1.9),
      new THREE.MeshPhysicalMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.35, roughness: 0.02, metalness: 0.2, side: THREE.DoubleSide }),
      head,
      0,
      0.115,
      0.0,
    );
    visor.rotation.y = 0;
  } else if (o.hair !== undefined) {
    const hair = mesh(new THREE.SphereGeometry(0.118, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), std(o.hair, { roughness: 0.9 }), head, 0, 0.115, -0.008);
    hair.scale.set(0.95, 1.1, 1.06);
    if (o.longHair) mesh(new RoundedBoxGeometry(0.2, 0.22, 0.08, 3, 0.04), std(o.hair, { roughness: 0.9 }), head, 0, 0.02, -0.08);
  }

  // ruky
  const sleeve = shirt;
  const arm = (s) => {
    const sh = joint(spine, s * (shoulder - 0.03), 0.45, 0);
    mesh(new THREE.SphereGeometry(hockey ? 0.11 : 0.075, 14, 10), sleeve, sh, 0, 0, 0);
    const up = mesh(taper(0.27, hockey ? 0.09 : 0.06, hockey ? 0.075 : 0.05), sleeve, sh, 0, 0, 0);
    up.scale.set(1, 1, 1);
    const el = joint(sh, 0, -0.29, 0);
    const lowMat = hockey ? std(0x1b1f26) : o.kind === 'gym' || o.kind === 'football' ? skin : sleeve;
    mesh(taper(0.24, hockey ? 0.07 : 0.05, hockey ? 0.06 : 0.04), lowMat, el, 0, 0, 0);
    const wr = joint(el, 0, -0.26, 0);
    if (hockey) mesh(new RoundedBoxGeometry(0.1, 0.13, 0.12, 3, 0.03), std(o.gloves ?? 0x161a20, { roughness: 0.6 }), wr, 0, -0.04, 0.01);
    else mesh(new RoundedBoxGeometry(0.07, 0.1, 0.035, 3, 0.015), skin, wr, 0, -0.05, 0.0);
    return { sh, el, wr };
  };
  H.aL = arm(1);
  H.aR = arm(-1);

  // nohy
  const leg = (s) => {
    const hp = joint(hips, s * (hockey ? 0.11 : 0.09), -0.06, 0);
    const thighMat = o.kind === 'football' || o.kind === 'gym' ? pantsMat : pantsMat;
    const th = mesh(taper(0.4, hockey ? 0.12 : 0.085, hockey ? 0.09 : 0.06), thighMat, hp);
    if (hockey) th.scale.set(1.1, 1, 1.1);
    const kn = joint(hp, 0, -0.42, 0);
    const shinMat =
      hockey || o.kind === 'football' ? std(0xffffff, { map: sockTex(o.sock1 ?? c1, o.sock2 ?? c2), roughness: 0.85 }) : o.kind === 'gym' ? skin : pantsMat;
    mesh(taper(0.38, hockey ? 0.085 : 0.06, hockey ? 0.065 : 0.045), shinMat, kn);
    const an = joint(kn, 0, -0.41, 0);
    if (hockey) {
      const boot = mesh(new RoundedBoxGeometry(0.11, 0.13, 0.27, 3, 0.04), std(0x0d0f12, { roughness: 0.4 }), an, 0, -0.03, 0.04);
      boot.rotation.x = 0.05;
      mesh(new THREE.BoxGeometry(0.03, 0.035, 0.24), std(0x2a2f36), an, 0, -0.11, 0.04);
      mesh(new THREE.BoxGeometry(0.008, 0.03, 0.3), new THREE.MeshStandardMaterial({ color: 0xe8edf2, metalness: 1, roughness: 0.15 }), an, 0, -0.135, 0.04);
    } else {
      const sh2 = mesh(new RoundedBoxGeometry(0.1, 0.08, 0.26, 3, 0.03), shoe, an, 0, -0.03, 0.05);
      if (o.kind === 'football') sh2.material = std(o.shoes ?? 0xf2f4f6, { roughness: 0.45 });
    }
    if (o.kind === 'goalie') {
      const pad = mesh(new RoundedBoxGeometry(0.26, 0.82, 0.2, 3, 0.05), std(o.padColor ?? 0xf3f5f7, { roughness: 0.6 }), kn, 0, -0.28, 0.08);
      pad.castShadow = true;
    }
    return { hp, kn, an };
  };
  H.lL = leg(1);
  H.lR = leg(-1);

  // hokejka v pravej ruke, gril/lapačka pre brankára
  if (hockey) {
    const st = joint(root, 0, 0, 0);
    const shaftMat = std(o.kind === 'goalie' ? 0x1a1d22 : 0x1f2329, { roughness: 0.35 });
    const shaft = mesh(new RoundedBoxGeometry(0.03, 1.42, 0.022, 2, 0.008), shaftMat, st, 0, -0.71, 0);
    const tape = std(0xf0f0f0, { roughness: 0.9 });
    mesh(new RoundedBoxGeometry(0.034, 0.12, 0.026, 2, 0.008), tape, st, 0, -0.04, 0);
    const blade = joint(st, 0, -1.42, 0);
    const bl = mesh(new RoundedBoxGeometry(o.kind === 'goalie' ? 0.09 : 0.06, 0.08, 0.34, 2, 0.02), o.kind === 'goalie' ? shaftMat : tape, blade, 0, 0, 0.14);
    bl.position.set(0, 0.03, 0.15);
    shaft.castShadow = true;
    H.stick = st;
    H.blade = blade;
    if (o.kind === 'goalie') {
      mesh(new RoundedBoxGeometry(0.09, 0.36, 0.08, 2, 0.02), shaftMat, st, 0, -0.95, 0.02); // širší list
      mesh(new RoundedBoxGeometry(0.2, 0.26, 0.06, 3, 0.03), std(o.padColor ?? 0xf3f5f7), H.aR.wr, 0, -0.04, 0.05); // vyrážačka
      const glove = mesh(new THREE.SphereGeometry(0.13, 16, 12), std(o.padColor ?? 0xf3f5f7), H.aL.wr, 0, -0.06, 0.04);
      glove.scale.set(0.7, 1, 1);
    }
  }
  root.scale.setScalar(o.scale ?? 1);
  H.root = root;
  H.kind = o.kind;
  return H;
}

// ============ pózy (všetko sú plynulé funkcie času) ============
const lerp = (a, b, k) => a + (b - a) * k;
export function rest(H) {
  for (const k of ['hips', 'spine', 'neck', 'head']) H[k].rotation.set(0, 0, 0);
  for (const a of [H.aL, H.aR]) {
    a.sh.rotation.set(0, 0, 0);
    a.el.rotation.set(0, 0, 0);
    a.wr.rotation.set(0, 0, 0);
  }
  for (const l of [H.lL, H.lR]) {
    l.hp.rotation.set(0, 0, 0);
    l.kn.rotation.set(0, 0, 0);
    l.an.rotation.set(0, 0, 0);
  }
  if (H.stick) H.stick.rotation.set(0, 0, 0);
}

// korčuľovanie: odraz do strany, sklz, váha prenášaná z nohy na nohu; shoot 0–1 = strela
export function skate(H, ph, speed, lean, shoot = 0, handle = 0) {
  rest(H);
  const k = Math.sin(ph);
  const push = Math.max(0, k);
  const push2 = Math.max(0, -k);
  const crouch = 0.6 + speed * 0.25;
  H.hips.position.y = 0.88 - crouch * 0.12 + Math.abs(Math.cos(ph)) * 0.025;
  H.hips.position.x = Math.sin(ph) * 0.07;
  H.hips.rotation.z = -Math.sin(ph) * 0.06 + lean * 0.5;
  H.hips.rotation.y = Math.sin(ph) * 0.12;
  H.spine.rotation.x = 0.45 + speed * 0.2 - shoot * 0.25;
  H.spine.rotation.y = -Math.sin(ph) * 0.1 + shoot * 0.9 * Math.sin(shoot * Math.PI);
  H.neck.rotation.x = -0.4 - speed * 0.15 + shoot * 0.2;
  // nohy: oporná pokrčená, odrazová vystretá dozadu do boku
  H.lL.hp.rotation.set(-crouch + push * 0.55, 0, 0.08 + push * 0.45);
  H.lL.kn.rotation.x = crouch * 1.5 - push * 1.0;
  H.lL.an.rotation.x = -0.3 + push * 0.3;
  H.lR.hp.rotation.set(-crouch + push2 * 0.55, 0, -0.08 - push2 * 0.45);
  H.lR.kn.rotation.x = crouch * 1.5 - push2 * 1.0;
  H.lR.an.rotation.x = -0.3 + push2 * 0.3;
  // hokejka: list na ľade pred telom (vedenie puku zo strany na stranu), pri strele nápriah a dotiahnutie
  const hd = shoot ? 0 : Math.sin(handle * 7) * 0.28;
  const wind = shoot < 0.5 ? Math.sin((shoot / 0.5) * (Math.PI / 2)) : 1 - (shoot - 0.5) / 0.5;
  const follow = shoot > 0.5 ? Math.sin(((shoot - 0.5) / 0.5) * Math.PI) : 0;
  const bx = -0.2 + hd - wind * 0.55 + follow * 0.35;
  const bz = 0.85 - wind * 0.55 + follow * 0.25;
  const by = 0.03 + wind * 0.45 + follow * 0.55;
  holdStick(H, [bx, by, bz], [-0.12 - wind * 0.3, 1.0 + wind * 0.2, 0.25 - wind * 0.1], 0.2);
}

// brankár: základný postoj, posun do strán; drop 0–1 = motýlik pri strele
export function goalie(H, t, drop = 0, side = 0) {
  rest(H);
  const b = Math.sin(t * 2.4) * 0.03;
  H.hips.position.y = lerp(0.72 + b, 0.42, drop);
  H.hips.position.x = side;
  H.spine.rotation.x = lerp(0.4, 0.25, drop);
  H.neck.rotation.x = -0.35;
  for (const [l, s] of [
    [H.lL, 1],
    [H.lR, -1],
  ]) {
    l.hp.rotation.set(lerp(-0.9, -1.5, drop), lerp(0, s * 0.9, drop), lerp(s * 0.35, s * 0.15, drop));
    l.kn.rotation.x = lerp(1.25, 1.6, drop);
    l.an.rotation.z = lerp(0, -s * 0.9, drop);
  }
  H.aL.sh.rotation.set(-0.6, 0, 0.75 + drop * 0.3);
  H.aL.el.rotation.x = -1.1;
  holdStick(H, [side * 0 - 0.1, 0.03, 0.75], [-0.25, lerp(0.75, 0.55, drop), 0.3], 0);
  H.aL.sh.rotation.set(-0.6, 0, 0.75 + drop * 0.3);
  H.aL.el.rotation.x = -1.1;
}
// beh: frekvencia podľa rýchlosti; kick 0–1 = kop do lopty
export function run(H, ph, speed = 1, kick = 0) {
  rest(H);
  const a = 0.55 * speed + 0.2;
  H.hips.position.y = 0.97 + Math.abs(Math.sin(ph)) * 0.05 * speed;
  H.hips.rotation.y = Math.sin(ph) * 0.15;
  H.spine.rotation.x = 0.12 + speed * 0.12;
  H.spine.rotation.y = -Math.sin(ph) * 0.22;
  H.neck.rotation.x = -0.05 - speed * 0.1;
  const kk = Math.sin(kick * Math.PI);
  H.lL.hp.rotation.x = Math.sin(ph) * a - kk * 1.2 + (kick > 0.5 ? kk * 0.4 : 0);
  H.lR.hp.rotation.x = -Math.sin(ph) * a;
  H.lL.kn.rotation.x = Math.max(0, -Math.cos(ph)) * (1.3 * speed) + (kick < 0.5 ? kk * 1.4 : 0);
  H.lR.kn.rotation.x = Math.max(0, Math.cos(ph)) * (1.3 * speed);
  H.aL.sh.rotation.set(-Math.sin(ph) * a * 0.9, 0, 0.12 + kk * 0.5);
  H.aR.sh.rotation.set(Math.sin(ph) * a * 0.9, 0, -0.12 - kk * 0.5);
  H.aL.el.rotation.x = -1.2;
  H.aR.el.rotation.x = -1.2;
}
export function walk(H, ph) {
  rest(H);
  H.hips.position.y = 0.98 + Math.abs(Math.cos(ph)) * 0.015;
  H.hips.rotation.y = Math.sin(ph) * 0.08;
  H.spine.rotation.y = -Math.sin(ph) * 0.06;
  H.lL.hp.rotation.x = Math.sin(ph) * 0.42;
  H.lR.hp.rotation.x = -Math.sin(ph) * 0.42;
  H.lL.kn.rotation.x = Math.max(0, -Math.cos(ph)) * 0.6 + 0.05;
  H.lR.kn.rotation.x = Math.max(0, Math.cos(ph)) * 0.6 + 0.05;
  H.aL.sh.rotation.set(-Math.sin(ph) * 0.35, 0, 0.07);
  H.aR.sh.rotation.set(Math.sin(ph) * 0.35, 0, -0.07);
  H.aL.el.rotation.x = -0.25;
  H.aR.el.rotation.x = -0.25;
}
// fanúšik v skyboxe: tlieskanie / zdvihnuté ruky
export function cheer(H, t, k, mode = 0) {
  rest(H);
  if (mode === 0) {
    const c = Math.abs(Math.sin(t * 7 + k));
    H.aL.sh.rotation.set(-1.25, -0.5 + c * 0.25, 0.3);
    H.aR.sh.rotation.set(-1.25, 0.5 - c * 0.25, -0.3);
    H.aL.el.rotation.x = -1.2;
    H.aR.el.rotation.x = -1.2;
    H.neck.rotation.x = 0.05;
  } else {
    const up = 0.5 + 0.5 * Math.sin(t * 5 + k);
    H.hips.position.y = 0.98 + up * 0.08;
    H.aL.sh.rotation.set(-2.8 - up * 0.2, 0, 0.3);
    H.aR.sh.rotation.set(-2.8 - up * 0.2, 0, -0.3);
    H.aL.el.rotation.x = -0.25;
    H.aR.el.rotation.x = -0.25;
    H.neck.rotation.x = -0.25;
  }
}
export function sit(H, t, k) {
  rest(H);
  H.hips.position.y = 0.5;
  H.lL.hp.rotation.x = -1.5;
  H.lR.hp.rotation.x = -1.5;
  H.lL.kn.rotation.x = 1.5;
  H.lR.kn.rotation.x = 1.5;
  H.spine.rotation.x = -0.08;
  H.aR.sh.rotation.set(-0.7 - Math.max(0, Math.sin(t * 0.6 + k)) * 0.9, 0, -0.1);
  H.aR.el.rotation.x = -1.6;
  H.aL.sh.rotation.set(-0.35, 0, 0.1);
  H.aL.el.rotation.x = -0.9;
  H.head.rotation.y = Math.sin(t * 0.4 + k) * 0.4;
}
// drep s činkou na pleciach
export function squat(H, t) {
  rest(H);
  const d = 0.5 - 0.5 * Math.cos(t * 2.2);
  H.hips.position.y = 0.98 - d * 0.42;
  H.hips.position.z = -d * 0.12;
  H.spine.rotation.x = 0.1 + d * 0.5;
  H.neck.rotation.x = -d * 0.45;
  for (const [l, s] of [
    [H.lL, 1],
    [H.lR, -1],
  ]) {
    l.hp.rotation.set(-d * 1.35, 0, s * (0.12 + d * 0.12));
    l.kn.rotation.x = d * 2.0;
    l.an.rotation.x = -d * 0.55;
  }
  H.aL.sh.rotation.set(-0.4, 0, 1.75);
  H.aR.sh.rotation.set(-0.4, 0, -1.75);
  H.aL.el.rotation.set(-1.9, 0, 0);
  H.aR.el.rotation.set(-1.9, 0, 0);
  return d;
}
export function curl(H, t) {
  rest(H);
  const a = 0.5 - 0.5 * Math.cos(t * 2.6);
  const b = 0.5 - 0.5 * Math.cos(t * 2.6 + Math.PI);
  H.aL.el.rotation.x = -0.2 - a * 2.1;
  H.aR.el.rotation.x = -0.2 - b * 2.1;
  H.aL.sh.rotation.set(-0.1, 0, 0.1);
  H.aR.sh.rotation.set(-0.1, 0, -0.1);
  H.spine.rotation.x = 0.03;
  return [a, b];
}
export function wipe(H, t) {
  rest(H);
  H.spine.rotation.x = 0.25;
  H.aR.sh.rotation.set(-0.9, Math.sin(t * 3) * 0.5, -0.2);
  H.aR.el.rotation.x = -0.8;
  H.aL.sh.rotation.set(-0.5, 0, 0.15);
  H.aL.el.rotation.x = -1.0;
  H.head.rotation.y = Math.sin(t * 0.7) * 0.3;
}

// ============ IK: ruky na hokejke ============
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _q = new THREE.Quaternion();
const DOWN = new THREE.Vector3(0, -1, 0);
const L1 = 0.29;
const L2 = 0.31;
// natočí rameno a lakeť tak, aby ruka siahla na bod (svetové súradnice); pole = smer lakťa (lokálne)
function reach(H, a, target, side) {
  const parent = a.sh.parent;
  _v.copy(target);
  parent.worldToLocal(_v);
  _v.sub(a.sh.position);
  let d = _v.length();
  d = Math.min(Math.max(d, 0.12), L1 + L2 - 0.005);
  const dir = _v.normalize();
  const alpha = Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const beta = Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2))));
  _q.setFromUnitVectors(DOWN, dir);
  a.sh.quaternion.copy(_q);
  // lakeť do strany a mierne dole: otočenie okolo osi ramena
  a.sh.rotateY(side * 0.9);
  a.sh.rotateX(alpha);
  a.el.rotation.set(-(Math.PI - beta), 0, 0);
}
// blade: bod na ľade (lokálne k postave), grip: kde chce byť horná ruka (lokálne)
export function holdStick(H, blade, grip, twist = 0) {
  if (!H.stick) return;
  H.root.updateMatrixWorld(true);
  const b = H.root.localToWorld(_w.set(blade[0], blade[1], blade[2]).clone());
  const g = H.root.localToWorld(new THREE.Vector3(grip[0], grip[1], grip[2]));
  const dir = g.clone().sub(b).normalize();
  const top = b.clone().addScaledVector(dir, 1.42);
  // hokejka: horný koniec v „top“, os −Y smeruje k listu
  const inv = new THREE.Quaternion();
  H.root.getWorldQuaternion(inv).invert();
  const local = H.root.worldToLocal(top.clone());
  H.stick.position.copy(local).divideScalar(1);
  const dl = dir.clone().negate().applyQuaternion(inv);
  H.stick.quaternion.setFromUnitVectors(DOWN, dl);
  H.stick.rotateY(twist);
  const lower = top.clone().addScaledVector(dir, -0.5);
  reach(H, H.aR, top, -1);
  reach(H, H.aL, lower, 1);
}
