import { msg } from '@/lib/i18n/translate';
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
  | { id: string; type: 'xpost'; url: string; author: string; text: string; date: string }
  | { id: string; type: 'divider' };

export type BlockType = Block['type'];

export type Cover = Img & { alt: string; caption: string };

export const CATEGORIES = [
  { key: 'novinky', label: msg('Novinky') },
  { key: 'turnaje', label: msg('Turnaje a zápasy') },
  { key: 'kempy', label: msg('Kempy a nábor') },
  { key: 'oznamy', label: msg('Oznamy') },
] as const;
export type CategoryKey = (typeof CATEGORIES)[number]['key'];
export const isCategory = (v: string): v is CategoryKey => CATEGORIES.some((c) => c.key === v);
export const categoryLabel = (v: string) => CATEGORIES.find((c) => c.key === v)?.label ?? msg('Novinky');

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

// Príspevok zo siete X: len odkaz na konkrétny príspevok (x.com alebo twitter.com/…/status/číslo).
// Na webe sa zobrazí ako karta bez cudzieho skriptu – text príspevku vloží autor článku sám.
export function xPostUrl(input: string): string | null {
  const m = /^(?:https?:\/\/)?(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/status(?:es)?\/(\d{5,25})/i.exec(input.trim());
  return m ? `https://x.com/${m[1]}/status/${m[2]}` : null;
}
export const xHandle = (url: string) => /x\.com\/([A-Za-z0-9_]{1,15})\//.exec(url)?.[1] ?? '';

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
    case 'xpost': {
      const url = xPostUrl(str(o.url, 300));
      return url ? { id, type: 'xpost', url, author: plainText(str(o.author, 80)), text: plainText(str(o.text, 1200)), date: plainText(str(o.date, 40)) } : null;
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
  const text = [title, perex, ...blocks.map((b) => (b.type === 'text' ? plainText(b.html) : b.type === 'heading' ? b.text : b.type === 'quote' ? b.text : b.type === 'xpost' ? b.text : ''))].join(' ');
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

// Textový blok, v ktorom je len odkaz na príspevok z X (vložená adresa alebo jeden odkaz) –
// na webe sa zobrazí ako náhľad príspevku, rovnako ako blok „Príspevok z X“.
export function lonelyXUrl(html: string): string | null {
  const hrefs = [...html.matchAll(/href\s*=\s*"([^"]+)"/gi)].map((m) => m[1].replace(/&amp;/g, '&'));
  const text = plainText(html).trim();
  if (hrefs.length > 1) return null;
  if (hrefs.length === 1) {
    const url = xPostUrl(hrefs[0]);
    // odkaz musí byť jediný obsah bloku (text odkazu môže byť ľubovoľný krátky)
    return url && text.length <= 160 && !/[.!?]\s+\S/.test(text) ? url : null;
  }
  return /^\S+$/.test(text) ? xPostUrl(text) : null;
}

// Textový blok rozdelený na časti: riadky, v ktorých je len odkaz na príspevok z X, sa stanú náhľadom,
// zvyšok ostane textom. (Riadky oddeľuje <br>; zoznamy sa nedelia.)
export type TextPart = { html: string } | { x: string };
export function splitXParts(html: string): TextPart[] {
  if (/<(ul|ol)\b/i.test(html)) {
    const u = lonelyXUrl(html);
    return [u ? { x: u } : { html }];
  }
  const lines = html.split(/<br\s*\/?>/i);
  const out: TextPart[] = [];
  let buf: string[] = [];
  const flush = () => {
    // prázdne riadky na začiatku a konci časti zahodíme (medzeru robí odsadenie bloku)
    while (buf.length && !buf[0].trim()) buf.shift();
    while (buf.length && !buf[buf.length - 1].trim()) buf.pop();
    if (buf.length) out.push({ html: buf.join('<br>') });
    buf = [];
  };
  for (const line of lines) {
    const u = line.trim() ? lonelyXUrl(line) : null;
    if (u) {
      flush();
      out.push({ x: u });
    } else buf.push(line);
  }
  flush();
  return out;
}
