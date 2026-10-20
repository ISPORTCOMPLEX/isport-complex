import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/requestInfo';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl() ?? 'http://localhost:3000';
  return ['', '/ladova-plocha', '/ihrisko', '/fitness-wellness', '/bufet-skyboxy', '/cennik', '/pre-kluby', '/kontakt', '/fotky', '/rezervacia', '/obchodne-podmienky', '/ochrana-osobnych-udajov', '/vyhlasenie-o-pristupnosti'].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: 'weekly' as const,
    priority: p === '' ? 1 : 0.6,
  }));
}
