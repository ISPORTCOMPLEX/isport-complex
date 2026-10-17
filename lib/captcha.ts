import 'server-only';
import { randomInt } from 'node:crypto';
import { randomToken, sha256, sign, unsign } from './crypto';
import { consumeOnce } from './rateLimit';

// Vlastná obrázková CAPTCHA bez služby tretej strany:
// - kód je kryptograficky náhodný (randomInt), nie Math.random,
// - znaky sa nekreslia ako <text>, ale ako čiary, takže ich bot neprečíta zo zdrojového kódu,
// - skreslenie a šum, bez mätúcich znakov 0/O a 1/I/L.

type Pt = [number, number];
const P: Record<string, Pt[][]> = {
  A: [[[0, 6], [2, 0], [4, 6]], [[1, 3.5], [3, 3.5]]],
  C: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5]]],
  E: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3, 3]]],
  F: [[[4, 0], [0, 0], [0, 6]], [[0, 3], [3, 3]]],
  H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
  K: [[[0, 0], [0, 6]], [[4, 0], [0, 3.5]], [[1.3, 2.6], [4, 6]]],
  M: [[[0, 6], [0, 0], [2, 3], [4, 0], [4, 6]]],
  N: [[[0, 6], [0, 0], [4, 6], [4, 0]]],
  P: [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]]],
  R: [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]], [[2, 3], [4, 6]]],
  T: [[[0, 0], [4, 0]], [[2, 0], [2, 6]]],
  U: [[[0, 0], [0, 5], [1, 6], [3, 6], [4, 5], [4, 0]]],
  V: [[[0, 0], [2, 6], [4, 0]]],
  W: [[[0, 0], [1, 6], [2, 2], [3, 6], [4, 0]]],
  X: [[[0, 0], [4, 6]], [[4, 0], [0, 6]]],
  Y: [[[0, 0], [2, 3], [4, 0]], [[2, 3], [2, 6]]],
  '2': [[[0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [0, 6], [4, 6]]],
  '3': [[[0, 0], [4, 0], [2, 2.5], [3, 2.5], [4, 3.5], [4, 5], [3, 6], [1, 6], [0, 5]]],
  '4': [[[3, 6], [3, 0], [0, 4], [4, 4]]],
  '5': [[[4, 0], [0, 0], [0, 3], [3, 3], [4, 4], [4, 5], [3, 6], [0, 6]]],
  '6': [[[3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [3, 3], [0, 3]]],
  '7': [[[0, 0], [4, 0], [1.5, 6]]],
  '8': [
    [[1, 0], [3, 0], [4, 1], [4, 2], [3, 3], [1, 3], [0, 4], [0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [3, 3]],
    [[1, 3], [0, 2], [0, 1], [1, 0]],
  ],
  '9': [[[4, 3], [1, 3], [0, 2], [0, 1], [1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6]]],
};
const ALPHABET = Object.keys(P);
const LENGTH = 5;
const TTL_MS = 10 * 60 * 1000;

const rnd = (min: number, max: number) => min + (randomInt(0, 10001) / 10000) * (max - min);

function renderSvg(code: string): string {
  const W = 220;
  const H = 80;
  const parts: string[] = [];
  // šum: krivky a body
  for (let i = 0; i < 5; i++) {
    parts.push(
      `<path d="M${rnd(0, 40).toFixed(1)} ${rnd(10, 70).toFixed(1)} Q${rnd(60, 160).toFixed(1)} ${rnd(0, 80).toFixed(1)} ${rnd(180, 220).toFixed(1)} ${rnd(10, 70).toFixed(1)}" stroke="rgba(255,255,255,${rnd(0.12, 0.25).toFixed(2)})" stroke-width="${rnd(1, 2).toFixed(1)}" fill="none"/>`,
    );
  }
  for (let i = 0; i < 40; i++) {
    parts.push(`<circle cx="${rnd(0, W).toFixed(1)}" cy="${rnd(0, H).toFixed(1)}" r="${rnd(0.6, 1.6).toFixed(1)}" fill="rgba(255,255,255,${rnd(0.15, 0.4).toFixed(2)})"/>`);
  }
  // znaky ako čiary
  [...code].forEach((ch, i) => {
    const scale = rnd(6.2, 7.4);
    const cx = 26 + i * 40 + rnd(-3, 3);
    const cy = 40 + rnd(-5, 5);
    const rot = rnd(-18, 18);
    const color = `hsl(${Math.round(rnd(0, 360))} 70% ${Math.round(rnd(72, 88))}%)`;
    const d = P[ch]
      .map(
        (stroke) =>
          'M' +
          stroke
            .map(([x, y]) => `${((x - 2 + rnd(-0.22, 0.22)) * scale).toFixed(1)} ${((y - 3 + rnd(-0.22, 0.22)) * scale).toFixed(1)}`)
            .join(' L'),
      )
      .join(' ');
    parts.push(
      `<path transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${rot.toFixed(1)}) skewX(${rnd(-12, 12).toFixed(1)})" d="${d}" stroke="${color}" stroke-width="${rnd(2.4, 3.2).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    );
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#121216"/>${parts.join('')}</svg>`;
}

export type Captcha = { image: string; token: string };

export function createCaptcha(): Captcha {
  const code = Array.from({ length: LENGTH }, () => ALPHABET[randomInt(0, ALPHABET.length)]).join('');
  const id = randomToken(12);
  const expires = Date.now() + TTL_MS;
  const token = sign('captcha', `${expires}:${id}:${sha256(`${code}:${id}`)}`);
  const svg = renderSvg(code);
  return { image: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`, token };
}

export async function verifyCaptcha(token: string, answer: string): Promise<boolean> {
  const data = unsign('captcha', token);
  if (!data) return false;
  const [expStr, id, hash] = data.split(':');
  if (!id || !hash || Number(expStr) < Date.now()) return false;
  const normalized = answer.replace(/\s/g, '').toUpperCase();
  if (sha256(`${normalized}:${id}`) !== hash) return false;
  // každý obrázok sa dá použiť len raz
  return consumeOnce(`captcha:${id}`, TTL_MS / 1000);
}
