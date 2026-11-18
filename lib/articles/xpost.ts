import 'server-only';

// Náhľad príspevku zo siete X bez ich skriptu: server si stiahne verejné údaje príspevku
// (rovnaký zdroj, aký používa X pre vložené príspevky) a web ich vykreslí sám.
// Fotky idú cez našu doménu (/api/x/media), takže prehliadač návštevníka X nekontaktuje
// a prísna CSP ostáva bez zmeny. Keď X neodpovie, článok ukáže kartu s odkazom.

export type XPost = {
  url: string;
  name: string;
  handle: string;
  avatar: string | null;
  verified: boolean;
  text: string;
  date: Date | null;
  photos: { src: string; w: number; h: number }[];
  video: { poster: string; w: number; h: number } | null;
  likes: number | null;
  replies: number | null;
};

const idFrom = (url: string) => /\/status\/(\d{5,25})/.exec(url)?.[1] ?? null;

// token, ktorý vyžaduje verejný zdroj vložených príspevkov
const token = (id: string) => ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');

// https://pbs.twimg.com/media/ABC.jpg → /api/x/media?p=media/ABC.jpg
export function xMedia(src: string | undefined | null, size?: 'small' | 'medium'): string | null {
  if (!src) return null;
  const m = /^https:\/\/pbs\.twimg\.com\/((?:media|profile_images|ext_tw_video_thumb|amplify_video_thumb|tweet_video_thumb)\/[\w./-]+?\.(?:jpg|jpeg|png|webp))$/i.exec(src);
  return m ? `/api/x/media?p=${encodeURIComponent(m[1])}${size ? `&s=${size}` : ''}` : null;
}

type Raw = {
  text?: string;
  display_text_range?: [number, number];
  created_at?: string;
  favorite_count?: number;
  conversation_count?: number;
  user?: { name?: string; screen_name?: string; profile_image_url_https?: string; is_blue_verified?: boolean; verified?: boolean };
  mediaDetails?: { type?: string; media_url_https?: string; original_info?: { width?: number; height?: number } }[];
  entities?: { urls?: { url?: string; expanded_url?: string; display_url?: string }[] };
};

export async function getXPost(url: string): Promise<XPost | null> {
  const id = idFrom(url);
  if (!id) return null;
  try {
    const res = await fetch(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=sk&token=${token(id)}`, {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 6 * 3600 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const j = (await res.json()) as Raw;
    if (!j?.user?.screen_name) return null;
    // text bez koncových odkazov na fotky (t.co); skrátené odkazy nahradíme čitateľnou adresou
    const chars = Array.from(j.text ?? '');
    const [a, b] = j.display_text_range ?? [0, chars.length];
    let text = chars.slice(a, b).join('');
    for (const u of j.entities?.urls ?? []) if (u.url && u.display_url) text = text.split(u.url).join(u.display_url);
    text = text.replace(/https:\/\/t\.co\/\w+/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    const media = j.mediaDetails ?? [];
    const photos = media
      .filter((m) => m.type === 'photo')
      .slice(0, 4)
      .map((m) => ({ src: xMedia(m.media_url_https, 'medium'), w: m.original_info?.width ?? 1200, h: m.original_info?.height ?? 675 }))
      .filter((p): p is { src: string; w: number; h: number } => p.src !== null);
    const v = media.find((m) => m.type === 'video' || m.type === 'animated_gif');
    const poster = v ? xMedia(v.media_url_https, 'medium') : null;
    const date = j.created_at ? new Date(j.created_at) : null;
    return {
      url,
      name: j.user.name ?? j.user.screen_name,
      handle: j.user.screen_name,
      avatar: xMedia(j.user.profile_image_url_https?.replace('_normal.', '_bigger.')),
      verified: Boolean(j.user.is_blue_verified || j.user.verified),
      text,
      date: date && !Number.isNaN(date.getTime()) ? date : null,
      photos,
      video: poster ? { poster, w: v?.original_info?.width ?? 1280, h: v?.original_info?.height ?? 720 } : null,
      likes: typeof j.favorite_count === 'number' ? j.favorite_count : null,
      replies: typeof j.conversation_count === 'number' ? j.conversation_count : null,
    };
  } catch {
    return null;
  }
}
