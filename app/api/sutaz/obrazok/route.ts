import { getSessionUser } from '@/lib/session';
import { hitLimit } from '@/lib/rateLimit';
import { logoUrl, playerPhotoUrl, uploadImage } from '@/lib/league/images';

// Nahranie loga tímu alebo fotky hráča (súťaž tímov). Len prihlásený používateľ, len z nášho webu,
// len JPG/PNG/WebP do 3 MB (prehliadač ich pred odoslaním zmenší).
export const runtime = 'nodejs';

const MAX = 3 * 1024 * 1024;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

function kindOf(b: Uint8Array): 'jpg' | 'png' | 'webp' | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'webp';
  return null;
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (!origin || !host || new URL(origin).host !== host) return json({ error: 'Neplatná požiadavka.' }, 403);
  const user = await getSessionUser();
  if (!user) return json({ error: 'Prihlás sa, prosím.' }, 401);
  const limit = await hitLimit(`league:img:${user.id}`, 80, 60 * 60);
  if (!limit.ok) return json({ error: 'Priveľa nahrávaní. Skús to o chvíľu.' }, 429);
  const len = Number(req.headers.get('content-length') ?? '0');
  if (len > MAX + 64 * 1024) return json({ error: 'Obrázok je príliš veľký.' }, 413);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: 'Neplatná požiadavka.' }, 400);
  }
  const file = form.get('file');
  const kind = form.get('kind') === 'logo' ? 'logo' : 'player';
  if (!(file instanceof Blob) || file.size === 0 || file.size > MAX) return json({ error: 'Obrázok je príliš veľký alebo prázdny.' }, 400);
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!kindOf(head)) return json({ error: 'Povolené sú obrázky JPG, PNG alebo WebP.' }, 400);
  const img = await uploadImage(file, user.id);
  if (!img) return json({ error: 'Obrázok sa nepodarilo uložiť. Skús to znova.' }, 502);
  return json({ img, url: kind === 'logo' ? logoUrl(img) : playerPhotoUrl(img) });
}
