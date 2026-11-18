import type { Metadata } from 'next';
import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/staff';
import { AdmHead, Chip, Empty, Panel, ago, INQUIRY_STATUS } from '@/components/admin/ui';
import { getT } from '@/lib/i18n/server';
import { msg } from '@/lib/i18n/translate';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Dopyty') };
}

const FILTERS = [
  { key: 'nove', label: msg('Nové'), where: { status: 'NEW' } },
  { key: 'riesi-sa', label: msg('Rieši sa'), where: { status: 'IN_PROGRESS' } },
  { key: 'vybavene', label: msg('Vybavené'), where: { status: 'DONE' } },
  { key: 'vsetky', label: msg('Všetky'), where: { status: { not: 'SPAM' } } },
  { key: 'spam', label: msg('Spam'), where: { status: 'SPAM' } },
] as const;

type Props = { searchParams: Promise<{ f?: string | string[] }> };

export default async function DopytyPage({ searchParams }: Props) {
  const t = await getT();
  await requireStaff('inquiries.manage', '/admin/dopyty');
  const sp = await searchParams;
  const f = FILTERS.find((x) => x.key === sp.f) ?? FILTERS[0];
  const rows = await prisma.inquiry.findMany({ where: f.where as Prisma.InquiryWhereInput, orderBy: { createdAt: 'desc' }, take: 100 });

  return (
    <div className="adm__stack">
      <AdmHead title={t('Dopyty')} sub={t('Správy z kontaktného formulára a dopyty klubov na sezónny prenájom.')} />
      <nav className="adm-filters u-start" aria-label={t('Filter')}>
        {FILTERS.map((x) => (
          <Link key={x.key} href={`/admin/dopyty?f=${x.key}`} aria-current={f.key === x.key ? 'true' : undefined}>
            {t(x.label)}
          </Link>
        ))}
      </nav>
      <Panel>
        {rows.length === 0 ? (
          <Empty>{t('Žiadne dopyty v tomto filtri.')}</Empty>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table adm-table--rows">
              <thead>
                <tr>
                  <th>{t('Od')}</th>
                  <th>{t('Typ')}</th>
                  <th>{t('Predmet')}</th>
                  <th>{t('Prijatý')}</th>
                  <th>{t('Stav')}</th>
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
                    <td>{r.type === 'CLUB' ? <Chip tone="blue">{t('Klub')}</Chip> : <span className="muted">{t('Kontakt')}</span>}</td>
                    <td>{r.subject ?? '—'}</td>
                    <td className="nowrap">{ago(r.createdAt, t)}</td>
                    <td>
                      <Chip tone={INQUIRY_STATUS[r.status].tone}>{t(INQUIRY_STATUS[r.status].label)}</Chip>
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
