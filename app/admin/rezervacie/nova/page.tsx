import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/staff';
import { getBookingSettings } from '@/lib/booking/settings';
import { dayAvailability } from '@/lib/booking/availability';
import { addDays, fmtDayLong, hallTime, isIsoDate, todayIso } from '@/lib/booking/time';
import { AdmHead, Panel } from '@/components/admin/ui';
import { AdminBookingForm } from '@/components/admin/AdminBookingForm';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Nová rezervácia') };
}

type Props = { searchParams: Promise<{ datum?: string | string[] }> };
const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');

export default async function NovaRezervacia({ searchParams }: Props) {
  const t = await getT();
  await requireStaff('bookings.manage', '/admin/rezervacie/nova');
  const sp = await searchParams;
  const iso = isIsoDate(one(sp.datum)) ? one(sp.datum) : todayIso();
  const s = await getBookingSettings();
  const now = Date.now();
  const slots = (await dayAvailability(s, iso)).map((x) => ({
    hour: x.hour,
    free: hallTime(iso, x.hour + 1).getTime() > now && x.free,
    price: x.price,
  }));

  return (
    <div className="adm__stack">
      <Link href="/admin/rezervacie" className="adm-back">
        {t('← Rezervácie')}
      </Link>
      <AdmHead title={t('Nová rezervácia')} sub={t('Pre zákazníka, ktorý volá alebo prišiel na recepciu. Môže mať účet alebo nie.')} />

      <Panel title={t('1. Deň')}>
        <form action="/admin/rezervacie/nova" className="adm-inline-form u-mt0">
          <label className="adm-label u-f200">
            {t('Dátum')}
            <input type="date" name="datum" defaultValue={iso} className="adm-input" />
          </label>
          <button className="btn btn--sm btn--ghost">{t('Zobraziť voľné hodiny')}</button>
          <span className="muted adm-note u-center">
            {fmtDayLong(hallTime(iso, 12), t)} ·{' '}
            <Link href={`/admin/rezervacie/nova?datum=${addDays(iso, 1)}`} className="link-red">
              {t('ďalší deň →')}
            </Link>
          </span>
        </form>
      </Panel>

      <AdminBookingForm iso={iso} slots={slots} showersEnabled={s.showersEnabled} showerPrice={s.showerPrice} />
    </div>
  );
}
