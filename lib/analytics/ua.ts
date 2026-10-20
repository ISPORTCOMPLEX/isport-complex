// Hrubé rozpoznanie zariadenia a prehliadača z User-Agent. Žiadny fingerprinting.
const BOT = /bot|crawl|spider|slurp|bing|yandex|baidu|duckduck|facebookexternalhit|embedly|preview|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch|go-http|java\/|httpclient|okhttp|scrapy|phantom|selenium|playwright|puppeteer/i;

export function isBot(ua: string): boolean {
  return !ua || ua.length < 20 || BOT.test(ua);
}

export function device(ua: string): 'mobile' | 'tablet' | 'desktop' {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return 'tablet';
  if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(ua)) return 'mobile';
  return 'desktop';
}

export function browser(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\/|opera/i.test(ua)) return 'Opera';
  if (/samsungbrowser/i.test(ua)) return 'Samsung';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua)) return 'Safari';
  return 'Iný';
}

export function os(ua: string): string {
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/android/i.test(ua)) return 'Android';
  if (/windows/i.test(ua)) return 'Windows';
  if (/mac os x|macintosh/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Iný';
}

// Zdroj návštevy z domény odkazujúcej stránky.
export function sourceOf(refHost: string | null, utm: string | null): string {
  if (utm) return utm.toLowerCase().slice(0, 40);
  if (!refHost) return 'Priamo';
  const h = refHost.toLowerCase();
  if (/google\./.test(h)) return 'Google';
  if (/bing\.|duckduckgo|seznam|yahoo|ecosia/.test(h)) return 'Vyhľadávače';
  if (/facebook|fb\.|instagram|messenger/.test(h)) return 'Facebook / Instagram';
  if (/tiktok/.test(h)) return 'TikTok';
  if (/youtube|youtu\.be/.test(h)) return 'YouTube';
  if (/whatsapp|t\.me|telegram|viber/.test(h)) return 'Messengery';
  return 'Odkazy';
}
