import type { Metadata } from 'next';
import { requireStaff } from '@/lib/staff';
import { AdmHead } from '@/components/admin/ui';
import { ReceptionScanner } from '@/components/admin/ReceptionScanner';

export const metadata: Metadata = { title: 'Recepcia' };

export default async function RecepciaPage() {
  await requireStaff('bookings.view', '/admin/recepcia');
  return (
    <div className="adm__stack">
      <AdmHead title="Recepcia" sub="Naskenuj QR kód zo vstupenky zákazníka alebo zadaj kód rezervácie." />
      <ReceptionScanner />
    </div>
  );
}
