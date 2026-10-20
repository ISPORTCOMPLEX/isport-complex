import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/staff';
import { AdmHead, Empty, Panel, auditText, fmtDateTime } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'Záznam zmien' };

const PER_PAGE = 50;
type Props = { searchParams: Promise<{ p?: string | string[] }> };

export default async function AuditPage({ searchParams }: Props) {
  await requireStaff('audit.view', '/admin/audit');
  const sp = await searchParams;
  const page = Math.max(1, Math.min(200, Number.parseInt(typeof sp.p === 'string' ? sp.p : '', 10) || 1));
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { actor: { select: { firstName: true, lastName: true, email: true } } },
    }),
    prisma.auditLog.count(),
  ]);
  const targets = await prisma.user.findMany({
    where: { id: { in: rows.map((r) => r.target).filter((t): t is string => Boolean(t)) } },
    select: { id: true, email: true },
  });
  const targetEmail = new Map(targets.map((t) => [t.id, t.email]));
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="adm__stack">
      <AdmHead title="Záznam zmien" sub="Kto, čo a kedy zmenil v administrácii. Záznamy sa nedajú upraviť ani zmazať." />
      <Panel>
        {rows.length === 0 ? (
          <Empty>Zatiaľ žiadne zásahy.</Empty>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Čas</th>
                  <th>Kto</th>
                  <th>Čo</th>
                  <th>Komu</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="nowrap">{fmtDateTime(r.createdAt)}</td>
                    <td>{r.actor ? `${r.actor.firstName} ${r.actor.lastName}` : <span className="muted">zmazaný účet</span>}</td>
                    <td>{auditText(r.action, r.meta)}</td>
                    <td>
                      {!r.target ? (
                        '—'
                      ) : r.action.startsWith('user.') ? (
                        <Link href={`/admin/zakaznici/${r.target}`}>{targetEmail.get(r.target) ?? 'účet'}</Link>
                      ) : r.action.startsWith('booking.') ? (
                        <Link href={`/admin/rezervacie/${r.target}`}>{String((r.meta as Record<string, unknown> | null)?.code ?? 'rezervácia')}</Link>
                      ) : r.action.startsWith('block.') ? (
                        'kalendár'
                      ) : (
                        'nastavenia'
                      )}
                    </td>
                    <td>{r.ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 ? (
          <nav className="adm-pager" aria-label="Stránkovanie">
            {page > 1 ? <Link href={`/admin/audit?p=${page - 1}`}>← Novšie</Link> : <span />}
            <span className="muted">
              Strana {page} z {pages}
            </span>
            {page < pages ? <Link href={`/admin/audit?p=${page + 1}`}>Staršie →</Link> : <span />}
          </nav>
        ) : null}
      </Panel>
    </div>
  );
}
