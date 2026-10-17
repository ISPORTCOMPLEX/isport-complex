import type { Metadata } from 'next';
import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireStaff, ROLE_LABEL, STAFF_ROLES } from '@/lib/staff';
import { AdmHead, Chip, Empty, Panel, ago, fmtDate } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'Zákazníci a kluby' };

const PER_PAGE = 25;
const FILTERS = [
  { key: 'vsetci', label: 'Všetci' },
  { key: 'neovereni', label: 'Neoverení' },
  { key: 'zamknuti', label: 'Zamknutí' },
  { key: 'zablokovani', label: 'Zablokovaní' },
  { key: 'personal', label: 'Personál' },
] as const;

type Props = { searchParams: Promise<{ q?: string | string[]; f?: string | string[]; p?: string | string[] }> };

function one(v: string | string[] | undefined): string {
  return typeof v === 'string' ? v : '';
}

export default async function ZakazniciPage({ searchParams }: Props) {
  await requireStaff('users.view', '/admin/zakaznici');
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 100);
  const f = FILTERS.some((x) => x.key === one(sp.f)) ? one(sp.f) : 'vsetci';
  const page = Math.max(1, Math.min(1000, Number.parseInt(one(sp.p), 10) || 1));

  const where: Prisma.UserWhereInput = { deletedAt: null };
  if (q) {
    where.OR = [
      { email: { contains: q, mode: 'insensitive' } },
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q.replace(/\s/g, '') } },
    ];
  }
  if (f === 'neovereni') where.emailVerifiedAt = null;
  if (f === 'zamknuti') where.lockedUntil = { gt: new Date() };
  if (f === 'zablokovani') where.bannedAt = { not: null };
  if (f === 'personal') where.role = { in: [...STAFF_ROLES] };

  const [count, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        emailVerifiedAt: true,
        twoFactorEnabledAt: true,
        bannedAt: true,
        lockedUntil: true,
      },
    }),
  ]);

  const lastLogins = users.length
    ? await prisma.securityEvent.groupBy({
        by: ['userId'],
        where: { userId: { in: users.map((u) => u.id) }, type: { in: ['login', 'login-2fa'] }, ok: true },
        _max: { createdAt: true },
      })
    : [];
  const lastLogin = new Map<string | null, Date | null>(lastLogins.map((r) => [r.userId, r._max.createdAt]));
  const pages = Math.max(1, Math.ceil(count / PER_PAGE));
  const href = (over: Record<string, string | number>) => {
    const params = new URLSearchParams();
    const merged = { q, f, p: page, ...over };
    if (merged.q) params.set('q', String(merged.q));
    if (merged.f && merged.f !== 'vsetci') params.set('f', String(merged.f));
    if (Number(merged.p) > 1) params.set('p', String(merged.p));
    const s = params.toString();
    return `/admin/zakaznici${s ? `?${s}` : ''}`;
  };

  return (
    <div className="adm__stack">
      <AdmHead title="Zákazníci a kluby" sub={`${count} ${count === 1 ? 'účet' : count >= 2 && count <= 4 ? 'účty' : 'účtov'}`} />

      <div className="adm-toolbar">
        <form className="adm-search" action="/admin/zakaznici" role="search">
          {f !== 'vsetci' ? <input type="hidden" name="f" value={f} /> : null}
          <input type="search" name="q" defaultValue={q} placeholder="Hľadať meno, e-mail alebo telefón" aria-label="Hľadať zákazníka" maxLength={100} />
          <button type="submit" className="btn btn--sm">
            Hľadať
          </button>
        </form>
        <nav className="seg adm-filters" aria-label="Filter">
          {FILTERS.map((x) => (
            <Link key={x.key} href={href({ f: x.key, p: 1 })} aria-current={f === x.key ? 'true' : undefined}>
              {x.label}
            </Link>
          ))}
        </nav>
      </div>

      <Panel>
        {users.length === 0 ? (
          <Empty>{q ? `Pre „${q}“ sme nič nenašli.` : 'Žiadne účty v tomto filtri.'}</Empty>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table adm-table--rows">
              <thead>
                <tr>
                  <th>Zákazník</th>
                  <th>Telefón</th>
                  <th>Rola</th>
                  <th>Stav</th>
                  <th>2FA</th>
                  <th>Registrácia</th>
                  <th>Posledné prihlásenie</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <Link href={`/admin/zakaznici/${u.id}`} className="adm-person">
                        <strong>
                          {u.firstName} {u.lastName}
                        </strong>
                        <small>{u.email}</small>
                      </Link>
                    </td>
                    <td>{u.phone ?? <span className="muted">—</span>}</td>
                    <td>{u.role === 'CUSTOMER' ? <span className="muted">Zákazník</span> : <Chip tone={u.role === 'ADMIN' ? 'red' : 'blue'}>{ROLE_LABEL[u.role]}</Chip>}</td>
                    <td>
                      {u.bannedAt ? (
                        <Chip tone="red">Zablokovaný</Chip>
                      ) : u.lockedUntil && u.lockedUntil > new Date() ? (
                        <Chip tone="warn">Zamknutý</Chip>
                      ) : u.emailVerifiedAt ? (
                        <Chip tone="ok">Aktívny</Chip>
                      ) : (
                        <Chip tone="warn">Neoverený</Chip>
                      )}
                    </td>
                    <td>{u.twoFactorEnabledAt ? <Chip tone="ok">Áno</Chip> : <span className="muted">Nie</span>}</td>
                    <td>{fmtDate(u.createdAt)}</td>
                    <td>{ago(lastLogin.get(u.id) ?? null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 ? (
          <nav className="adm-pager" aria-label="Stránkovanie">
            {page > 1 ? <Link href={href({ p: page - 1 })}>← Predchádzajúca</Link> : <span />}
            <span className="muted">
              Strana {page} z {pages}
            </span>
            {page < pages ? <Link href={href({ p: page + 1 })}>Ďalšia →</Link> : <span />}
          </nav>
        ) : null}
      </Panel>
    </div>
  );
}
