// Bloky článku – spoločné pre editor (prehliadač) aj server. Všetko, čo príde z prehliadača,
// prejde cez normalizeBlocks(): neznáme typy a polia sa zahodia, text sa očistí (sanitizeInline).

export type Img = { publicId: string; version: number; width: number; height: number };

export type Block =
  | { id: string; type: 'text'; html: string }
  | { id: string; type: 'heading'; text: string }
  | { id: string; type: 'image'; img: Img; alt: string; caption: string }
  | { id: string; type: 'gallery'; images: (Img & { alt: string })[]; caption: string }
  | { id: string; type: 'video'; source: 'upload'; video: Img & { duration: number }; caption: string }
  | { id: string; type: 'youtube'; youtubeId: string; caption: string }
  | { id: string; type: 'quote'; text: string; author: string }
  | { id: string; type: 'button'; label: string; href: string }
  | { id: string; type: 'divider' };

export type BlockType = Block['type'];

export type Cover = Img & { alt: string; caption: string };

export const CATEGORIES = [
  { key: 'novinky', label: 'Novinky' },
  { key: 'turnaje', label: 'Turnaje a zápasy' },
  { key: 'kempy', label: 'Kempy a nábor' },
  { key: 'oznamy', label: 'Oznamy' },
] as const;
export type CategoryKey = (typeof CATEGORIES)[number]['key'];
export const isCategory = (v: string): v is CategoryKey => CATEGORIES.some((c) => c.key === v);
export const categoryLabel = (v: string) => CATEGORIES.find((c) => c.key === v)?.label ?? 'Novinky';

