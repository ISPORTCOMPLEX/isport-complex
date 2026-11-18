// @ts-nocheck – 3D stavba (three.js), typovú kontrolu robí scene.ts na rozhraní
// Areál: hala 1 (ľad, tribúna, striedačky, rolba, bufet, skybox), ihrisko, hala 2 (posilňovňa, wellness), okolie.
// Rez: predná stena a predná časť strechy chýbajú – geometria je už odrezaná (žiadne clipping planes = rýchlejšie, AO funguje).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TX from './tex';

const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...o });
export const CUT = 5; // z, kde je rez (všetko s z > CUT chýba)

export function build(S, q) {
  const W = { far: [], trees: [], anim: [], lamps: [], night: [], dayOnly: [], spots: [], beams: [], windows: [], heads: [] };
  const add = (geo, mat, x, y, z, parent = S, o = {}) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = o.cast ?? true;
    m.receiveShadow = o.recv ?? true;
    if (o.rx) m.rotation.x = o.rx;
    if (o.ry) m.rotation.y = o.ry;
    if (o.rz) m.rotation.z = o.rz;
    parent.add(m);
    return m;
  };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const rbox = (w, h, d, r = 0.05) => new RoundedBoxGeometry(w, h, d, 3, r);
  const autumn = q.month >= 9 && q.month <= 10;
  const winter = q.month === 11 || q.month <= 1;

  // ================= okolie =================
  const grass = add(new THREE.PlaneGeometry(900, 900), std(0xffffff, { map: TX.grassTex([120, 120], autumn), roughness: 0.95 }), 0, -0.02, 0, S, { rx: -Math.PI / 2, cast: false });
  W.grass = grass;
  const asph = TX.asphaltTex([30, 3]);
  const road = add(new THREE.PlaneGeometry(400, 12), std(0xffffff, { map: asph, roughness: 0.9 }), 10, 0.0, 40, S, { rx: -Math.PI / 2, cast: false });
  W.road = road;
  road.material.userData.clay = 0x7f8a95;
  const lineMat = std(0xe8e8e8, { roughness: 0.6 });
  const dashes = [];
  for (let x = -180; x < 200; x += 8) dashes.push(new THREE.BoxGeometry(3.5, 0.02, 0.18).translate(x, 0.02, 40));
  W.dashes = add(mergeGeometries(dashes), lineMat, 0, 0, 0, S, { cast: false });
  // chodník a parkovisko
  const pave = std(0xffffff, { map: TX.pavingTex([40, 4]), roughness: 0.85 });
  W.walk = add(new THREE.PlaneGeometry(200, 6), pave, 12, 0.01, 31, S, { rx: -Math.PI / 2, cast: false });
  const lot = std(0xffffff, { userData: { clay: 0xaab3bc }, map: TX.asphaltTex([16, 3]), roughness: 0.9 });
  add(new THREE.PlaneGeometry(140, 12), lot, 12, 0.012, 22, S, { rx: -Math.PI / 2, cast: false });
  const stalls = [];
  for (let x = -55; x <= 78; x += 2.8) if (x < 15 || x > 44) stalls.push(new THREE.BoxGeometry(0.12, 0.02, 5).translate(x, 0.025, 24.5));
  add(mergeGeometries(stalls), lineMat, 0, 0, 0, S, { cast: false });
  // plocha okolo hál
  add(new THREE.PlaneGeometry(140, 40), std(0xffffff, { map: TX.pavingTex([30, 9]), roughness: 0.85 }), 12, 0.008, 0, S, { rx: -Math.PI / 2, cast: false });

  // autá
  const carCols = [0xb8bec6, 0x1b1f26, 0x8a1c22, 0xf2f4f6, 0x2a4a7a, 0x4a4f57, 0xc9a24a];
  const carSpots = [-52.2, -46.6, -41, -32.6, -24.2, -13, -4.6, 3.8, 49.2, 54.8, 63.2, 71.6];
  carSpots.forEach((x, i) => {
    const c = car(carCols[i % carCols.length]);
    c.position.set(x + 1.4, 0, 24.3 + (i % 2) * 0.2);
    c.rotation.y = (i % 3 === 0 ? 0 : Math.PI) + Math.PI / 2;
    S.add(c);
    W.heads.push(...c.userData.lights);
  });
  // pouličné lampy
  for (let x = -60; x <= 90; x += 18) {
    const p = new THREE.Group();
    add(new THREE.CylinderGeometry(0.08, 0.12, 7, 10), std(0x3a4048, { metalness: 0.6, roughness: 0.4 }), 0, 3.5, 0, p);
    add(new THREE.BoxGeometry(0.12, 0.12, 1.6), std(0x3a4048, { metalness: 0.6 }), 0, 6.95, -0.75, p);
    const head = add(rbox(0.5, 0.12, 0.9, 0.04), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffd9a0, emissiveIntensity: 0 }), 0, 6.85, -1.4, p, { cast: false });
    W.lamps.push({ m: head.material, on: 3 });
    p.position.set(x, 0, 34);
    S.add(p);
    if ((x + 60) % 36 === 0) {
      const l = new THREE.PointLight(0xffc98a, 0, 18, 1.6);
      l.position.set(x, 6.5, 32.6);
      S.add(l);
      W.night.push({ l, on: 60 });
    }
  }

  // stromy (jeseň = farebné, zima = holé)
  const leafCols = winter ? [] : autumn ? [0xc9852b, 0xa8641f, 0xd4a23a, 0x7d8a3a] : [0x2f6b3a, 0x3c7a3f, 0x2a5e35];
  const trunkMat = std(0x4a3626, { roughness: 0.9 });
  const tr = TX.rng(5);
  const treeAt = [
    [-62, 14], [-56, 18], [-48, 12], [-66, -6], [-62, -22], [-40, -28], [-20, -30], [0, -29], [24, -26], [44, -24], [80, -20], [86, 0], [84, 14], [-30, 30], [-6, 30.5], [20, 30.5], [52, 30.5], [74, 30.5],
  ];
  for (const [x, z] of treeAt) {
    const s = 0.8 + tr() * 0.6;
    const t = new THREE.Group();
    add(new THREE.CylinderGeometry(0.12 * s, 0.22 * s, 3.2 * s, 8), trunkMat, 0, 1.6 * s, 0, t);
    if (leafCols.length) {
      for (let i = 0; i < 6; i++) {
        const g = new THREE.IcosahedronGeometry((0.9 + tr() * 0.9) * s, 2);
        const p = g.attributes.position;
        for (let k = 0; k < p.count; k++) p.setXYZ(k, p.getX(k) * (1 + (tr() - 0.5) * 0.25), p.getY(k) * (1 + (tr() - 0.5) * 0.25), p.getZ(k) * (1 + (tr() - 0.5) * 0.25));
        g.computeVertexNormals();
        add(g, std(leafCols[i % leafCols.length], { roughness: 0.95, flatShading: true }), (tr() - 0.5) * 2 * s, (3.4 + tr() * 1.6) * s, (tr() - 0.5) * 2 * s, t);
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const br = add(new THREE.CylinderGeometry(0.03 * s, 0.07 * s, 1.8 * s, 5), trunkMat, 0, 3 * s, 0, t);
        br.rotation.set((tr() - 0.5) * 1.4, tr() * 6, (tr() - 0.5) * 1.4);
        br.position.y = (2.6 + tr()) * s;
      }
    }
    t.position.set(x, 0, z);
    S.add(t);
    W.trees.push(t);
  }

  // mesto v diaľke (Košice) a dóm
  const cityMat = std(0x7d8a99, { roughness: 0.9 });
  const cityWin = new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0 });
  W.cityMat = cityMat;
  W.cityWin = cityWin;
  const cr = TX.rng(9);
  const blocks = [];
  const wins = [];
  for (let i = 0; i < 70; i++) {
    const w = 14 + cr() * 22;
    const h = 12 + cr() * 40;
    const x = -520 + i * 15 + cr() * 6;
    const z = -330 - cr() * 80;
    blocks.push(new THREE.BoxGeometry(w, h, 10).translate(x, h / 2, z));
    for (let k = 0; k < 6; k++) wins.push(new THREE.PlaneGeometry(1.2, 1).translate(x + (cr() - 0.5) * w * 0.8, 2 + cr() * (h - 3), z + 5.05));
  }
  W.far.push(add(mergeGeometries(blocks), cityMat, 0, 0, 0, S, { cast: false, recv: false }));
  W.far.push(add(mergeGeometries(wins), cityWin, 0, 0, 0, S, { cast: false, recv: false }));
  W.far.push(add(new THREE.BoxGeometry(14, 52, 22), cityMat, 40, 26, -360, S, { cast: false }));
  W.far.push(add(new THREE.ConeGeometry(7, 36, 8), cityMat, 40, 70, -352, S, { cast: false }));
  // pás stromov za areálom (zlúčené do jednej geometrie)
  {
    const tg = [];
    const kg = [];
    const br = TX.rng(55);
    for (let i = 0; i < 260; i++) {
      const x = -140 + br() * 300;
      const z = -62 - br() * 110;
      const s = 0.8 + br() * 0.9;
      kg.push(new THREE.CylinderGeometry(0.15 * s, 0.25 * s, 3 * s, 5).translate(x, 1.5 * s, z));
      const c = new THREE.IcosahedronGeometry((1.8 + br() * 1.2) * s, 2);
      c.scale(1, 1.25, 1);
      c.translate(x, (4 + br()) * s, z);
      const col = new THREE.Color(leafCols.length ? leafCols[i % leafCols.length] : 0x5a4a3a).multiplyScalar(0.55 + br() * 0.25);
      const cc = [];
      for (let k = 0; k < c.attributes.position.count; k++) cc.push(col.r, col.g, col.b);
      c.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3));
      c.deleteAttribute('uv');
      tg.push(c.toNonIndexed ? c : c);
    }
    W.far.push(add(mergeGeometries(kg), trunkMat, 0, 0, 0, S, { cast: false }));
    W.far.push(add(mergeGeometries(tg.map((g) => (g.index ? g.toNonIndexed() : g))), std(0xffffff, { vertexColors: true, flatShading: true, roughness: 0.95 }), 0, 0, 0, S, { cast: false }));
  }

  // ================= HALA 1 =================
  const H1 = new THREE.Group();
  S.add(H1);
  W.H1 = H1;
  const X0 = -44;
  const X1 = 16;
  const LEN = X1 - X0;
  const facade = TX.panels('#262c35', [LEN / 1.2, 1]);
  const wallMat = std(0xffffff, { map: facade.map, bumpMap: facade.bump, bumpScale: 0.6, metalness: 0.35, roughness: 0.55 });
  const innerMat = std(0x7b838d, { roughness: 0.85 });
  // klenba: kružnica cez (±18, 9) s vrcholom 17
  const Rr = 24.25;
  const yc = -7.25;
  const thA = -Math.asin(18 / Rr);
  const thB = Math.asin(CUT / Rr);
  const arcPt = (th, r) => new THREE.Vector2(-(r * Math.sin(th)), yc + r * Math.cos(th)); // (u = −z, y)
  const shape = new THREE.Shape();
  const N = 48;
  for (let i = 0; i <= N; i++) {
    const p = arcPt(thA + ((thB - thA) * i) / N, Rr + 0.35);
    i ? shape.lineTo(p.x, p.y) : shape.moveTo(p.x, p.y);
  }
  for (let i = N; i >= 0; i--) {
    const p = arcPt(thA + ((thB - thA) * i) / N, Rr);
    shape.lineTo(p.x, p.y);
  }
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: LEN, bevelEnabled: false, curveSegments: 1 });
  roofGeo.rotateY(Math.PI / 2);
  roofGeo.translate(X0, 0, 0);
  // UV pre plech: pozdĺž oblúka
  const sheet = TX.roofSheet([1.1, 1.1]);
  sheet.map.rotation = sheet.bump.rotation = Math.PI / 2;
  const roofMat = std(0xffffff, { userData: { clay: 0xc3cad2 }, map: sheet.map, bumpMap: sheet.bump, bumpScale: 1.2, metalness: 0.55, roughness: 0.42 });
  add(roofGeo, [roofMat, roofMat], 0, 0, 0, H1);
  // spodok strechy (interiér) – svetlé podhľady
  const under = new THREE.Shape();
  for (let i = 0; i <= N; i++) {
    const p = arcPt(thA + ((thB - thA) * i) / N, Rr - 0.02);
    i ? under.lineTo(p.x, p.y) : under.moveTo(p.x, p.y);
  }
  for (let i = N; i >= 0; i--) {
    const p = arcPt(thA + ((thB - thA) * i) / N, Rr - 0.05);
    under.lineTo(p.x, p.y);
  }
  const ug = new THREE.ExtrudeGeometry(under, { depth: LEN - 0.6, bevelEnabled: false });
  ug.rotateY(Math.PI / 2);
  ug.translate(X0 + 0.3, 0, 0);
  add(ug, std(0x9aa4b0, { roughness: 0.9 }), 0, 0, 0, H1, { cast: false });
  // červená hrana rezu strechy
  const cutY = yc + Rr * Math.cos(thB);
  add(box(LEN + 0.4, 0.38, 0.12), new THREE.MeshStandardMaterial({ color: 0xe30613, emissive: 0xe30613, emissiveIntensity: 0.25 }), X0 + LEN / 2, cutY + 0.18, CUT + 0.02, H1, { cast: false });
  // zadná stena a štíty
  add(box(LEN, 9, 0.4), wallMat, X0 + LEN / 2, 4.5, -18, H1);
  const gable = new THREE.Shape();
  gable.moveTo(18, 0);
  gable.lineTo(18, 9);
  for (let i = 0; i <= N; i++) {
    const p = arcPt(thA + ((thB - thA) * i) / N, Rr);
    gable.lineTo(p.x, p.y);
  }
  gable.lineTo(-CUT, 0);
  gable.lineTo(18, 0);
  for (const x of [X0, X1 - 0.4]) {
    const g = new THREE.ExtrudeGeometry(gable, { depth: 0.4, bevelEnabled: false });
    g.rotateY(Math.PI / 2);
    g.translate(x, 0, 0);
    const pm = TX.panels('#262c35', [16, 1]);
    pm.map.repeat.set(0.42, 0.1);
    pm.bump.repeat.set(0.42, 0.1);
    add(g, std(0xffffff, { map: pm.map, bumpMap: pm.bump, bumpScale: 0.6, metalness: 0.35, roughness: 0.55 }), 0, 0, 0, H1);
  }
  // vnútorné obklady stien
  add(box(LEN - 1, 8.6, 0.1), innerMat, X0 + LEN / 2, 4.3, -17.75, H1, { cast: false });
  // veľká grafika na zadnej stene a pás svetlíkov
  const banner = TX.canvas(2048, 256, (g) => {
    g.fillStyle = '#0b0e12';
    g.fillRect(0, 0, 2048, 256);
    g.fillStyle = '#e30613';
    g.fillRect(0, 0, 2048, 10);
    g.fillRect(0, 246, 2048, 10);
    g.fillStyle = '#ffffff';
    g.font = `900 italic 150px ${TX.FONT}`;
    g.textAlign = 'center';
    g.fillText('TVOJ ĽAD. TVOJ ČAS.', 1024, 180);
  });
  add(new THREE.PlaneGeometry(30, 3.75), new THREE.MeshStandardMaterial({ userData: { keep: true }, map: banner, roughness: 0.6 }), -18, 6.2, -17.68, H1, { cast: false });
  add(box(LEN - 2, 0.9, 0.05), new THREE.MeshStandardMaterial({ color: 0xdfeaf2, emissive: 0xcfe3f2, emissiveIntensity: 0.8 }), X0 + LEN / 2, 8.4, -17.7, H1, { cast: false });
  // oceľové priehradové oblúky
  const steel = std(0x5e6874, { metalness: 0.7, roughness: 0.35 });
  const trussGeos = [];
  for (let x = X0 + 4; x <= X1 - 3; x += 6) {
    const pts1 = [];
    const pts2 = [];
    const M = 24;
    for (let i = 0; i <= M; i++) {
      const th = thA + ((thB - thA) * i) / M;
      const p1 = arcPt(th, Rr - 0.25);
      const p2 = arcPt(th, Rr - 1.2);
      pts1.push(new THREE.Vector3(x, p1.y, -p1.x));
      pts2.push(new THREE.Vector3(x, p2.y, -p2.x));
    }
    trussGeos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts1), 40, 0.09, 6));
    trussGeos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts2), 40, 0.09, 6));
    for (let i = 0; i < M; i++) {
      const a = i % 2 ? pts1[i] : pts2[i];
      const b = i % 2 ? pts2[i + 1] : pts1[i + 1];
      const d = b.clone().sub(a);
      const g = new THREE.CylinderGeometry(0.04, 0.04, d.length(), 5);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
      g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      trussGeos.push(g);
    }
  }
  add(mergeGeometries(trussGeos), steel, 0, 0, 0, H1, { cast: false });

  // podlaha haly (gumená)
  add(new THREE.PlaneGeometry(LEN - 0.8, 18 + CUT), std(0xffffff, { map: TX.rubberTex([30, 12]), roughness: 0.9 }), X0 + LEN / 2, 0.02, (CUT - 18) / 2, H1, { rx: -Math.PI / 2, cast: false });

  // ---------- ľadová plocha ----------
  const RW = 40;
  const RD = 20;
  const RR = 6;
  const RX = -18;
  const RZ = -4.5;
  const rink = new THREE.Shape();
  rink.moveTo(-RW / 2 + RR, -RD / 2);
  rink.lineTo(RW / 2 - RR, -RD / 2);
  rink.absarc(RW / 2 - RR, -RD / 2 + RR, RR, -Math.PI / 2, 0, false);
  rink.lineTo(RW / 2, RD / 2 - RR);
  rink.absarc(RW / 2 - RR, RD / 2 - RR, RR, 0, Math.PI / 2, false);
  rink.lineTo(-RW / 2 + RR, RD / 2);
  rink.absarc(-RW / 2 + RR, RD / 2 - RR, RR, Math.PI / 2, Math.PI, false);
  rink.lineTo(-RW / 2, -RD / 2 + RR);
  rink.absarc(-RW / 2 + RR, -RD / 2 + RR, RR, Math.PI, Math.PI * 1.5, false);
  const iceGeo = new THREE.ShapeGeometry(rink, 24);
  // UV z rozmerov (0–1)
  const uv = iceGeo.attributes.uv;
  const pos = iceGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + RW / 2) / RW, (pos.getY(i) + RD / 2) / RD);
  const iceMap = TX.iceTex(RW, RD);
  iceMap.anisotropy = 16;
  iceMap.wrapS = iceMap.wrapT = THREE.ClampToEdgeWrapping;
  iceMap.flipY = true;
  const iceMat = new THREE.MeshPhysicalMaterial({ map: iceMap, roughness: 0.16, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.1 });
  W.iceMat = iceMat;
  const ice = add(iceGeo, iceMat, RX, 0.12, RZ, H1, { rx: -Math.PI / 2, cast: false });
  W.ice = ice;
  W.rink = { RX, RZ, RW, RD, RR, shape: rink };
  // mantinely: súvislý pás s reklamami po obvode
  const per = rink.getSpacedPoints(220);
  const ribbon = (pts, y0, y1, off, mat, uScale, flip = false) => {
    const v = [];
    const u = [];
    const idx = [];
    let dist = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      const pr = pts[(i - 1 + pts.length) % pts.length];
      const t = new THREE.Vector2(p2.x - pr.x, p2.y - pr.y).normalize();
      const n = new THREE.Vector2(t.y, -t.x);
      const x = RX + p.x + n.x * off;
      const z = RZ - (p.y + n.y * off);
      v.push(x, y0, z, x, y1, z);
      if (i) dist += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y);
      const uu = flip ? 1 - dist / uScale : dist / uScale;
      u.push(uu, 0, uu, 1);
      if (i < pts.length - 1) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return add(g, mat, 0, 0, 0, H1, { cast: false });
  };
  const perimeter = (() => {
    let d = 0;
    for (let i = 1; i < per.length; i++) d += per[i].distanceTo(per[i - 1]);
    return d;
  })();
  const ads = TX.adsTex(perimeter);
  ribbon(per, 0.12, 1.2, 0.02, new THREE.MeshStandardMaterial({ userData: { keep: true }, map: ads.tex, roughness: 0.45, side: THREE.DoubleSide }), ads.total, true);
  ribbon(per, 0.12, 1.2, 0.22, std(0xf3f5f7, { roughness: 0.5, side: THREE.DoubleSide }), 1);
  // horná lišta
  const railGeo = [];
  for (let i = 0; i < per.length - 1; i++) {
    const a = per[i];
    const b = per[i + 1];
    const l = a.distanceTo(b);
    const g = new THREE.BoxGeometry(l + 0.02, 0.06, 0.26);
    g.rotateY(Math.atan2(b.y - a.y, b.x - a.x));
    g.translate(RX + (a.x + b.x) / 2, 1.22, RZ - (a.y + b.y) / 2);
    railGeo.push(g);
  }
  add(mergeGeometries(railGeo), std(0xf2c230, { roughness: 0.4 }), 0, 0, 0, H1, { cast: false });
  // plexisklo a stĺpiky (vpredu – pri reze – sklo vynechané, aby bolo vidno dnu)
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xdff1ff, transparent: true, opacity: 0.12, roughness: 0.03, metalness: 0, envMapIntensity: 1.4, side: THREE.DoubleSide, depthWrite: false });
  const backPts = per.filter((p) => p.y < RD / 2 - 1.5 || Math.abs(p.x) > RW / 2 - RR);
  // len zadná a bočné strany: y < 2 (zadná polovica)
  const glassPts = per.filter((p) => p.y < 1.5);
  ribbon(glassPts, 1.25, 3.0, 0.1, glassMat, 1);
  const posts = [];
  glassPts.forEach((p, i) => {
    if (i % 7) return;
    posts.push(new THREE.BoxGeometry(0.06, 1.8, 0.06).translate(RX + p.x, 2.1, RZ - p.y));
  });
  add(mergeGeometries(posts), std(0xc9d1da, { metalness: 0.8, roughness: 0.3 }), 0, 0, 0, H1, { cast: false });
  void backPts;
  // bránky so sieťou
  const net = new THREE.MeshStandardMaterial({ map: TX.meshTex([2, 2], 14, 1.5, '#f4f6f8'), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.8 });
  const red = std(0xe30613, { metalness: 0.4, roughness: 0.3 });
  for (const s of [-1, 1]) {
    const g = new THREE.Group();
    const gx = s * (RW / 2 - 3.4);
    const path = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, -0.92), new THREE.Vector3(0, 1.22, -0.92), new THREE.Vector3(0, 1.22, 0.92), new THREE.Vector3(0, 0, 0.92)], false, 'catmullrom', 0.01);
    add(new THREE.TubeGeometry(path, 30, 0.035, 8), red, 0, 0, 0, g);
    const back = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, -0.92), new THREE.Vector3(s * 0.6, 0.02, -0.85), new THREE.Vector3(s * 1.0, 0.02, 0), new THREE.Vector3(s * 0.6, 0.02, 0.85), new THREE.Vector3(0, 0, 0.92)]);
    add(new THREE.TubeGeometry(back, 30, 0.025, 6), std(0xf3f5f7), 0, 0, 0, g);
    const ng = new THREE.CylinderGeometry(0.95, 0.95, 1.2, 16, 1, true, s > 0 ? 0 : Math.PI, Math.PI);
    ng.scale(0.7, 1, 1);
    add(ng, net, s * 0.05, 0.6, 0, g, { cast: false });
    g.position.set(RX + gx, 0.12, RZ);
    H1.add(g);
  }
  // striedačky a trestné lavice (zadná strana)
  const benchMat = std(0x1b2230, { roughness: 0.6 });
  for (const bx of [-8, 4]) {
    add(box(7, 0.1, 1.6), benchMat, RX + bx, 0.4, RZ - RD / 2 - 1.1, H1);
    add(box(7, 0.45, 0.5), std(0x2b3442), RX + bx, 0.62, RZ - RD / 2 - 1.5, H1);
  }
  // tribúna za striedačkami
  const seatsG = [];
  const stepsG = [];
  for (let r = 0; r < 6; r++) {
    const y = 0.9 + r * 0.42;
    const z = RZ - RD / 2 - 2.6 - r * 0.75;
    stepsG.push(new THREE.BoxGeometry(34, 0.42, 0.75).translate(RX, y - 0.21, z));
    for (let x = -16; x <= 16; x += 0.55) seatsG.push(new RoundedBoxGeometry(0.44, 0.38, 0.42, 2, 0.06).translate(RX + x, y + 0.18, z + 0.05));
  }
  add(mergeGeometries(stepsG), std(0x5b6470, { roughness: 0.9 }), 0, 0, 0, H1);
  const seatGeo = mergeGeometries(seatsG);
  const seatCol = [];
  const sr = TX.rng(3);
  const cRed = new THREE.Color(0xc8101b);
  const cBlk = new THREE.Color(0x1d222a);
  const cnt = seatGeo.attributes.position.count;
  const per1 = cnt / seatsG.length;
  for (let i = 0; i < seatsG.length; i++) {
    const c = (i % 61 > 22 && i % 61 < 38) || sr() < 0.04 ? cBlk : cRed;
    for (let k = 0; k < per1; k++) seatCol.push(c.r, c.g, c.b);
  }
  seatGeo.setAttribute('color', new THREE.Float32BufferAttribute(seatCol, 3));
  add(seatGeo, std(0xffffff, { vertexColors: true, roughness: 0.55 }), 0, 0, 0, H1);

  // svetlá pod strechou + objemové kužele
  const ledMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf2f8ff, emissiveIntensity: 2.2 });
  const ledG = [];
  for (let x = RX - 16; x <= RX + 16; x += 8) for (const z of [RZ - 5, RZ + 5]) ledG.push(new RoundedBoxGeometry(3.4, 0.14, 0.7, 2, 0.04).translate(x, 13.2, z));
  add(mergeGeometries(ledG), ledMat, 0, 0, 0, H1, { cast: false });
  const beamMat = new THREE.MeshBasicMaterial({ map: TX.beamTex(), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, color: 0xdfeeff });
  W.iceBeamMat = beamMat;
  for (let x = RX - 16; x <= RX + 16; x += 8)
    for (const z of [RZ - 5, RZ + 5]) {
      const cg = new THREE.CylinderGeometry(0.6, 4.2, 13, 20, 1, true);
      add(cg, beamMat, x, 6.6, z, H1, { cast: false, recv: false });
    }
  // reálne svetlá: 4 reflektory s tieňmi + mäkké doplnkové
  for (const [x, z] of [
    [RX - 10, RZ - 3],
    [RX + 10, RZ - 3],
    [RX - 10, RZ + 4],
    [RX + 10, RZ + 4],
  ]) {
    const sp = new THREE.SpotLight(0xf2f8ff, 30, 40, 0.95, 0.8, 1.5);
    sp.position.set(x, 13, z);
    sp.target.position.set(x, 0, z);
    sp.castShadow = q.hi;
    sp.shadow.mapSize.set(1024, 1024);
    sp.shadow.bias = -0.0004;
    sp.shadow.radius = 4;
    H1.add(sp, sp.target);
    W.spots.push(sp);
  }
  const fill = new THREE.PointLight(0xdfeeff, 6, 50, 1.2);
  fill.position.set(RX, 11, RZ + 6);
  H1.add(fill);
  // tabuľa nad stredom
  const sb = new THREE.Group();
  const scr = TX.screenTex('2 : 1', '3. tretina  12:48');
  const scrMat = new THREE.MeshStandardMaterial({ map: scr, emissive: 0xffffff, emissiveMap: scr, emissiveIntensity: 1.3, roughness: 0.4 });
  const frame = std(0x0b0e12, { metalness: 0.5, roughness: 0.4 });
  add(box(3.6, 2, 3.6), [frame, frame, frame, frame, scrMat, scrMat], 0, 0, 0, sb, { cast: false });
  const side2 = add(box(3.6, 2, 3.6), [scrMat, scrMat, frame, frame, frame, frame], 0, 0, 0, sb, { cast: false });
  side2.scale.set(1.001, 0.999, 0.999);
  add(new THREE.CylinderGeometry(2.3, 2.3, 0.3, 32), std(0x111418, { metalness: 0.6 }), 0, 1.15, 0, sb, { cast: false });
  add(new THREE.TorusGeometry(2.0, 0.05, 6, 48), new THREE.MeshStandardMaterial({ color: 0xe30613, emissive: 0xe30613, emissiveIntensity: 3 }), 0, -1.08, 0, sb, { rx: Math.PI / 2, cast: false });
  for (const [x, z] of [
    [-1.4, -1.4],
    [1.4, 1.4],
    [-1.4, 1.4],
    [1.4, -1.4],
  ])
    add(new THREE.CylinderGeometry(0.015, 0.015, 3, 4), steel, x, 2.6, z, sb, { cast: false });
  sb.position.set(RX, 10.2, RZ);
  H1.add(sb);
  // dres SLAFKOVSKY 20 (Montreal farby, bez loga) – látka sa jemne vlní
  const jt = TX.canvas(512, 512, (g) => {
    g.clearRect(0, 0, 512, 512);
    g.fillStyle = '#AF1E2D';
    g.beginPath();
    g.moveTo(156, 40);
    g.lineTo(40, 92);
    g.lineTo(0, 240);
    g.lineTo(76, 268);
    g.lineTo(112, 192);
    g.lineTo(112, 500);
    g.lineTo(400, 500);
    g.lineTo(400, 192);
    g.lineTo(436, 268);
    g.lineTo(512, 240);
    g.lineTo(472, 92);
    g.lineTo(356, 40);
    g.quadraticCurveTo(256, 88, 156, 40);
    g.fill();
    g.fillStyle = '#fff';
    g.fillRect(112, 256, 288, 12);
    g.fillRect(112, 336, 288, 12);
    g.fillStyle = '#1D3A8A';
    g.fillRect(112, 268, 288, 68);
    g.fillRect(112, 444, 288, 28);
    g.fillStyle = '#fff';
    g.textAlign = 'center';
    g.font = `900 italic 50px ${TX.FONT}`;
    g.fillText('SLAFKOVSKY', 256, 160, 270);
    g.font = `900 italic 190px ${TX.FONT}`;
    g.lineWidth = 12;
    g.strokeStyle = '#1D3A8A';
    g.strokeText('20', 256, 400);
    g.fillText('20', 256, 400);
  });
  const jg = new THREE.PlaneGeometry(3.6, 3.6, 16, 16);
  const jersey = add(jg, new THREE.MeshStandardMaterial({ map: jt, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide, roughness: 0.85 }), RX + 9, 9.6, RZ - 7.5, H1, { cast: false });
  add(new THREE.CylinderGeometry(0.03, 0.03, 4.2, 6), steel, RX + 9, 11.5, RZ - 7.5, H1, { rz: Math.PI / 2, cast: false });
  W.jersey = { geo: jg, base: Float32Array.from(jg.attributes.position.array) };
  // rolba (rolba na úpravu ľadu) zaparkovaná v rohu
  const zam = new THREE.Group();
  add(rbox(3.4, 1.3, 1.9, 0.25), std(0xf3f5f7, { roughness: 0.35, metalness: 0.1 }), 0, 1.05, 0, zam);
  add(rbox(3.42, 0.25, 1.92, 0.08), red, 0, 0.85, 0, zam);
  add(rbox(1.2, 0.9, 1.6, 0.12), new THREE.MeshPhysicalMaterial({ color: 0x223040, roughness: 0.05, metalness: 0.2, envMapIntensity: 1.5 }), -0.7, 2.05, 0, zam);
  for (const [x, z] of [
    [-1.1, 0.95],
    [1.1, 0.95],
    [-1.1, -0.95],
    [1.1, -0.95],
  ])
    add(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 18), std(0x111316), x, 0.38, z, zam, { rx: Math.PI / 2 });
  const zt = TX.canvas(256, 64, (g) => {
    g.fillStyle = '#f3f5f7';
    g.fillRect(0, 0, 256, 64);
    g.fillStyle = '#e30613';
    g.font = `900 italic 44px ${TX.FONT}`;
    g.textAlign = 'center';
    g.fillText('I-SPORT', 128, 48);
  });
  add(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshStandardMaterial({ map: zt, userData: { keep: true } }), 0.3, 1.25, 0.96, zam, { cast: false });
  zam.position.set(RX - RW / 2 - 1.8, 0, RZ + 4);
  zam.rotation.y = Math.PI / 2;
  H1.add(zam);

  // ---------- prístavba: bufet (prízemie) a skybox (poschodie) ----------
  const AX = 8.5;
  const AW = 8;
  const annex = new THREE.Group();
  H1.add(annex);
  add(box(AW, 0.3, 22), std(0x2a313b, { roughness: 0.6 }), AX + 3, 4.4, -6.5, annex);
  add(new THREE.PlaneGeometry(AW, 22), std(0xffffff, { map: TX.woodTex([6, 16], '#8a5a34'), roughness: 0.6 }), AX + 3, 4.56, -6.5, annex, { rx: -Math.PI / 2, cast: false });
  // sklo skyboxu smerom k ľadu
  add(box(0.06, 3.2, 22), new THREE.MeshPhysicalMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.18, roughness: 0.02, envMapIntensity: 1.5, depthWrite: false }), AX - 1, 6.2, -6.5, annex, { cast: false });
  add(box(0.12, 0.12, 22), steel, AX - 1, 7.85, -6.5, annex, { cast: false });
  add(box(0.12, 1.0, 22), std(0x1b2230), AX - 1, 5.05, -6.5, annex);
  // sedačky a stolíky v skyboxe
  const sofa = std(0x2a2f37, { roughness: 0.85 });
  for (const z of [-14, -9, -4, 1]) {
    add(rbox(1.0, 0.45, 2.4, 0.12), sofa, AX + 1.2, 4.85, z, annex);
    add(rbox(0.3, 0.7, 2.4, 0.1), sofa, AX + 1.75, 5.15, z, annex);
    add(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 20), std(0xd9dde2, { roughness: 0.3 }), AX + 0.1, 5.05, z, annex);
    add(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 8), steel, AX + 0.1, 4.8, z, annex);
  }
  // teplé svetlá (závesné)
  const warmMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffb45a, emissiveIntensity: 3 });
  for (const z of [-14, -9, -4, 1]) {
    add(new THREE.CylinderGeometry(0.22, 0.32, 0.25, 16, 1, true), std(0x111418, { side: THREE.DoubleSide }), AX + 0.6, 7.6, z, annex, { cast: false });
    add(new THREE.SphereGeometry(0.12, 12, 8), warmMat, AX + 0.6, 7.45, z, annex, { cast: false });
    add(new THREE.CylinderGeometry(0.01, 0.01, 1.1, 4), steel, AX + 0.6, 8.3, z, annex, { cast: false });
  }
  const sbl = new THREE.PointLight(0xffb45a, 60, 14, 1.4);
  sbl.position.set(AX + 1, 7, -6);
  annex.add(sbl);
  // bufet
  const counter = std(0x1b2230, { roughness: 0.4 });
  add(rbox(1.1, 1.1, 8, 0.05), counter, AX + 1, 0.6, -2, annex);
  add(box(1.2, 0.06, 8.1), std(0xd9cfc2, { roughness: 0.25 }), AX + 1, 1.18, -2, annex);
  add(box(0.04, 0.06, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xe30613, emissiveIntensity: 3 }), AX + 0.43, 0.12, -2, annex, { cast: false });
  // chladnička a regál
  add(rbox(0.8, 2.1, 1.4, 0.04), std(0x111418, { metalness: 0.5 }), AX + 3.6, 1.05, -5, annex);
  add(box(0.04, 1.8, 1.2), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xcfe8ff, emissiveIntensity: 1.6, transparent: true, opacity: 0.8 }), AX + 3.18, 1.1, -5, annex, { cast: false });
  add(rbox(0.6, 0.6, 0.5, 0.05), std(0x2a2f37, { metalness: 0.6, roughness: 0.3 }), AX + 1, 1.5, -4.6, annex); // kávovar
  // menu tabuľa
  const menu = TX.canvas(512, 256, (g) => {
    g.fillStyle = '#0b0e12';
    g.fillRect(0, 0, 512, 256);
    g.fillStyle = '#e30613';
    g.font = `900 italic 46px ${TX.FONT}`;
    g.fillText('BUFET', 24, 56);
    g.fillStyle = '#fff';
    g.font = `700 26px Arial`;
    ['Káva · čaj', 'Teplá čokoláda', 'Párky · toasty', 'Iontové nápoje'].forEach((t, i) => g.fillText(t, 24, 104 + i * 38));
  });
  add(new THREE.PlaneGeometry(3, 1.5), new THREE.MeshStandardMaterial({ map: menu, emissive: 0xffffff, emissiveMap: menu, emissiveIntensity: 0.9 }), AX + 3.95, 2.8, -1.5, annex, { ry: -Math.PI / 2, cast: false });
  // stolíky a stoličky pred bufetom
  for (const [x, z] of [
    [AX - 3, -9],
    [AX - 3, -5],
    [AX - 3, 1],
  ]) {
    add(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 20), std(0xf2f4f6, { roughness: 0.3 }), x, 1.05, z, annex);
    add(new THREE.CylinderGeometry(0.04, 0.04, 1, 8), steel, x, 0.55, z, annex);
    for (const a of [0, Math.PI]) add(rbox(0.45, 0.06, 0.45, 0.02), std(0xe30613), x + Math.cos(a) * 0.8, 0.7, z + Math.sin(a) * 0.8, annex);
  }
  const bl = new THREE.PointLight(0xffc98a, 30, 14, 1.4);
  bl.position.set(AX + 0.5, 3.5, -2);
  annex.add(bl);
  W.annexX = AX;

  // nápis na streche (svieti v noci)
  const signT = TX.canvas(1024, 192, (g) => {
    g.clearRect(0, 0, 1024, 192);
    g.fillStyle = '#e30613';
    g.textAlign = 'center';
    let fs = 150;
    g.font = `900 italic ${fs}px ${TX.FONT}`;
    while (g.measureText('I-SPORT COMPLEX').width > 990) g.font = `900 italic ${(fs -= 6)}px ${TX.FONT}`;
    g.fillText('I-SPORT COMPLEX', 512, 150);
    g.fillStyle = '#0b1622';
    g.fillRect(320, 168, 384, 14);
  });
  const signMat = new THREE.MeshStandardMaterial({ map: signT, transparent: true, emissive: 0xffffff, emissiveMap: signT, emissiveIntensity: 0.2, roughness: 0.4 });
  W.signMat = signMat;
  const sign = add(new THREE.PlaneGeometry(26, 4.9), signMat, -14, 19.6, -9.5, H1, { cast: false });
  sign.rotation.x = -0.1;
  add(box(22, 0.2, 0.2), steel, -14, 17.3, -9.7, H1);

  // ================= IHRISKO =================
  const PG = new THREE.Group();
  S.add(PG);
  const PX = 30;
  const PWd = 24;
  const PD = 20;
  const turf = TX.turfTex(PWd, PD);
  add(new THREE.PlaneGeometry(PWd + 2, PD + 2), std(0x2a6a35, { roughness: 0.95 }), PX, 0.03, 0, PG, { rx: -Math.PI / 2, cast: false });
  add(new THREE.PlaneGeometry(PWd, PD), std(0xffffff, { userData: { keep: true }, map: turf.map, bumpMap: turf.bump, bumpScale: 1.5, roughness: 0.95 }), PX, 0.05, 0, PG, { rx: -Math.PI / 2, cast: false });
  W.pitch = { PX, PWd, PD };
  // plot (vzadu a po bokoch vysoký, vpredu nízky)
  const fenceTex = TX.meshTex([1, 1], 10, 1.2, '#c9d1d8');
  const fence = (len, h, x, z, ry) => {
    const t = fenceTex.clone();
    t.repeat.set(len / 1.2, h / 1.2);
    t.needsUpdate = true;
    add(new THREE.PlaneGeometry(len, h), new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.25, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.4 }), x, h / 2, z, PG, { ry, cast: false });
  };
  fence(PWd + 2, 4, PX, -PD / 2 - 1, 0);
  fence(PD + 2, 4, PX - PWd / 2 - 1, 0, Math.PI / 2);
  fence(PD + 2, 4, PX + PWd / 2 + 1, 0, Math.PI / 2);
  fence(PWd + 2, 1.1, PX, PD / 2 + 1, 0);
  const postsP = [];
  for (let x = -PWd / 2 - 1; x <= PWd / 2 + 1; x += 2.6) {
    postsP.push(new THREE.CylinderGeometry(0.05, 0.05, 4, 6).translate(PX + x, 2, -PD / 2 - 1));
    postsP.push(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 6).translate(PX + x, 0.55, PD / 2 + 1));
  }
  for (let z = -PD / 2 - 1; z <= PD / 2 + 1; z += 2.6) for (const s of [-1, 1]) postsP.push(new THREE.CylinderGeometry(0.05, 0.05, 4, 6).translate(PX + s * (PWd / 2 + 1), 2, z));
  add(mergeGeometries(postsP), std(0x3a424c, { metalness: 0.7, roughness: 0.35 }), 0, 0, 0, PG);
  // bránky
  const white = std(0xf6f7f8, { roughness: 0.35 });
  for (const s of [-1, 1]) {
    const g = new THREE.Group();
    const path = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, -2.5), new THREE.Vector3(0, 2, -2.5), new THREE.Vector3(0, 2, 2.5), new THREE.Vector3(0, 0, 2.5)], false, 'catmullrom', 0.01);
    add(new THREE.TubeGeometry(path, 30, 0.06, 8), white, 0, 0, 0, g);
    const ng = new THREE.BoxGeometry(1.2, 2, 5);
    const nm = new THREE.MeshStandardMaterial({ map: TX.meshTex([4, 4], 12, 1.2, '#ffffff'), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
    add(ng, nm, s * 0.6, 1, 0, g, { cast: false });
    g.position.set(PX + s * (PWd / 2 - 0.5), 0.05, 0);
    PG.add(g);
  }
  // stožiare s LED reflektormi
  W.flood = [];
  for (const [x, z] of [
    [PX - PWd / 2 - 1.6, -PD / 2 - 1.6],
    [PX + PWd / 2 + 1.6, -PD / 2 - 1.6],
    [PX - PWd / 2 - 1.6, PD / 2 + 1.6],
    [PX + PWd / 2 + 1.6, PD / 2 + 1.6],
  ]) {
    add(new THREE.CylinderGeometry(0.14, 0.24, 16, 10), std(0x5a6470, { metalness: 0.6, roughness: 0.35 }), x, 8, z, PG);
    const hd = new THREE.Group();
    add(box(2.4, 0.15, 0.15), steel, 0, 0, 0, hd);
    const led = new THREE.MeshStandardMaterial({ color: 0x222831, emissive: 0xfff3d6, emissiveIntensity: 0 });
    for (const dx of [-0.8, 0, 0.8]) add(rbox(0.7, 0.5, 0.18, 0.04), led, dx, -0.3, 0.1, hd, { cast: false });
    hd.position.set(x, 16.2, z);
    hd.lookAt(PX, 0, 0);
    PG.add(hd);
    W.lamps.push({ m: led, on: 5, night: true });
    const sp = new THREE.SpotLight(0xfff3d6, 0, 70, 0.62, 0.6, 1.4);
    sp.position.set(x, 16, z);
    sp.target.position.set(PX, 0, 0);
    sp.castShadow = q.hi;
    sp.shadow.mapSize.set(1024, 1024);
    PG.add(sp, sp.target);
    W.flood.push(sp);
    // objemový lúč
    const len = new THREE.Vector3(x, 16, z).distanceTo(new THREE.Vector3(PX, 0, 0));
    const cg = new THREE.CylinderGeometry(0.4, 9, len, 24, 1, true);
    cg.translate(0, -len / 2, 0);
    const beam = add(cg, new THREE.MeshBasicMaterial({ map: TX.beamTex(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, color: 0xfff1cf }), x, 16, z, PG, { cast: false, recv: false });
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(PX - x, -16, -z).normalize());
    W.beams.push(beam.material);
  }
  // prístrešky pre striedajúcich
  for (const s of [-1, 1]) {
    const g = new THREE.Group();
    add(rbox(4, 0.08, 1.4, 0.03), new THREE.MeshPhysicalMaterial({ color: 0xcfe0ee, transparent: true, opacity: 0.3, roughness: 0.05 }), 0, 2.2, 0, g, { cast: false });
    add(box(4, 2.2, 0.06), new THREE.MeshPhysicalMaterial({ color: 0xcfe0ee, transparent: true, opacity: 0.25, roughness: 0.05 }), 0, 1.1, -0.68, g, { cast: false });
    add(rbox(3.6, 0.45, 0.5, 0.05), std(0xe30613), 0, 0.45, -0.3, g);
    g.position.set(PX + s * 5, 0, -PD / 2 - 2.2);
    PG.add(g);
  }

  // ================= HALA 2 =================
  const H2 = new THREE.Group();
  S.add(H2);
  const HX = 58;
  const HW = 24;
  const HD = 24;
  const hz0 = -14;
  const f2 = TX.panels('#30363f', [HW / 1.2, 1]);
  const h2wall = std(0xffffff, { map: f2.map, bumpMap: f2.bump, bumpScale: 0.6, metalness: 0.35, roughness: 0.55 });
  add(box(HW, 11, 0.4), h2wall, HX, 5.5, hz0, H2);
  const sideLen = CUT - hz0;
  const f3 = TX.panels('#30363f', [sideLen / 1.2, 1]);
  const h2side = std(0xffffff, { map: f3.map, bumpMap: f3.bump, bumpScale: 0.6, metalness: 0.35, roughness: 0.55 });
  for (const s of [-1, 1]) add(box(0.4, 11, sideLen), h2side, HX + (s * HW) / 2, 5.5, hz0 + sideLen / 2, H2);
  add(box(HW + 0.6, 0.7, sideLen + 0.3), std(0x5f6873, { metalness: 0.5, roughness: 0.45 }), HX, 11.2, hz0 + sideLen / 2 - 0.15, H2);
  add(box(HW + 0.8, 0.36, 0.14), new THREE.MeshStandardMaterial({ color: 0xe30613, emissive: 0xe30613, emissiveIntensity: 0.25 }), HX, 11.2, CUT + 0.02, H2, { cast: false });
  add(box(0.5, 11, 0.5), std(0xe30613, { emissive: 0x400000 }), HX - HW / 2, 5.5, CUT, H2);
  // medzipodlaha
  add(box(HW - 0.4, 0.4, sideLen - 0.2), std(0x2a313b), HX, 5.4, hz0 + sideLen / 2, H2);
  add(new THREE.PlaneGeometry(HW - 0.6, sideLen - 0.4), std(0xffffff, { map: TX.rubberTex([12, 10]), roughness: 0.92 }), HX, 5.61, hz0 + sideLen / 2, H2, { rx: -Math.PI / 2, cast: false });
  add(new THREE.PlaneGeometry(HW - 0.6, sideLen - 0.4), std(0xffffff, { map: TX.tilesTex([10, 8], '#8f877e', '#6f6860', 64), roughness: 0.35 }), HX, 0.03, hz0 + sideLen / 2, H2, { rx: -Math.PI / 2, cast: false });
  // zrkadlová stena v posilňovni
  add(new THREE.PlaneGeometry(HW - 2, 3), new THREE.MeshStandardMaterial({ color: 0xd9e2ea, metalness: 1, roughness: 0.04, envMapIntensity: 1.6 }), HX, 7.3, hz0 + 0.25, H2, { cast: false });
  // LED pásy v strope
  const strip = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeef6ff, emissiveIntensity: 2 });
  for (const z of [-11, -6, -1, 3]) {
    add(box(HW - 3, 0.06, 0.14), strip, HX, 10.75, z, H2, { cast: false });
    add(box(HW - 3, 0.06, 0.14), strip, HX, 5.15, z, H2, { cast: false });
  }
  const gl = new THREE.PointLight(0xeef6ff, 14, 26, 1.3);
  gl.position.set(HX, 10, -4);
  H2.add(gl);
  // drepovací stojan s činkou
  const metal = std(0x2a2f37, { metalness: 0.7, roughness: 0.3 });
  const rack = new THREE.Group();
  for (const [x, z] of [
    [-1, -0.6],
    [1, -0.6],
    [-1, 0.6],
    [1, 0.6],
  ])
    add(box(0.08, 2.4, 0.08), metal, x, 1.2, z, rack);
  add(box(2.1, 0.08, 0.08), metal, 0, 2.4, -0.6, rack);
  add(box(2.1, 0.08, 0.08), metal, 0, 2.4, 0.6, rack);
  rack.position.set(HX - 7, 5.6, -8);
  H2.add(rack);
  const bar = new THREE.Group();
  add(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 10), std(0xc9d1da, { metalness: 1, roughness: 0.2 }), 0, 0, 0, bar, { rz: Math.PI / 2 });
  for (const s of [-1, 1]) {
    add(new THREE.CylinderGeometry(0.42, 0.42, 0.09, 24), std(0x111316, { roughness: 0.5 }), s * 0.82, 0, 0, bar, { rz: Math.PI / 2 });
    add(new THREE.CylinderGeometry(0.3, 0.3, 0.07, 24), std(0xe30613, { roughness: 0.5 }), s * 0.92, 0, 0, bar, { rz: Math.PI / 2 });
  }
  H2.add(bar);
  W.bar = bar;
  W.rackX = HX - 7;
  // stojan s jednoručkami
  const dbG = [];
  for (let i = 0; i < 10; i++) {
    const x = -2.4 + i * 0.52;
    const r = 0.07 + i * 0.006;
    for (const s of [-1, 1]) dbG.push(new THREE.CylinderGeometry(r, r, 0.08, 12).rotateZ(Math.PI / 2).translate(x, 1.0, s * 0.12 - 0.1));
    dbG.push(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6).rotateX(Math.PI / 2).translate(x, 1.0, -0.1));
  }
  add(mergeGeometries(dbG), std(0x15181c, { metalness: 0.6, roughness: 0.35 }), HX + 1, 5.6, hz0 + 1.2, H2);
  add(box(5.6, 0.08, 0.6), metal, HX + 1, 6.45, hz0 + 1.1, H2);
  // lavička, vrece, kettlebelly, nápis
  const bench = new THREE.Group();
  add(rbox(0.4, 0.1, 1.4, 0.04), std(0x1b1f26), 0, 0.5, 0, bench);
  add(box(0.06, 0.45, 0.06), metal, 0, 0.25, 0.5, bench);
  add(box(0.06, 0.45, 0.06), metal, 0, 0.25, -0.5, bench);
  bench.position.set(HX - 2.5, 5.6, -6);
  H2.add(bench);
  add(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), metal, HX - 10, 10.1, -9, H2);
  add(new THREE.CapsuleGeometry(0.3, 1.0, 6, 16), std(0x8a1c22, { roughness: 0.6 }), HX - 10, 8.3, -9, H2);
  for (let i = 0; i < 6; i++) add(new THREE.SphereGeometry(0.13 + i * 0.012, 14, 10), std(0x15181c, { metalness: 0.4, roughness: 0.4 }), HX - 5 + i * 0.42, 5.75, hz0 + 1.3, H2);
  const gymT = TX.canvas(1024, 128, (g) => {
    g.clearRect(0, 0, 1024, 128);
    g.fillStyle = '#ffffff';
    g.font = `900 italic 96px ${TX.FONT}`;
    g.textAlign = 'center';
    g.fillText('I-SPORT GYM', 512, 100);
  });
  add(new THREE.PlaneGeometry(8, 1), new THREE.MeshStandardMaterial({ map: gymT, transparent: true, emissive: 0xffffff, emissiveMap: gymT, emissiveIntensity: 0.6 }), HX, 9.6, hz0 + 0.24, H2, { cast: false });
  // bežecké pásy
  for (const x of [HX + 6, HX + 8.4]) {
    const tm = new THREE.Group();
    add(rbox(0.9, 0.25, 2.1, 0.06), std(0x1b1f26, { roughness: 0.5 }), 0, 0.15, 0, tm);
    add(box(0.7, 0.02, 1.8), std(0x0b0d10, { roughness: 0.9 }), 0, 0.29, 0, tm);
    for (const s of [-1, 1]) add(box(0.05, 1.2, 0.05), metal, s * 0.4, 0.8, -0.9, tm);
    add(rbox(0.9, 0.4, 0.15, 0.04), std(0x111418), 0, 1.45, -0.95, tm);
    add(new THREE.PlaneGeometry(0.4, 0.22), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x3ddc84, emissiveIntensity: 1.2 }), 0, 1.5, -0.87, tm, { cast: false });
    tm.position.set(x, 5.6, -3);
    H2.add(tm);
  }
  // wellness: bazén, sauna, lehátka
  const poolW = 9;
  const poolD = 5;
  const PZ = -6;
  const PXp = HX + 4;
  add(box(poolW + 0.8, 0.5, poolD + 0.8), std(0xffffff, { map: TX.tilesTex([6, 4], '#f3f6f8', '#c5d0d8', 32), roughness: 0.3 }), PXp, 0.25, PZ, H2);
  const water = new THREE.MeshStandardMaterial({ color: 0x2fb6c9, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.9, normalMap: TX.waterNormal(), normalScale: new THREE.Vector2(0.3, 0.3), envMapIntensity: 1.6, emissive: 0x0b4d5a, emissiveIntensity: 0.7 });
  water.normalMap.repeat.set(3, 2);
  W.water = water;
  add(new THREE.PlaneGeometry(poolW, poolD), water, PXp, 0.53, PZ, H2, { rx: -Math.PI / 2, cast: false });
  add(box(poolW + 0.9, 0.08, 0.3), std(0xe9e4dc, { roughness: 0.5 }), PXp, 0.55, PZ - poolD / 2 - 0.25, H2);
  add(box(poolW + 0.9, 0.08, 0.3), std(0xe9e4dc, { roughness: 0.5 }), PXp, 0.55, PZ + poolD / 2 + 0.25, H2);
  // drevený obklad a teplé svetlo vo wellness
  add(new THREE.PlaneGeometry(HW - 1, 4.6), std(0xffffff, { map: TX.woodTex([8, 2], '#9a6a3e'), roughness: 0.7 }), HX, 2.5, hz0 + 0.25, H2, { cast: false });
  for (let x = HX - 9; x <= HX + 9; x += 3) add(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffc27a, emissiveIntensity: 3 }), x, 5.15, -4, H2, { cast: false });
  const pl = new THREE.PointLight(0x5fe0f0, 40, 9, 1.5);
  pl.position.set(PXp, 0.8, PZ);
  H2.add(pl);
  // sauna
  const sauna = new THREE.Group();
  add(rbox(4.4, 2.8, 3.6, 0.08), std(0xffffff, { map: TX.woodTex([3, 2], '#b07a46'), roughness: 0.7 }), 0, 1.4, 0, sauna);
  add(box(0.9, 1.9, 0.05), new THREE.MeshStandardMaterial({ color: 0xffb35a, emissive: 0xff9a3c, emissiveIntensity: 1.4, transparent: true, opacity: 0.85 }), 0.8, 1.15, 1.81, sauna, { cast: false });
  add(box(1.4, 0.7, 0.05), new THREE.MeshStandardMaterial({ color: 0xffb35a, emissive: 0xff9a3c, emissiveIntensity: 1.2 }), -0.9, 1.6, 1.81, sauna, { cast: false });
  sauna.position.set(HX - 7, 0, -9.5);
  H2.add(sauna);
  const sl = new THREE.PointLight(0xff9a3c, 30, 7, 1.6);
  sl.position.set(HX - 7, 1.4, -7.3);
  H2.add(sl);
  W.saunaPos = new THREE.Vector3(HX - 7, 2.9, -9.5);
  for (const x of [HX - 2, HX + 0.2]) {
    const l = new THREE.Group();
    add(rbox(0.75, 0.12, 1.9, 0.04), std(0xf3f5f7), 0, 0.42, 0, l);
    const back = add(rbox(0.75, 0.1, 0.8, 0.04), std(0xf3f5f7), 0, 0.68, -0.9, l);
    back.rotation.x = 0.7;
    for (const s of [-1, 1]) add(box(0.04, 0.4, 1.7), steel, s * 0.33, 0.2, 0, l);
    l.position.set(x, 0, -1.5);
    H2.add(l);
  }
  // rastliny
  for (const [x, z] of [
    [HX - 10.5, 2.5],
    [HX + 10.5, 2.5],
    [HX + 10.5, -12],
  ]) {
    add(new THREE.CylinderGeometry(0.35, 0.28, 0.6, 14), std(0x2a2f37), x, 0.3, z, H2);
    for (let i = 0; i < 5; i++) add(new THREE.IcosahedronGeometry(0.35, 1), std(0x2f7a3e, { flatShading: true }), x + Math.cos(i) * 0.2, 0.9 + i * 0.15, z + Math.sin(i) * 0.2, H2);
  }
  const wl = new THREE.PointLight(0xffc27a, 22, 20, 1.3);
  wl.position.set(HX, 4.4, -4);
  H2.add(wl);
  W.hall2 = { HX, hz0, poolW, poolD, PZ, PXp };
  return W;
}

