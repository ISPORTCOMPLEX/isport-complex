// Presmerovať sa dá len na cestu v rámci webu (ochrana proti open redirect).
// Blokuje //evil.com, /\evil.com, https://…, javascript:… aj riadiace znaky.
export function safeRedirect(target: unknown, fallback = '/ucet'): string {
  if (typeof target !== 'string' || target.length === 0 || target.length > 500) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(target)) return fallback;
  if (!target.startsWith('/') || target.startsWith('//')) return fallback;
  try {
    const url = new URL(target, 'http://isport.local');
    if (url.host !== 'isport.local') return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
