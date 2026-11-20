import 'server-only';
import { cloudinaryConfig, getResource, photoPath, uploadParams } from '@/lib/cloudinary';

// Logá tímov a fotky hráčov. Súbor posiela server (prehliadač úložisko nekontaktuje),
// ukladajú sa do priečinka používateľa isport/sutaz/u-<id>, zobrazujú sa cez našu doménu (/obrazky/…).

export type LImg = { publicId: string; version: number; width: number; height: number };

export const userFolder = (userId: string) => `isport/sutaz/u-${userId}`;

export function readImg(v: unknown): LImg | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const publicId = String(o.publicId ?? '');
  const version = Number(o.version);
  if (!/^isport\/sutaz\/[\w/.-]{1,200}$/.test(publicId) || !Number.isInteger(version)) return null;
  return { publicId, version, width: Number(o.width) || 0, height: Number(o.height) || 0 };
}

// Overí, že obrázok patrí používateľovi (jeho priečinok) a naozaj existuje v úložisku.
export async function verifyOwnImg(v: unknown, userId: string): Promise<LImg | null> {
  const img = readImg(v);
  const cfg = cloudinaryConfig();
  if (!img || !cfg || !img.publicId.startsWith(`${userFolder(userId)}/`)) return null;
  const r = await getResource(cfg, img.publicId).catch(() => null);
  if (!r || r.public_id !== img.publicId) return null;
  return { publicId: r.public_id, version: r.version, width: r.width, height: r.height };
}

// Nahranie zo servera (podpísané parametre ako pri administrácii fotiek).
export async function uploadImage(file: Blob, userId: string): Promise<LImg | null> {
  const cfg = cloudinaryConfig();
  if (!cfg) return null;
  const { url, fields } = uploadParams(cfg, `sutaz/u-${userId}`);
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, String(v));
  fd.set('file', file);
  const res = await fetch(url, { method: 'POST', body: fd, signal: AbortSignal.timeout(20000), cache: 'no-store' }).catch(() => null);
  if (!res?.ok) return null;
  const j = (await res.json()) as { public_id?: string; version?: number; width?: number; height?: number };
  if (!j.public_id || !j.version) return null;
  return { publicId: j.public_id, version: j.version, width: j.width ?? 0, height: j.height ?? 0 };
}

// adresy na našej doméne: logo bez orezania, fotka hráča štvorcová (výrez podľa tváre/obsahu)
export const logoUrl = (img: LImg | null) => (img ? photoPath(img.publicId, img.version, 480, undefined, 'webp') : null);
export const playerPhotoUrl = (img: LImg | null) => (img ? photoPath(img.publicId, img.version, 480, '1:1', 'webp') : null);
