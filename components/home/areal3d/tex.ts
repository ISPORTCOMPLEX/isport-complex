// @ts-nocheck – 3D stavba (three.js), typovú kontrolu robí scene.ts na rozhraní
// Procedurálne textúry (canvas) – žiadne stiahnuté obrázky.
import * as THREE from 'three';

// písmo na nápisy v textúrach – nastaví ho scene.ts podľa písma webu
export let FONT = "'Arial Narrow', sans-serif";
export function setFont(f: string) {
  FONT = `${f}, 'Arial Narrow', sans-serif`;
}

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvas(w, h, draw, { repeat = [1, 1], color = true, aniso = 8 } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  return t;
}

export function noise(g, w, h, n, alpha, light, seed = 1, size = 2) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    g.fillStyle = light ? `rgba(255,255,255,${alpha * r()})` : `rgba(0,0,0,${alpha * r()})`;
    const s = size * (0.5 + r());
    g.fillRect(r() * w, r() * h, s, s);
  }
}

// hrubší šum ako výškový podklad (bump)
export function bumpNoise(w, h, seed, n = 6000, repeat = [1, 1]) {
  return canvas(
    w,
    h,
    (g) => {
      g.fillStyle = '#808080';
      g.fillRect(0, 0, w, h);
      noise(g, w, h, n, 0.35, true, seed, 3);
      noise(g, w, h, n, 0.35, false, seed + 1, 3);
    },
    { repeat, color: false },
  );
}

// sendvičové panely (fasáda) – zvislé spoje a jemné vlny
export function panels(base = '#2b313a', repeat = [12, 1]) {
  const map = canvas(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 32) {
        const gr = g.createLinearGradient(x, 0, x + 32, 0);
        gr.addColorStop(0, 'rgba(255,255,255,0.05)');
        gr.addColorStop(0.5, 'rgba(255,255,255,0)');
        gr.addColorStop(1, 'rgba(0,0,0,0.08)');
        g.fillStyle = gr;
        g.fillRect(x, 0, 32, h);
      }
      g.fillStyle = 'rgba(0,0,0,0.55)';
      g.fillRect(0, 0, 3, h);
      g.fillRect(128, 0, 2, h);
      noise(g, w, h, 900, 0.05, true, 4, 1);
    },
    { repeat },
  );
  const bump = canvas(
    256,
    256,
    (g, w, h) => {
      for (let x = 0; x < w; x++) {
        const v = 128 + Math.sin((x / 32) * Math.PI * 2) * 30 - (x % 128 < 3 ? 90 : 0);
        g.fillStyle = `rgb(${v},${v},${v})`;
        g.fillRect(x, 0, 1, h);
      }
    },
    { repeat, color: false },
  );
  return { map, bump };
}

// trapézový plech strechy
export function roofSheet(repeat = [60, 1]) {
  const map = canvas(
    128,
    64,
    (g, w, h) => {
      for (let x = 0; x < w; x++) {
        const v = 150 + Math.round(Math.sin((x / w) * Math.PI * 2) * 22);
        g.fillStyle = `rgb(${v - 8},${v - 2},${v + 6})`;
        g.fillRect(x, 0, 1, h);
      }
      noise(g, w, h, 300, 0.06, false, 9, 1);
    },
    { repeat },
  );
  const bump = canvas(
    128,
    64,
    (g, w, h) => {
      for (let x = 0; x < w; x++) {
        const s = (x % 64) / 64;
        const v = s < 0.3 ? 220 : s < 0.4 ? 220 - (s - 0.3) * 1400 : s < 0.9 ? 80 : 80 + (s - 0.9) * 1400;
        g.fillStyle = `rgb(${v},${v},${v})`;
        g.fillRect(x, 0, 1, h);
      }
    },
    { repeat, color: false },
  );
  return { map, bump };
}

