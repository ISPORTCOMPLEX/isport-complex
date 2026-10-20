import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/staff';
import { getBookingSettings } from '@/lib/booking/settings';
import { getSite } from '@/lib/siteSettings';
import { AdmHead, Chip, Panel } from '@/components/admin/ui';
import { prisma } from '@/lib/prisma';
import { getProvider } from '@/lib/payments';
import { PAY_WINDOW_MIN, providerDiagnosis } from '@/lib/payments/config';
import { euros } from '@/lib/booking/time';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { SiteForm } from '@/components/admin/SiteForm';

export const metadata: Metadata = { title: 'Nastavenia' };

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function NastaveniaPage({ searchParams }: Props) {
  await requireStaff('settings.manage', '/admin/nastavenia');
  const t = (await searchParams).tab;
  const tab = t === 'firma' || t === 'platby' ? t : 'cennik';
  const [s, site] = await Promise.all([getBookingSettings(), getSite()]);
  return (
    <div className="adm__stack">
      <AdmHead
        title="Nastavenia"
        sub={
          tab === 'cennik'
            ? 'Ceny sú v eurách s DPH za 60 minút. Zmena platí pre nové rezervácie.'
            : tab === 'firma'
              ? 'Kontakty, otváracie hodiny a fakturačné údaje sa hneď zobrazia na webe.'
              : 'Stav platby kartou online. Zapína sa v nastaveniach Vercelu – postup je v docs/PLATBY.md.'
        }
      />
      <nav className="adm-filters u-start" aria-label="Sekcie">
        <Link href="/admin/nastavenia" aria-current={tab === 'cennik' ? 'true' : undefined}>
          Cenník a rezervácie
        </Link>
        <Link href="/admin/nastavenia?tab=firma" aria-current={tab === 'firma' ? 'true' : undefined}>
          Firma a kontakty
        </Link>
        <Link href="/admin/nastavenia?tab=platby" aria-current={tab === 'platby' ? 'true' : undefined}>
          Platobná brána
        </Link>
      </nav>
      {tab === 'cennik' ? <SettingsForm s={s} /> : tab === 'firma' ? <SiteForm s={site} /> : <PaymentsStatus />}
    </div>
  );
}

// Len stav – žiadne kľúče sa tu nezobrazujú ani neukladajú (sú iba v premenných prostredia na Verceli).
async function PaymentsStatus() {
  const provider = getProvider();
  const problems = providerDiagnosis();
  const since = new Date(Date.now() - 30 * 86400000);
  const [paid, refunded, pending] = await Promise.all([
    prisma.payment.aggregate({ where: { state: 'SUCCEEDED', paidAt: { gte: since } }, _sum: { amountCents: true }, _count: true }),
    prisma.payment.aggregate({ where: { state: 'SUCCEEDED', paidAt: { gte: since } }, _sum: { refundedCents: true } }),
    prisma.booking.count({ where: { status: 'CONFIRMED', paymentStatus: 'PENDING' } }),
  ]);
  return (
    <>
      <Panel title="Stav">
        <p className="u-row10">
          {provider ? <Chip tone="ok">Zapnutá</Chip> : <Chip tone="muted">Vypnutá</Chip>}
          <strong>{provider ? provider.label : 'Platba kartou online je vypnutá'}</strong>
          {provider?.test ? <Chip tone="warn">Testovací režim – žiadne skutočné peniaze</Chip> : null}
        </p>
        {provider ? (
          <p className="muted">Zákazník pri rezervácii vidí možnosť „Kartou online“. Termín podržíme {PAY_WINDOW_MIN} minút, potom sa nezaplatená rezervácia sama zruší.</p>
        ) : (
          <p className="muted">Zákazníci vidia pri platbe „Kartou online – pripravujeme“. Rezervácie fungujú ďalej s platbou na recepcii a prevodom.</p>
        )}
        {problems.length > 0 && process.env.PAYMENTS_PROVIDER && process.env.PAYMENTS_PROVIDER !== 'off' ? (
          <ul className="muted">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        ) : null}
      </Panel>
      <Panel title="Posledných 30 dní">
        <dl className="adm-dl">
          <div>
            <dt>Prijaté platby</dt>
            <dd>
              {paid._count} · {euros(paid._sum.amountCents ?? 0)}
            </dd>
          </div>
          <div>
            <dt>Vrátené</dt>
            <dd>{euros(refunded._sum.refundedCents ?? 0)}</dd>
          </div>
          <div>
            <dt>Teraz čaká na platbu</dt>
            <dd>{pending}</dd>
          </div>
        </dl>
      </Panel>
      <Panel title="Webhook">
        <p className="muted">
          Adresa pre platobnú bránu: <code>/api/platby/webhook</code> na tvojej doméne. Udalosti: checkout.session.completed, checkout.session.async_payment_succeeded,
          checkout.session.async_payment_failed, checkout.session.expired, charge.refunded.
        </p>
      </Panel>
    </>
  );
}
