import type { Metadata } from 'next';
import { requireStaff } from '@/lib/staff';
import { AdmHead } from '@/components/admin/ui';
import { ReceptionScanner } from '@/components/admin/ReceptionScanner';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Recepcia') };
}

export default async function RecepciaPage() {
  const t = await getT();
  await requireStaff('bookings.view', '/admin/recepcia');
  return (
    <div className="adm__stack">
      <AdmHead title={t('Recepcia')} sub={t('Naskenuj QR kód zo vstupenky zákazníka alebo zadaj kód rezervácie.')} />
      <ReceptionScanner />
    </div>
  );
}