// ľad: biely s jemnými škrabancami a čiarami podľa pravidiel (40 × 20 m)
export function iceTex(W, D) {
  const px = 64; // px na meter
  return canvas(W * px, D * px, (g, w, h) => {
    const X = (m) => (m + W / 2) * px;
    const Y = (m) => (m + D / 2) * px;
    g.fillStyle = '#eef4f8';
    g.fillRect(0, 0, w, h);
    const gr = g.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w * 0.6);
    gr.addColorStop(0, 'rgba(255,255,255,0.6)');
    gr.addColorStop(1, 'rgba(205,220,232,0.5)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    // škrabance od korčúľ
    const r = rng(77);
    g.lineCap = 'round';
    for (let i = 0; i < 2600; i++) {
      const x = r() * w;
      const y = r() * h;
      const a = r() * Math.PI;
      const l = 8 + r() * 70;
      g.strokeStyle = `rgba(${r() < 0.5 ? '160,178,192' : '255,255,255'},${0.08 + r() * 0.18})`;
      g.lineWidth = 0.6 + r();
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * 10, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
    const red = '#d0101c';
    const blue = '#1d4fd8';
    const line = (xm, c, wm) => {
      g.fillStyle = c;
      g.fillRect(X(xm) - (wm * px) / 2, 0, wm * px, h);
    };
    line(0, red, 0.3);
    // prerušovaná stredová (biele medzery)
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (let y = 0; y < h; y += 40) g.fillRect(X(0) - 2, y, 4, 14);
    line(-7, blue, 0.3);
    line(7, blue, 0.3);
    line(-W / 2 + 3.4, red, 0.05);
    line(W / 2 - 3.4, red, 0.05);
    const circle = (xm, ym, rm, c, fill) => {
      g.beginPath();
      g.arc(X(xm), Y(ym), rm * px, 0, Math.PI * 2);
      if (fill) {
        g.fillStyle = c;
        g.fill();
      } else {
        g.strokeStyle = c;
        g.lineWidth = 0.05 * px;
        g.stroke();
      }
    };
    circle(0, 0, 3, blue, false);
    circle(0, 0, 0.2, blue, true);
    for (const sx of [-1, 1])
      for (const sy of [-1, 1]) {
        circle(sx * 12.5, sy * 4.5, 3, red, false);
        circle(sx * 12.5, sy * 4.5, 0.25, red, true);
        circle(sx * 4.5, sy * 4.5, 0.25, red, true);
      }
    // brankoviská
    for (const s of [-1, 1]) {
      g.fillStyle = 'rgba(80,150,230,0.55)';
      g.beginPath();
      g.arc(X(s * (W / 2 - 3.4)), Y(0), 1.6 * px, s > 0 ? Math.PI / 2 : -Math.PI / 2, s > 0 ? (Math.PI * 3) / 2 : Math.PI / 2);
      g.fill();
    }
    // logo v strede (vlastné, nie cudzie)
    g.save();
    g.translate(X(0), Y(0));
    g.globalAlpha = 0.85;
    g.fillStyle = '#e30613';
    g.font = `900 italic ${1.1 * px}px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('I-SPORT', 0, -0.35 * px);
    g.fillStyle = '#0b1622';
    g.font = `900 italic ${0.55 * px}px ${FONT}`;
    g.fillText('KOŠICE', 0, 0.55 * px);
    g.restore();
  });
}

// reklamy na mantineloch (vlastné texty komplexu)
export function adsTex(len) {
  const ads = [
    ['#e30613', '#ffffff', 'I-SPORT COMPLEX'],
    ['#ffffff', '#0b1622', 'REZERVUJ ONLINE'],
    ['#0b1622', '#ffffff', 'KOŠICE · JUH'],
    ['#ffffff', '#e30613', 'ŠATŇA V CENE'],
    ['#1d4fd8', '#ffffff', 'SKYBOXY NAD ĽADOM'],
    ['#ffffff', '#0b1622', 'TVOJ ĽAD. TVOJ ČAS.'],
  ];
  const seg = 3.2; // m na reklamu
  const n = Math.ceil(len / seg);
  const tex = canvas(n * 176, 128, (g) => {
    for (let i = 0; i < n; i++) {
      const [bg, fg, t] = ads[i % ads.length];
      g.fillStyle = bg;
      g.fillRect(i * 176, 0, 176, 128);
      g.fillStyle = fg;
      g.font = `900 italic 30px ${FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(t, i * 176 + 88, 62, 166);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(i * 176 + 174, 0, 2, 128);
    }
    // spodný žltý kopací pás
    g.fillStyle = '#f2c230';
    g.fillRect(0, 104, n * 176, 24);
  });
  tex.wrapS = THREE.ClampToEdgeWrapping;
  return { tex, total: n * seg };
}

// umelá tráva s pruhmi po kosení a čiarami
export function turfTex(W, D) {
  const px = 40;
  const map = canvas(W * px, D * px, (g, w, h) => {
    const bands = 10;
    for (let i = 0; i < bands; i++) {
      g.fillStyle = i % 2 ? '#2f8a3e' : '#287a36';
      g.fillRect((i * w) / bands, 0, w / bands + 1, h);
    }
    noise(g, w, h, 60000, 0.12, true, 5, 1.5);
    noise(g, w, h, 60000, 0.14, false, 6, 1.5);
    g.strokeStyle = 'rgba(255,255,255,0.92)';
    g.lineWidth = 0.12 * px;
    const m = 0.6 * px;
    g.strokeRect(m, m, w - 2 * m, h - 2 * m);
    g.beginPath();
    g.moveTo(w / 2, m);
    g.lineTo(w / 2, h - m);
    g.stroke();
    g.beginPath();
    g.arc(w / 2, h / 2, 2.8 * px, 0, Math.PI * 2);
    g.stroke();
    for (const s of [0, 1]) {
      const x0 = s ? w - m : m;
      const dir = s ? -1 : 1;
      g.strokeRect(Math.min(x0, x0 + dir * 4.5 * px), h / 2 - 5.5 * px, 4.5 * px, 11 * px);
      g.strokeRect(Math.min(x0, x0 + dir * 1.6 * px), h / 2 - 2.8 * px, 1.6 * px, 5.6 * px);
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(x0 + dir * 3.3 * px, h / 2, 0.12 * px, 0, Math.PI * 2);
      g.fill();
    }
  });
  const bump = bumpNoise(512, 512, 12, 30000, [W / 4, D / 4]);
  return { map, bump };
}

export function asphaltTex(repeat) {
  return canvas(
    512,
    512,
    (g, w, h) => {
      g.fillStyle = '#3a3e44';
      g.fillRect(0, 0, w, h);
      noise(g, w, h, 40000, 0.25, true, 21, 1.6);
      noise(g, w, h, 40000, 0.3, false, 22, 1.6);
    },
    { repeat },
  );
}
export function pavingTex(repeat) {
  return canvas(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = '#9a9690';
      g.fillRect(0, 0, w, h);
      const r = rng(31);
      for (let y = 0; y < h; y += 32)
        for (let x = 0; x < w; x += 64) {
          const o = (y / 32) % 2 ? 32 : 0;
          const v = 140 + r() * 30;
          g.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
          g.fillRect(x + o + 1, y + 1, 62, 30);
          g.fillRect(x + o - 63, y + 1, 62, 30);
        }
      noise(g, w, h, 4000, 0.12, false, 33, 1);
    },
    { repeat },
  );
}
export function grassTex(repeat, autumn) {
  return canvas(
    512,
    512,
    (g, w, h) => {
      g.fillStyle = autumn ? '#55703f' : '#4f7a3f';
      g.fillRect(0, 0, w, h);
      const r = rng(41);
      for (let i = 0; i < 120; i++) {
        g.fillStyle = `rgba(${r() < 0.5 ? '90,120,60' : '60,90,45'},0.35)`;
        g.beginPath();
        g.arc(r() * w, r() * h, 10 + r() * 40, 0, Math.PI * 2);
        g.fill();
      }
      noise(g, w, h, 50000, 0.15, true, 42, 1.4);
      noise(g, w, h, 50000, 0.2, false, 43, 1.4);
      if (autumn)
        for (let i = 0; i < 900; i++) {
          g.fillStyle = ['#b5651d', '#c98b2a', '#8a4b1b'][i % 3];
          g.fillRect(r() * w, r() * h, 2 + r() * 2, 2 + r() * 2);
        }
    },
    { repeat },
  );
}
export function rubberTex(repeat) {
  return canvas(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = '#1c1f24';
      g.fillRect(0, 0, w, h);
      noise(g, w, h, 5000, 0.35, true, 51, 1.2);
      g.fillStyle = 'rgba(0,0,0,0.6)';
      g.fillRect(0, 0, w, 2);
      g.fillRect(0, 0, 2, h);
    },
    { repeat },
  );
}
export function woodTex(repeat, base = '#a8703f') {
  return canvas(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      const r = rng(61);
      for (let y = 0; y < h; y += 32) {
        g.fillStyle = 'rgba(60,30,10,0.5)';
        g.fillRect(0, y, w, 2);
        for (let i = 0; i < 30; i++) {
          g.strokeStyle = `rgba(80,40,15,${0.08 + r() * 0.15})`;
          g.beginPath();
          const yy = y + 4 + r() * 26;
          g.moveTo(0, yy);
          g.bezierCurveTo(w * 0.3, yy + (r() - 0.5) * 6, w * 0.6, yy + (r() - 0.5) * 6, w, yy);
          g.stroke();
        }
      }
    },
    { repeat },
  );
}
export function tilesTex(repeat, base = '#e9eef2', joint = '#b9c4cc', size = 32) {
  return canvas(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      g.fillStyle = joint;
      for (let i = 0; i <= w; i += size) {
        g.fillRect(i, 0, 2, h);
        g.fillRect(0, i, w, 2);
      }
    },
    { repeat },
  );
}
// sieťka (plot, bránky) – priehľadnosť v alfa
export function meshTex(repeat, cell = 16, lw = 2, color = '#d7dde3') {
  return canvas(
    128,
    128,
    (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.strokeStyle = color;
      g.lineWidth = lw;
      for (let i = -w; i < w * 2; i += cell) {
        g.beginPath();
        g.moveTo(i, 0);
        g.lineTo(i + h, h);
        g.stroke();
        g.beginPath();
        g.moveTo(i + h, 0);
        g.lineTo(i, h);
        g.stroke();
      }
    },
    { repeat },
  );
}
// vlnky vody (normálová mapa z výšok)
export function waterNormal() {
  const W = 256;
  const c = document.createElement('canvas');
  c.width = c.height = W;
  const g = c.getContext('2d');
  const img = g.createImageData(W, W);
  const hgt = (x, y) =>
    Math.sin((x / W) * Math.PI * 2 * 3 + Math.sin((y / W) * Math.PI * 2 * 2)) * 0.5 +
    Math.sin((y / W) * Math.PI * 2 * 4 + (x / W) * Math.PI * 2) * 0.35 +
    Math.sin(((x + y) / W) * Math.PI * 2 * 5) * 0.2;
  for (let y = 0; y < W; y++)
    for (let x = 0; x < W; x++) {
      const dx = hgt(x + 1, y) - hgt(x - 1, y);
      const dy = hgt(x, y + 1) - hgt(x, y - 1);
      const n = new THREE.Vector3(-dx * 2, -dy * 2, 1).normalize();
      const i = (y * W + x) * 4;
      img.data[i] = (n.x * 0.5 + 0.5) * 255;
      img.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
      img.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
// jemná okrúhla vločka / kvapka
export function dotTex() {
  return canvas(
    64,
    64,
    (g) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.4, 'rgba(255,255,255,0.7)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
    },
    { color: true },
  );
}
// kužeľ svetla (objemový lúč): priehľadnosť od zdroja k zemi
export function beamTex() {
  return canvas(
    8,
    256,
    (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, 'rgba(255,255,255,0.55)');
      gr.addColorStop(0.5, 'rgba(255,255,255,0.12)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 8, 256);
    },
    { color: true },
  );
}
// LED obrazovka tabule
export function screenTex(text, sub) {
  return canvas(512, 256, (g, w, h) => {
    g.fillStyle = '#05080c';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#e30613';
    g.fillRect(0, 0, w, 40);
    g.fillStyle = '#fff';
    g.font = `900 italic 30px ${FONT}`;
    g.textAlign = 'center';
    g.fillText('I-SPORT COMPLEX', w / 2, 30);
    g.fillStyle = '#ffffff';
    g.font = `900 italic 130px ${FONT}`;
    g.fillText(text, w / 2, 175);
    g.fillStyle = '#f2c230';
    g.font = `900 italic 40px ${FONT}`;
    g.fillText(sub, w / 2, 232);
    // LED raster
    g.fillStyle = 'rgba(0,0,0,0.35)';
    for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
    for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 1, h);
  });
}
