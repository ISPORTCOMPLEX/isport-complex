import 'server-only';
import { cache } from 'react';
import { prisma } from './prisma';
import { site as defaults, type Site } from './site';

// Údaje o firme a hale. Základ je v lib/site.ts, administrátor ich prepíše v Administrácia → Nastavenia.

export type SiteExtra = { iban: string; bankName: string; notifyEmail: string };
export type SiteFull = Site & SiteExtra;

const KEY = 'site';

const s = (v: unknown, fallback: string, max = 300) => (typeof v === 'string' ? v.slice(0, max).trim() : fallback);

export function mergeSite(raw: unknown): SiteFull {
  const r = (raw ?? {}) as Record<string, any>;
  const d = defaults;
  return {
    ...d,
    phone: s(r.phone, d.phone, 40),
    email: s(r.email, d.email, 200),
    hall: { street: s(r.hall?.street, d.hall.street), city: s(r.hall?.city, d.hall.city), mapUrl: s(r.hall?.mapUrl, d.hall.mapUrl, 500) },
    company: {
      name: s(r.company?.name, d.company.name),
      street: s(r.company?.street, d.company.street),
      city: s(r.company?.city, d.company.city),
      ico: s(r.company?.ico, d.company.ico, 20),
      dic: s(r.company?.dic, d.company.dic, 20),
      icDph: s(r.company?.icDph, d.company.icDph, 20),
      register: s(r.company?.register, d.company.register),
    },
    social: { facebook: s(r.social?.facebook, d.social.facebook, 300), instagram: s(r.social?.instagram, d.social.instagram, 300) },
    hours: Array.isArray(r.hours)
      ? d.hours.map((h, i) => ({ days: h.days, time: s(r.hours[i]?.time, h.time, 60) }))
      : d.hours,
    iban: s(r.iban, '', 40),
    bankName: s(r.bankName, '', 100),
    notifyEmail: s(r.notifyEmail, '', 200),
  };
}

export const getSite = cache(async (): Promise<SiteFull> => {
  try {
    const row = await prisma.setting.findUnique({ where: { key: KEY } });
    return mergeSite(row?.value);
  } catch {
    return mergeSite(null);
  }
});

export async function saveSite(value: SiteFull, userId: string): Promise<void> {
  const v = JSON.parse(
    JSON.stringify({
      phone: value.phone,
      email: value.email,
      hall: value.hall,
      company: value.company,
      social: value.social,
      hours: value.hours,
      iban: value.iban,
      bankName: value.bankName,
      notifyEmail: value.notifyEmail,
    }),
  );
  await prisma.setting.upsert({ where: { key: KEY }, create: { key: KEY, value: v, updatedBy: userId }, update: { value: v, updatedBy: userId } });
}
