import 'server-only';
import { cache } from 'react';
import { prisma } from './prisma';
import { cloudName, photoPath, IMG_WIDTHS, PANO_WIDTH } from './cloudinary';

// Miesta na webe, kam sa dajú nahrať fotky.
export const SLOTS = [
  { key: 'komplex', label: 'Celý komplex', where: 'úvod, budova zvonka' },
  { key: 'ladova-plocha', label: 'Ľadová plocha', where: 'stránka Ľadová plocha' },
  { key: 'skyboxy', label: 'Skyboxy', where: 'úvod a stránka Bufet a skyboxy' },
  { key: 'bufet', label: 'Bufet', where: 'úvod a stránka Bufet a skyboxy' },
  { key: 'ihrisko', label: 'Futbalové ihrisko', where: 'úvod a stránka Ihrisko' },
  { key: 'posilnovna', label: 'Posilňovňa', where: 'úvod a stránka Fitness a wellness' },
  { key: 'wellness', label: 'Wellness', where: 'úvod a stránka Fitness a wellness' },
  { key: 'prehliadka', label: 'Prehliadka 360°', where: 'stránka Prehliadka 360° (panoramatické fotky v pomere 2:1 z 360° kamery alebo z telefónu – režim Panoráma/Photo Sphere). Kým tu nie je fotka, stránka sa nezobrazuje' },
] as const;
export type SlotKey = (typeof SLOTS)[number]['key'];
export const isSlot = (v: string): v is SlotKey => SLOTS.some((s) => s.key === v);
// 360° panorámy majú vlastnú stránku – v galérii fotiek nie sú (roztiahnutá panoráma by tam pôsobila zle)
export const GALLERY_SLOTS = SLOTS.filter((s) => s.key !== 'prehliadka');
// Náhradný alternatívny text, kým personál nenapíše vlastný (WCAG 1.1.1 – fotka nesmie byť pre čítačku prázdna).
export const slotAlt = (slot: string) => `${SLOTS.find((s) => s.key === slot)?.label ?? 'I-SPORT COMPLEX'} – fotka z I-SPORT COMPLEX Košice`;

export type WebPhoto = { id: string; alt: string; width: number; height: number; src: string; srcSet: string; avif: string; webp: string; thumb: string };


export function toWebPhoto(p: { id: string; publicId: string; version: number; alt: string; width: number; height: number }, ratio?: string): WebPhoto | null {
  const cloud = cloudName();
  if (!cloud) return null;
  const widths = IMG_WIDTHS.filter((w) => w <= Math.max(p.width, 480));
  const set = (fmt: 'avif' | 'webp' | 'jpg') => widths.map((w) => `${photoPath(p.publicId, p.version, w, ratio, fmt)} ${w}w`).join(', ');
  return {
    id: p.id,
    alt: p.alt || 'Fotka z I-SPORT COMPLEX Košice',
    width: p.width,
    height: p.height,
    src: photoPath(p.publicId, p.version, 1200, ratio, 'jpg'),
    srcSet: set('jpg'),
    avif: set('avif'),
    webp: set('webp'),
    thumb: photoPath(p.publicId, p.version, 480, ratio, 'webp'),
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

// ───────────── Fotky v štýle IMDb: sekcia na stránke, prehliadač /fotky/<id>, prehľad /fotky ─────────────

// Stránka webu, kam sekcia fotiek patrí (kam vedie „Zavrieť“ v prehliadači).
export const SLOT_PAGE: Record<SlotKey, string> = {
  komplex: '/',
  'ladova-plocha': '/ladova-plocha',
  skyboxy: '/bufet-skyboxy',
  bufet: '/bufet-skyboxy',
  ihrisko: '/ihrisko',
  posilnovna: '/fitness-wellness',
  wellness: '/fitness-wellness',
  prehliadka: '/prehliadka',
};

export type GalleryPhoto = WebPhoto & { slot: SlotKey; label: string; ratio: number };

// Fotky v pôvodnom tvare (bez orezania) – jednej sekcie alebo všetky, v poradí sekcií a podľa poradia v administrácii.
export async function galleryPhotos(slot?: SlotKey): Promise<GalleryPhoto[]> {
  const all = await photosBySlot();
  const keys = slot ? [slot] : GALLERY_SLOTS.map((s) => s.key);
  const out: GalleryPhoto[] = [];
  for (const key of keys) {
    const label = SLOTS.find((s) => s.key === key)?.label ?? '';
    for (const p of all[key] ?? []) {
      const w = toWebPhoto(p);
      if (w) out.push({ ...w, slot: key, label, ratio: p.width > 0 && p.height > 0 ? p.width / p.height : 1.5 });
    }
  }
  return out;
}

// 360° panorámy: veľká fotka na guľu (4000 px) a náhľad 2:1 do výberu scén
export type Pano = { id: string; title: string; src: string; thumb: string };
export async function panoramas(): Promise<Pano[]> {
  const all = await photosBySlot().catch(() => ({}) as Record<string, never[]>);
  if (!cloudName()) return [];
  return (all.prehliadka ?? []).map((p, i) => ({
    id: p.id,
    title: p.alt && !p.alt.endsWith('– fotka z I-SPORT COMPLEX Košice') ? p.alt : `Pohľad ${i + 1}`,
    src: photoPath(p.publicId, p.version, PANO_WIDTH, undefined, 'jpg'),
    thumb: photoPath(p.publicId, p.version, 480, '2:1', 'webp'),
  }));
}

export async function photoCounts(): Promise<Record<SlotKey, number>> {
  const all = await photosBySlot();
  return Object.fromEntries(SLOTS.map((s) => [s.key, (all[s.key] ?? []).length])) as Record<SlotKey, number>;
}

// Pomer strán → trieda .jr-N (N = pomer × 20, od 0,5 po 2,2). Rozmery bez style="…" (CSP).
export function ratioClass(r: number): string {
  return `jr-${Math.round(Math.min(2.2, Math.max(0.5, r)) * 20)}`;
}
