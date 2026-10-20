import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/staff';
import { getBookingSettings } from '@/lib/booking/settings';
import { getSite } from '@/lib/siteSettings';
import { AdmHead } from '@/components/admin/ui';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { SiteForm } from '@/components/admin/SiteForm';

export const metadata: Metadata = { title: 'Nastavenia' };

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function NastaveniaPage({ searchParams }: Props) {
  await requireStaff('settings.manage', '/admin/nastavenia');
  const tab = (await searchParams).tab === 'firma' ? 'firma' : 'cennik';
  const [s, site] = await Promise.all([getBookingSettings(), getSite()]);
  return (
    <div className="adm__stack">
      <AdmHead
        title="Nastavenia"
        sub={tab === 'cennik' ? 'Ceny sú v eurách s DPH za 60 minút. Zmena platí pre nové rezervácie.' : 'Kontakty, otváracie hodiny a fakturačné údaje sa hneď zobrazia na webe.'}
      />
      <nav className="adm-filters" aria-label="Sekcie" style={{ alignSelf: 'flex-start' }}>
        <Link href="/admin/nastavenia" aria-current={tab === 'cennik' ? 'true' : undefined}>
          Cenník a rezervácie
        </Link>
        <Link href="/admin/nastavenia?tab=firma" aria-current={tab === 'firma' ? 'true' : undefined}>
          Firma a kontakty
        </Link>
      </nav>
      {tab === 'cennik' ? <SettingsForm s={s} /> : <SiteForm s={site} />}
    </div>
  );
}
