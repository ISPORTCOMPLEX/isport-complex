import 'server-only';
import { createHash } from 'node:crypto';
import { safeEqual } from './crypto';

// Cloudinary – fotky sa nahrávajú z prehliadača PRIAMO do Cloudinary (nejdú cez náš server ani do databázy).
// Server len podpíše povolenie na nahratie (platí 1 hodinu, len do priečinka isport/<časť>, len obrázky)
// a po nahratí overí podpis odpovede. V databáze ostane iba odkaz (public_id) a popis.
// Bez SDK – podpis podľa dokumentácie: SHA-1 z abecedne zoradených parametrov + API secret.

export type CloudinaryConfig = { cloudName: string; apiKey: string; apiSecret: string };

export function cloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';
  const apiKey = process.env.CLOUDINARY_API_KEY ?? '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET ?? '';
  if (!/^[a-z0-9_-]{2,64}$/i.test(cloudName) || !/^\d{6,20}$/.test(apiKey) || apiSecret.length < 16) return null;
  return { cloudName, apiKey, apiSecret };
}

export function cloudName(): string | null {
  const c = process.env.CLOUDINARY_CLOUD_NAME ?? '';
  return /^[a-z0-9_-]{2,64}$/i.test(c) ? c : null;
}

export function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const base = Object.keys(params)
    .filter((k) => params[k] !== '' && params[k] !== undefined)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return createHash('sha1').update(base + apiSecret).digest('hex');
}

export const ALLOWED_FORMATS = 'jpg,jpeg,png,webp,avif,heic';
export const MAX_BYTES = 10 * 1024 * 1024; // limit bezplatného plánu Cloudinary
export const VIDEO_FORMATS = 'mp4,mov,webm,m4v';
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // limit bezplatného plánu Cloudinary pre video
export type MediaKind = 'image' | 'video';

// Parametre, ktoré prehliadač pošle do Cloudinary spolu s podpisom. Zmena čohokoľvek podpis zneplatní.
export function uploadParams(cfg: CloudinaryConfig, slot: string, kind: MediaKind = 'image') {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `isport/${slot}`;
  const params: Record<string, string | number> =
    kind === 'video'
      ? { timestamp, asset_folder: folder, public_id_prefix: folder, allowed_formats: VIDEO_FORMATS }
      : {
          timestamp,
          asset_folder: folder,
          public_id_prefix: folder,
          allowed_formats: ALLOWED_FORMATS,
          // originál sa zmenší na max. 2560 px – menej miesta, rýchlejší web
          transformation: 'c_limit,w_2560,h_2560',
        };
  return { url: `https://api.cloudinary.com/v1_1/${cfg.cloudName}/${kind}/upload`, fields: { ...params, api_key: cfg.apiKey, signature: signParams(params, cfg.apiSecret) } };
}

// Odpoveď z Cloudinary obsahuje podpis public_id + version – overí, že fotku naozaj nahral náš podpis.
export function verifyUploadSignature(cfg: CloudinaryConfig, publicId: string, version: number, signature: string): boolean {
  const expected = signParams({ public_id: publicId, version }, cfg.apiSecret);
  return safeEqual(expected, signature);
}

function basicAuth(cfg: CloudinaryConfig) {
  return `Basic ${Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString('base64')}`;
}

export type CloudResource = { public_id: string; version: number; width: number; height: number; format: string; bytes: number; asset_folder?: string; duration?: number };

// Údaje o fotke priamo z Cloudinary (nedôverujeme rozmerom, ktoré pošle prehliadač).
export async function getResource(cfg: CloudinaryConfig, publicId: string, kind: MediaKind = 'image'): Promise<CloudResource | null> {
  const url = `https://api.cloudinary.com/v1_1/${cfg.cloudName}/resources/${kind}/upload/${publicId.split('/').map(encodeURIComponent).join('/')}`;
  const res = await fetch(url, { headers: { Authorization: basicAuth(cfg) }, cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;
  return (await res.json()) as CloudResource;
}

export async function destroyResource(cfg: CloudinaryConfig, publicId: string, kind: MediaKind = 'image'): Promise<boolean> {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { public_id: publicId, timestamp, invalidate: 'true' };
  const body = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), api_key: cfg.apiKey, signature: signParams(params, cfg.apiSecret) });
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/${kind}/destroy`, { method: 'POST', body, signal: AbortSignal.timeout(10000) });
  if (!res.ok) return false;
  const j = (await res.json()) as { result?: string };
  return j.result === 'ok' || j.result === 'not found';
}

// Adresa priamo v Cloudinary – používa ju LEN server (app/obrazky/[...path]/route.ts), návštevník ju nikdy nevidí.
// Kvalita automaticky, výrez podľa obsahu, bez EXIF údajov (napr. GPS).
export const IMG_FORMATS = ['avif', 'webp', 'jpg'] as const;
export type ImgFormat = (typeof IMG_FORMATS)[number];
export function imageUrl(cloud: string, publicId: string, version: number, w: number, ratio?: string, fmt: ImgFormat | 'auto' = 'auto'): string {
  const t = [`f_${fmt}`, 'q_auto', ratio ? `c_fill,g_auto,ar_${ratio}` : 'c_limit', `w_${w}`].join(',');
  return `https://res.cloudinary.com/${cloud}/image/upload/${t}/v${version}/${publicId.split('/').map(encodeURIComponent).join('/')}`;
}

