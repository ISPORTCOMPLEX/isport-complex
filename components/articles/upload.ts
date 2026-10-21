'use client';

import { signArticleUploadAction, verifyArticleMediaAction } from '@/lib/actions/articles';
import type { MediaKind } from '@/lib/cloudinary';

export type Uploaded = { publicId: string; version: number; width: number; height: number; duration: number };

const IMG = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif'];
const VID = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];

// Súbor ide z prehliadača priamo do úložiska s podpisom od servera; server potom overí podpis odpovede.
export async function uploadMedia(kind: MediaKind, file: File, onProgress?: (p: number) => void): Promise<Uploaded> {
  const okType = kind === 'video' ? VID.includes(file.type) : IMG.includes(file.type);
  if (!okType) throw new Error(kind === 'video' ? 'Video musí byť MP4, MOV alebo WebM.' : 'Fotka musí byť JPG, PNG, WebP, AVIF alebo HEIC.');
  const sig = await signArticleUploadAction(kind);
  if (!sig.ok) throw new Error(sig.error);
  if (file.size > sig.maxBytes) throw new Error(`Súbor je väčší ako ${Math.round(sig.maxBytes / 1024 / 1024)} MB.`);
  const res = await new Promise<{ public_id: string; version: number; signature: string }>((resolve, reject) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(sig.fields)) fd.append(k, String(v));
    fd.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', sig.url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      try {
        const j = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(j);
        else reject(new Error(j?.error?.message ?? `Chyba ${xhr.status}`));
      } catch {
        reject(new Error(`Chyba ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Spojenie s úložiskom zlyhalo. Obnov stránku (F5) a skús znova.'));
    xhr.send(fd);
  });
  const v = await verifyArticleMediaAction(kind, res.public_id, res.version, res.signature);
  if (!v.ok) throw new Error(v.error);
  return { publicId: v.publicId, version: v.version, width: v.width, height: v.height, duration: v.duration };
}

// Náhľad v editore (rovnaké adresy ako na webe – cez našu doménu)
export const thumbUrl = (i: { publicId: string; version: number }, w = 800) => `/obrazky/${w}/o/webp/v${i.version}/${i.publicId.split('/').map(encodeURIComponent).join('/')}`;
export const posterUrl = (i: { publicId: string; version: number }) => `/videa/v${i.version}/${i.publicId.split('/').map(encodeURIComponent).join('/')}.jpg`;
export const videoUrl = (i: { publicId: string; version: number }) => `/videa/v${i.version}/${i.publicId.split('/').map(encodeURIComponent).join('/')}.mp4`;
