import type { Metadata } from 'next';
import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/staff';
import { AdmHead, Chip, Empty, Panel, ago, INQUIRY_STATUS } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'Dopyty' };

const FILTERS = [
  { key: 'nove', label: 'Nové', where: { status: 'NEW' } },
  { key: 'riesi-sa', label: 'Rieši sa', where: { status: 'IN_PROGRESS' } },
  { key: 'vybavene', label: 'Vybavené', where: { status: 'DONE' } },
  { key: 'vsetky', label: 'Všetky', where: { status: { not: 'SPAM' } } },
  { key: 'spam', label: 'Spam', where: { status: 'SPAM' } },
] as const;

type Props = { searchParams: Promise<{ f?: string | string[] }> };

export default async function DopytyPage({ searchParams }: Props) {
  await requireStaff('inquiries.manage', '/admin/dopyty');
  const sp = await searchParams;
  const f = FILTERS.find((x) => x.key === sp.f) ?? FILTERS[0];
  const rows = await prisma.inquiry.findMany({ where: f.where as Prisma.InquiryWhereInput, orderBy: { createdAt: 'desc' }, take: 100 });

  return (
    <div className="adm__stack">
      <AdmHead title="Dopyty" sub="Správy z kontaktného formulára a dopyty klubov na sezónny prenájom." />
      <nav className="adm-filters" aria-label="Filter" style={{ alignSelf: 'flex-start' }}>
        {FILTERS.map((x) => (
          <Link key={x.key} href={`/admin/dopyty?f=${x.key}`} aria-current={f.key === x.key ? 'true' : undefined}>
            {x.label}
          </Link>
        ))}
      </nav>
      <Panel>
        {rows.length === 0 ? (
          <Empty>Žiadne dopyty v tomto filtri.</Empty>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table adm-table--rows">
              <thead>
                <tr>
                  <th>Od</th>
                  <th>Typ</th>
                  <th>Predmet</th>
                  <th>Prijatý</th>
                  <th>Stav</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/admin/dopyty/${r.id}`} className="adm-person">
                        <strong>{r.organization ?? r.name}</strong>
                        <small>{r.organization ? r.name : r.email}</small>
                      </Link>
                    </td>
                    <td>{r.type === 'CLUB' ? <Chip tone="blue">Klub</Chip> : <span className="muted">Kontakt</span>}</td>
                    <td>{r.subject ?? '—'}</td>
                    <td className="nowrap">{ago(r.createdAt)}</td>
                    <td>
                      <Chip tone={INQUIRY_STATUS[r.status].tone}>{INQUIRY_STATUS[r.status].label}</Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