const MAX_BLOCKS = 200;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const int = (v: unknown, min: number, max: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

// ───────────── Bezpečný text: povolené len <b> <strong> <i> <em> <u> <a href> <br> <ul> <ol> <li> ─────────────
const ALLOWED = new Set(['b', 'strong', 'i', 'em', 'u', 'a', 'br', 'ul', 'ol', 'li']);
const VOID = new Set(['br']);

export function safeHref(href: string): string | null {
  const h = href.trim().replace(/&amp;/g, '&');
  if (/^https?:\/\/[^\s"'<>]+$/i.test(h)) return h;
  if (/^mailto:[^\s"'<>]+$/i.test(h) || /^tel:\+?[\d\s/-]{5,20}$/i.test(h)) return h;
  if (/^\/(?!\/)[^\s"'<>\\]*$/.test(h)) return h; // cesta na našom webe
  return null;
}

const escapeText = (t: string) => t.replace(/&(?!(?:[a-z]{2,8}|#\d{1,6}|#x[0-9a-f]{1,5});)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (t: string) => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function sanitizeInline(input: string, max = 20000): string {
  const html = input.slice(0, max).replace(/<!--[\s\S]*?(-->|$)/g, '');
  // celé <script>, <style>, <iframe>… aj s obsahom preč
  const noBlocks = html.replace(/<(script|style|iframe|object|embed|svg|math|template|noscript|textarea|select)\b[\s\S]*?(<\/\1\s*>|$)/gi, '');
  const out: string[] = [];
  const open: string[] = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(noBlocks))) {
    out.push(escapeText(noBlocks.slice(last, m.index)));
    last = re.lastIndex;
    const closing = m[1] === '/';
    let tag = m[2].toLowerCase();
    if (tag === 'div' || tag === 'p') tag = 'br'; // zalomenie z contentEditable
    if (!ALLOWED.has(tag)) continue;
    if (tag === 'strong') tag = 'b';
    if (tag === 'em') tag = 'i';
    if (VOID.has(tag)) {
      if (!closing || m[2].toLowerCase() !== 'br') out.push('<br>');
      continue;
    }
    if (closing) {
      const i = open.lastIndexOf(tag);
      if (i === -1) continue;
      while (open.length > i) out.push(`</${open.pop()}>`);
      continue;
    }
    if (tag === 'a') {
      const hm = /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(m[3]);
      const href = hm ? safeHref(hm[2] ?? hm[3] ?? hm[4] ?? '') : null;
      if (!href) continue; // odkaz bez bezpečnej adresy – text ostane, značka nie
      const ext = /^https?:/i.test(href);
      out.push(`<a href="${escAttr(href)}"${ext ? ' target="_blank" rel="noopener noreferrer nofollow"' : ''}>`);
    } else out.push(`<${tag}>`);
    open.push(tag);
  }
  out.push(escapeText(noBlocks.slice(last)));
  while (open.length) out.push(`</${open.pop()}>`);
  return out
    .join('')
    .replace(/(<br>\s*){3,}/g, '<br><br>')
    .replace(/^(\s*<br>)+|(<br>\s*)+$/g, '')
    .trim();
}

export function plainText(html: string): string {
  return html
    .replace(/<br>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function img(v: unknown): Img | null {
  const o = (v ?? {}) as Record<string, unknown>;
  const publicId = str(o.publicId, 300);
  const version = int(o.version, 1, 99_999_999_999);
  const width = int(o.width, 1, 20000);
  const height = int(o.height, 1, 20000);
  if (!/^isport\/clanky\/[\w./-]{1,200}$/.test(publicId) || publicId.includes('..') || !version || !width || !height) return null;
  return { publicId, version, width, height };
}

export function youtubeIdFrom(input: string): string | null {
  const t = input.trim();
  if (/^[\w-]{11}$/.test(t)) return t;
  const m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/.exec(t);
  return m ? m[1] : null;
}

const blockId = (v: unknown) => (typeof v === 'string' && /^[\w-]{4,40}$/.test(v) ? v : Math.random().toString(36).slice(2, 12));

export function normalizeBlock(raw: unknown): Block | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const id = blockId(o.id);
  switch (o.type) {
    case 'text': {
      const html = sanitizeInline(str(o.html, 20000));
      return { id, type: 'text', html };
    }
    case 'heading':
      return { id, type: 'heading', text: plainText(str(o.text, 300)) };
    case 'image': {
      const i = img(o.img);
      return i ? { id, type: 'image', img: i, alt: plainText(str(o.alt, 200)), caption: plainText(str(o.caption, 300)) } : null;
    }
    case 'gallery': {
      const images = (Array.isArray(o.images) ? o.images : [])
        .slice(0, 60)
        .map((x) => {
          const i = img(x);
          return i ? { ...i, alt: plainText(str((x as Record<string, unknown>).alt, 200)) } : null;
        })
        .filter((x): x is Img & { alt: string } => x !== null);
      return images.length ? { id, type: 'gallery', images, caption: plainText(str(o.caption, 300)) } : null;
    }
    case 'video': {
      const v = img(o.video);
      const duration = int((o.video as Record<string, unknown> | undefined)?.duration, 0, 36000) ?? 0;
      return v ? { id, type: 'video', source: 'upload', video: { ...v, duration }, caption: plainText(str(o.caption, 300)) } : null;
    }
    case 'youtube': {
      const yid = youtubeIdFrom(str(o.youtubeId, 200));
      return yid ? { id, type: 'youtube', youtubeId: yid, caption: plainText(str(o.caption, 300)) } : null;
    }
    case 'quote':
      return { id, type: 'quote', text: plainText(str(o.text, 1000)), author: plainText(str(o.author, 160)) };
    case 'button': {
      const href = safeHref(str(o.href, 500)) ?? '/rezervacia';
      return { id, type: 'button', label: plainText(str(o.label, 80)) || 'Rezervovať ľad', href };
    }
    case 'divider':
      return { id, type: 'divider' };
    default:
      return null;
  }
}

export function normalizeBlocks(raw: unknown): Block[] {
  return (Array.isArray(raw) ? raw : [])
    .slice(0, MAX_BLOCKS)
    .map(normalizeBlock)
    .filter((b): b is Block => b !== null);
}

export function normalizeCover(raw: unknown): Cover | null {
  const i = img(raw);
  if (!i) return null;
  const o = raw as Record<string, unknown>;
  return { ...i, alt: plainText(str(o.alt, 200)), caption: plainText(str(o.caption, 300)) };
}

// Odhad času čítania (200 slov za minútu) – z textu, nadpisov a citátov.
export function readMinutes(title: string, perex: string, blocks: Block[]): number {
  const text = [title, perex, ...blocks.map((b) => (b.type === 'text' ? plainText(b.html) : b.type === 'heading' ? b.text : b.type === 'quote' ? b.text : ''))].join(' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// Adresa článku bez diakritiky: „Nábor detí 2026!“ → „nabor-deti-2026“
export function slugify(input: string): string {
  return (
    input
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      .replace(/-+$/g, '') || 'clanok'
  );
}

export function galleryImages(blocks: Block[]): (Img & { alt: string })[] {
  const out: (Img & { alt: string })[] = [];
  for (const b of blocks) {
    if (b.type === 'image') out.push({ ...b.img, alt: b.alt });
    if (b.type === 'gallery') out.push(...b.images);
  }
  return out;
}