// auto: bočný profil vytlačený do šírky + kolesá, svetlá
function car(color) {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(-2.2, 0.35);
  s.lineTo(-2.25, 0.8);
  s.quadraticCurveTo(-2.2, 0.98, -1.7, 1.0);
  s.lineTo(-0.9, 1.05);
  s.quadraticCurveTo(-0.5, 1.48, 0.1, 1.5);
  s.lineTo(0.9, 1.48);
  s.quadraticCurveTo(1.35, 1.42, 1.65, 1.02);
  s.lineTo(2.15, 0.95);
  s.quadraticCurveTo(2.3, 0.85, 2.28, 0.55);
  s.lineTo(2.2, 0.35);
  s.lineTo(-2.2, 0.35);
  const body = new THREE.ExtrudeGeometry(s, { depth: 1.7, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.1, bevelSegments: 3 });
  body.translate(0, 0, -0.85);
  const paint = new THREE.MeshPhysicalMaterial({ color, metalness: 0.6, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 });
  const m = new THREE.Mesh(body, paint);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  const ws = new THREE.Shape();
  ws.moveTo(-0.8, 1.08);
  ws.quadraticCurveTo(-0.45, 1.42, 0.1, 1.44);
  ws.lineTo(0.85, 1.42);
  ws.quadraticCurveTo(1.25, 1.36, 1.5, 1.06);
  ws.lineTo(-0.8, 1.08);
  const wg = new THREE.ExtrudeGeometry(ws, { depth: 1.78, bevelEnabled: false });
  wg.translate(0, 0.0, -0.89);
  const glass = new THREE.Mesh(wg, new THREE.MeshPhysicalMaterial({ color: 0x121820, metalness: 0.3, roughness: 0.05, envMapIntensity: 1.4 }));
  g.add(glass);
  for (const [x, z] of [
    [-1.4, 0.82],
    [1.35, 0.82],
    [-1.4, -0.82],
    [1.35, -0.82],
  ]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 20), new THREE.MeshStandardMaterial({ color: 0x111316, roughness: 0.8 }));
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 0.36, z);
    w.castShadow = true;
    g.add(w);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.27, 12), new THREE.MeshStandardMaterial({ color: 0xb9c0c8, metalness: 0.9, roughness: 0.3 }));
    rim.rotation.x = Math.PI / 2;
    rim.position.set(x, 0.36, z);
    g.add(rim);
  }
  const lights = [];
  for (const z of [-0.6, 0.6]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.35), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dc, emissiveIntensity: 0 }));
    hl.position.set(2.3, 0.78, z);
    g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.35), new THREE.MeshStandardMaterial({ color: 0x5a0000, emissive: 0xff1a1a, emissiveIntensity: 0 }));
    tl.position.set(-2.3, 0.82, z);
    g.add(tl);
    lights.push({ m: hl.material, on: 0.4 }, { m: tl.material, on: 0.6 });
  }
  g.userData.lights = lights;
  return g;
}
