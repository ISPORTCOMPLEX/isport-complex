'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/staff';
import { hitLimit } from '@/lib/rateLimit';
import { getRequestInfo } from '@/lib/requestInfo';
import { cloudinaryConfig, destroyResource, getResource, uploadParams, verifyUploadSignature, MAX_BYTES } from '@/lib/cloudinary';
import { isSlot, slotAlt } from '@/lib/media';

// Správa fotiek. Súbor ide z prehliadača priamo do Cloudinary; sem prídu len podpísané údaje o ňom.

const PER_SLOT = 24;

async function audit(actorId: string, action: string, target: string, meta?: Record<string, unknown>) {
  const { ip } = await getRequestInfo();
  await prisma.auditLog.create({ data: { actorId, action, target, meta: meta ? JSON.parse(JSON.stringify(meta)) : undefined, ip } });
}

function refresh() {
  revalidatePath('/', 'layout');
}

export type SignResult = { ok: true; url: string; fields: Record<string, string | number>; maxBytes: number } | { ok: false; error: string };

export async function signUploadAction(slot: string): Promise<SignResult> {
  const me = await requireStaff('media.manage');
  const cfg = cloudinaryConfig();
  if (!cfg) return { ok: false, error: 'Cloudinary nie je nastavené (chýbajú premenné CLOUDINARY_* na serveri).' };
  if (!isSlot(slot)) return { ok: false, error: 'Neznáma časť webu.' };
  const limit = await hitLimit(`media:sign:${me.id}`, 120, 60 * 60);
  if (!limit.ok) return { ok: false, error: 'Príliš veľa nahrávaní za hodinu. Skús to neskôr.' };
  const count = await prisma.photo.count({ where: { slot } });
  if (count >= PER_SLOT) return { ok: false, error: `Pri tejto časti je už ${PER_SLOT} fotiek. Najprv niektoré zmaž.` };
  const { url, fields } = uploadParams(cfg, slot);
  return { ok: true, url, fields, maxBytes: MAX_BYTES };
}

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function savePhotoAction(input: { slot: string; publicId: string; version: number; signature: string; alt?: string }): Promise<SaveResult> {
  const me = await requireStaff('media.manage');
  const cfg = cloudinaryConfig();
  if (!cfg) return { ok: false, error: 'Cloudinary nie je nastavené.' };
  const slot = String(input?.slot ?? '');
  const publicId = String(input?.publicId ?? '').slice(0, 300);
  const version = Number(input?.version);
  const signature = String(input?.signature ?? '').slice(0, 100);
  if (!isSlot(slot) || !/^[\w/.-]+$/.test(publicId) || !Number.isInteger(version) || !/^[a-f0-9]{40}$/.test(signature)) return { ok: false, error: 'Neplatné údaje o fotke.' };
  // 1) podpis odpovede z Cloudinary – fotku nahral náš podpísaný formulár, nie niekto iný
  if (!verifyUploadSignature(cfg, publicId, version, signature)) return { ok: false, error: 'Podpis fotky nesedí.' };
  // 2) skutočné údaje priamo z Cloudinary
  const r = await getResource(cfg, publicId);
  if (!r || r.public_id !== publicId) return { ok: false, error: 'Fotka sa v Cloudinary nenašla.' };
  const inFolder = r.public_id.startsWith(`isport/${slot}/`) || r.asset_folder === `isport/${slot}`;
  if (!inFolder || r.bytes > MAX_BYTES) {
    await destroyResource(cfg, publicId);
    return { ok: false, error: 'Fotka nespĺňa pravidlá a bola odstránená.' };
  }
  const max = await prisma.photo.aggregate({ where: { slot }, _max: { sort: true } });
  await prisma.photo.upsert({
    where: { publicId: r.public_id },
    create: { publicId: r.public_id, version: r.version, slot, alt: String(input?.alt ?? '').trim().slice(0, 200) || slotAlt(slot), width: r.width, height: r.height, format: r.format, bytes: r.bytes, sort: (max._max.sort ?? -1) + 1, createdById: me.id },
    update: {},
  });
  await audit(me.id, 'photo.upload', r.public_id, { slot, bytes: r.bytes });
  refresh();
  return { ok: true };
}

export async function updatePhotoAction(form: FormData): Promise<void> {
  const me = await requireStaff('media.manage');
  const id = String(form.get('id') ?? '').slice(0, 40);
  const op = String(form.get('op') ?? '');
  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) return;
  if (op === 'alt') {
    const typed = String(form.get('alt') ?? '').trim().slice(0, 200);
    await prisma.photo.update({ where: { id }, data: { alt: typed || slotAlt(photo.slot) } });
  } else if (op === 'up' || op === 'down' || op === 'first') {
    const list = await prisma.photo.findMany({ where: { slot: photo.slot }, orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }], select: { id: true } });
    const ids = list.map((p) => p.id);
    const i = ids.indexOf(id);
    const j = op === 'first' ? 0 : op === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= ids.length) return;
    ids.splice(i, 1);
    ids.splice(j, 0, id);
    await prisma.$transaction(ids.map((pid, n) => prisma.photo.update({ where: { id: pid }, data: { sort: n } })));
  } else {
    return;
  }
  await audit(me.id, 'photo.update', photo.publicId, { op });
  refresh();
}

export async function deletePhotoAction(form: FormData): Promise<void> {
  await requireStaff('media.manage');
  const id = String(form.get('id') ?? '').slice(0, 40);
  await removePhotos([id]);
}

// Hromadné mazanie: označené fotky (ids) alebo celá sekcia (all=1 + slot).
export async function deletePhotosAction(form: FormData): Promise<void> {
  await requireStaff('media.manage');
  const slot = String(form.get('slot') ?? '');
  if (form.get('all') === '1' && isSlot(slot)) {
    const rows = await prisma.photo.findMany({ where: { slot }, select: { id: true } });
    await removePhotos(rows.map((r) => r.id));
    return;
  }
  const ids = form.getAll('ids').map((v) => String(v).slice(0, 40)).slice(0, 100);
  await removePhotos(ids);
}

// Zmaže fotku z úložiska aj z databázy. Ak úložisko zlyhá, záznam ostane (aby v úložisku nezostala „sirota“)
// a dá sa zmazať znova.
async function removePhotos(ids: string[]): Promise<void> {
  const me = await requireStaff('media.manage');
  const limit = await hitLimit(`media:delete:${me.id}`, 200, 60 * 60);
  if (!limit.ok || ids.length === 0) return;
  const cfg = cloudinaryConfig();
  const photos = await prisma.photo.findMany({ where: { id: { in: ids } } });
  for (const photo of photos) {
    const gone = cfg ? await destroyResource(cfg, photo.publicId).catch(() => false) : true;
    if (!gone) {
      console.error('[media:delete] úložisko fotku nezmazalo', photo.publicId);
      continue;
    }
    await prisma.photo.delete({ where: { id: photo.id } }).catch(() => undefined);
    await audit(me.id, 'photo.delete', photo.publicId, { slot: photo.slot });
  }
  refresh();
}
