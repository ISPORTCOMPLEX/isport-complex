import 'server-only';
import { cache } from 'react';
import { prisma } from './prisma';
import { cloudName, imageUrl } from './cloudinary';

// Miesta na webe, kam sa dajú nahrať fotky.
export const SLOTS = [
  { key: 'komplex', label: 'Celý komplex', where: 'úvod, budova zvonka' },
  { key: 'ladova-plocha', label: 'Ľadová plocha', where: 'stránka Ľadová plocha' },
  { key: 'skyboxy', label: 'Skyboxy', where: 'úvod a stránka Bufet a skyboxy' },
  { key: 'bufet', label: 'Bufet', where: 'úvod a stránka Bufet a skyboxy' },
  { key: 'ihrisko', label: 'Futbalové ihrisko', where: 'úvod a stránka Ihrisko' },
  { key: 'posilnovna', label: 'Posilňovňa', where: 'úvod a stránka Fitness a wellness' },
  { key: 'wellness', label: 'Wellness', where: 'úvod a stránka Fitness a wellness' },
] as const;
export type SlotKey = (typeof SLOTS)[number]['key'];
export const isSlot = (v: string): v is SlotKey => SLOTS.some((s) => s.key === v);

export type WebPhoto = { id: string; alt: string; width: number; height: number; src: string; srcSet: string };

const WIDTHS = [480, 800, 1200, 1600, 2000];

export function toWebPhoto(p: { id: string; publicId: string; version: number; alt: string; width: number; height: number }, ratio?: string): WebPhoto | null {
  const cloud = cloudName();
  if (!cloud) return null;
  const widths = WIDTHS.filter((w) => w <= Math.max(p.width, 480));
  return {
    id: p.id,
    alt: p.alt,
    width: p.width,
    height: p.height,
    src: imageUrl(cloud, p.publicId, p.version, 1200, ratio),
    srcSet: widths.map((w) => `${imageUrl(cloud, p.publicId, p.version, w, ratio)} ${w}w`).join(', '),
  };
}

// Všetky fotky naraz, raz za požiadavku (hlavička aj stránka zdieľajú výsledok).
export const photosBySlot = cache(async (): Promise<Record<string, { id: string; publicId: string; version: number; alt: string; width: number; height: number }[]>> => {
  const rows = await prisma.photo.findMany({ orderBy: [{ slot: 'asc' }, { sort: 'asc' }, { createdAt: 'asc' }], select: { id: true, publicId: true, version: true, alt: true, width: true, height: true, slot: true } });
  const out: Record<string, typeof rows> = {};
  for (const r of rows) (out[r.slot] ??= []).push(r);
  return out;
});

export async function slotPhotos(slot: SlotKey, ratio?: string): Promise<WebPhoto[]> {
  const all = await photosBySlot();
  return (all[slot] ?? []).map((p) => toWebPhoto(p, ratio)).filter((p): p is WebPhoto => p !== null);
}
