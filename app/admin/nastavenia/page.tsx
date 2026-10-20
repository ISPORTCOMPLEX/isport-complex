import type { Metadata } from 'next';
import { requireStaff } from '@/lib/staff';
import { getBookingSettings } from '@/lib/booking/settings';
import { AdmHead } from '@/components/admin/ui';
import { SettingsForm } from '@/components/admin/SettingsForm';

export const metadata: Metadata = { title: 'Cenník a nastavenia' };

export default async function NastaveniaPage() {
  await requireStaff('settings.manage', '/admin/nastavenia');
  const s = await getBookingSettings();
  return (
    <div className="adm__stack">
      <AdmHead title="Cenník a nastavenia" sub="Ceny sú v eurách s DPH za 60 minút. Zmena platí pre nové rezervácie, existujúce ostávajú za pôvodnú cenu." />
      <SettingsForm s={s} />
    </div>
  );
}
