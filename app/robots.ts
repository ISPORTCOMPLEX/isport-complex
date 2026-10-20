import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/requestInfo';

// Vyhľadávače: verejné stránky áno, účet, administrácia a API nie.
export default function robots(): MetadataRoute.Robots {
  const base = appUrl() ?? 'http://localhost:3000';
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/ucet', '/api', '/rezervacia/', '/prihlasenie', '/registracia', '/obnova-hesla', '/overenie-emailu'] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