// Verejná adresa fotky na našej doméne: /obrazky/<šírka>/<pomer>/<formát>/v<verzia>/<id>
// Prehliadač aj návštevník vidia len náš web; odkiaľ fotka pochádza, nezistí.
export const IMG_WIDTHS = [480, 800, 1200, 1600, 2000] as const;
export const IMG_RATIOS = ['4:3', '16:10', '2:1', '16:9'] as const;
export function photoPath(publicId: string, version: number, w: number, ratio: string | undefined, fmt: ImgFormat): string {
  const r = ratio ? ratio.replace(':', 'x') : 'o';
  return `/obrazky/${w}/${r}/${fmt}/v${version}/${publicId.split('/').map(encodeURIComponent).join('/')}`;
}

// Rozbor adresy /obrazky/… – vráti null pri čomkoľvek neočakávanom (proxy nesmie sťahovať cudzie súbory).
export function parsePhotoPath(parts: string[]): { w: number; ratio?: string; fmt: ImgFormat; version: number; publicId: string } | null {
  if (parts.length < 6) return null;
  const [ws, rs, fs, vs, ...id] = parts;
  const w = Number(ws);
  if (!(IMG_WIDTHS as readonly number[]).includes(w)) return null;
  const ratio = rs === 'o' ? undefined : rs.replace('x', ':');
  if (ratio !== undefined && !(IMG_RATIOS as readonly string[]).includes(ratio)) return null;
  if (!(IMG_FORMATS as readonly string[]).includes(fs)) return null;
  const vm = /^v(\d{1,12})$/.exec(vs);
  if (!vm) return null;
  if (id[0] !== 'isport' || id.length > 6 || !id.every((x) => /^[\w.-]{1,120}$/.test(x) && x !== '..' && x !== '.')) return null;
  return { w, ratio, fmt: fs as ImgFormat, version: Number(vm[1]), publicId: id.join('/') };
}


// ───── Videá (články) – tiež cez našu doménu: /videa/v<verzia>/<id>.mp4 a náhľad /videa/v<verzia>/<id>.jpg ─────
export function videoPath(publicId: string, version: number, ext: 'mp4' | 'jpg' = 'mp4'): string {
  return `/videa/v${version}/${publicId.split('/').map(encodeURIComponent).join('/')}.${ext}`;
}

export function parseVideoPath(parts: string[]): { version: number; publicId: string; ext: 'mp4' | 'jpg' } | null {
  if (parts.length < 3 || parts.length > 7) return null;
  const vm = /^v(\d{1,12})$/.exec(parts[0]);
  const last = parts[parts.length - 1];
  const em = /^([\w.-]{1,120})\.(mp4|jpg)$/.exec(last);
  if (!vm || !em) return null;
  const id = [...parts.slice(1, -1), em[1]];
  if (id[0] !== 'isport' || !id.every((x) => /^[\w.-]{1,120}$/.test(x) && x !== '..' && x !== '.')) return null;
  return { version: Number(vm[1]), publicId: id.join('/'), ext: em[2] as 'mp4' | 'jpg' };
}

export function videoSourceUrl(cloud: string, publicId: string, version: number, ext: 'mp4' | 'jpg'): string {
  const id = publicId.split('/').map(encodeURIComponent).join('/');
  return ext === 'mp4'
    ? `https://res.cloudinary.com/${cloud}/video/upload/q_auto,vc_h264,c_limit,w_1920/v${version}/${id}.mp4`
    : `https://res.cloudinary.com/${cloud}/video/upload/so_1,c_limit,w_1600,q_auto/v${version}/${id}.jpg`;
}
