import type { Metadata } from 'next';
import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireStaff, can } from '@/lib/staff';
import { AREA_SHORT, METHOD_LABEL, STATUS_LABEL } from '@/lib/booking/format';
import { addDays, euros, fmtDayShort, fmtRange, hallTime, todayIso } from '@/lib/booking/time';
import { AdmHead, Chip, Empty, Panel } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'Rezervácie' };

const PER_PAGE = 30;
const FILTERS = [
  { key: 'dnes', label: 'Dnes' },
  { key: 'nadchadzajuce', label: 'Nadchádzajúce' },
  { key: 'nezaplatene', label: 'Nezaplatené' },
  { key: 'minule', label: 'Minulé' },
  { key: 'zrusene', label: 'Zrušené' },
] as const;

type Props = { searchParams: Promise<{ f?: string | string[]; q?: string | string[]; p?: string | string[] }> };
const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');

export default async function AdminRezervacie({ searchParams }: Props) {
  const me = await requireStaff('bookings.view', '/admin/rezervacie');
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 60);
  const f = FILTERS.some((x) => x.key === one(sp.f)) ? one(sp.f) : q ? '' : 'dnes';
  const page = Math.max(1, Math.min(500, Number.parseInt(one(sp.p), 10) || 1));
  const now = new Date();
  const today = todayIso();

  const where: Prisma.BookingWhereInput = {};
  let orderBy: Prisma.BookingOrderByWithRelationInput = { startsAt: 'asc' };
  if (f === 'dnes') {
    where.startsAt = { gte: hallTime(today, 0), lt: hallTime(addDays(today, 1), 0) };
    where.status = { not: 'CANCELLED' };
  } else if (f === 'nadchadzajuce') {
    where.startsAt = { gte: now };
    where.status = 'CONFIRMED';
  } else if (f === 'nezaplatene') {
    where.paymentStatus = 'UNPAID';
    where.status = { in: ['CONFIRMED', 'COMPLETED'] };
  } else if (f === 'minule') {
    where.endsAt = { lt: now };
    where.status = { not: 'CANCELLED' };
    orderBy = { startsAt: 'desc' };
  } else if (f === 'zrusene') {
    where.status = 'CANCELLED';
    orderBy = { cancelledAt: 'desc' };
  } else {
    orderBy = { startsAt: 'desc' };
  }
  if (q) {
    where.OR = [
      { code: { contains: q.toUpperCase() } },
      { contactName: { contains: q, mode: 'insensitive' } },
      { teamName: { contains: q, mode: 'insensitive' } },
      { contactPhone: { contains: q.replace(/\s/g, '') } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [count, rows] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({ where, orderBy, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { user: { select: { email: true } } } }),
  ]);
  const pages = Math.max(1, Math.ceil(count / PER_PAGE));
  const href = (over: Record<string, string | number>) => {
    const m = { f, q, p: page, ...over };
    const params = new URLSearchParams();
    if (m.f) params.set('f', String(m.f));
    if (m.q) params.set('q', String(m.q));
    if (Number(m.p) > 1) params.set('p', String(m.p));
    const s = params.toString();
    return `/admin/rezervacie${s ? `?${s}` : ''}`;
  };

  return (
    <div className="adm__stack">
      <AdmHead title="Rezervácie" sub={`${count} ${count === 1 ? 'rezervácia' : count >= 2 && count <= 4 ? 'rezervácie' : 'rezervácií'}`}>
        <Link href="/admin/kalendar" className="btn btn--sm btn--ghost">
          Kalendár
        </Link>
        {can(me.role, 'bookings.manage') ? (
          <Link href="/admin/rezervacie/nova" className="btn btn--sm">
            Nová rezervácia
          </Link>
        ) : null}
      </AdmHead>

      <div className="adm-toolbar">
        <form className="adm-search" action="/admin/rezervacie" role="search">
          <input type="search" name="q" defaultValue={q} placeholder="Kód, meno, tím, telefón alebo e-mail" aria-label="Hľadať rezerváciu" maxLength={60} />
          <button type="submit" className="btn btn--sm">
            Hľadať
          </button>
        </form>
        <nav className="adm-filters" aria-label="Filter">
          {FILTERS.map((x) => (
            <Link key={x.key} href={href({ f: x.key, q: '', p: 1 })} aria-current={f === x.key ? 'true' : undefined}>
              {x.label}
            </Link>
          ))}
        </nav>
      </div>

      <details className="adm-export">
        <summary>Export do Excelu (CSV)</summary>
        <form action="/api/admin/export" method="get" className="adm-inline-form">
          <label className="adm-label u-f200">
            Od
            <input type="date" name="od" defaultValue={addDays(today, -30)} className="adm-input" required />
          </label>
          <label className="adm-label u-f200">
            Do
            <input type="date" name="do" defaultValue={today} className="adm-input" required />
          </label>
          <button type="submit" className="btn btn--sm">
            Stiahnuť CSV
          </button>
          <p className="muted">Podľa dátumu tréningu, všetky stavy vrátane zrušených. Otvorí sa priamo v Exceli.</p>
        </form>
      </details>

      <Panel>
        {rows.length === 0 ? (
          <Empty>{q ? `Pre „${q}“ sme nič nenašli.` : 'Žiadne rezervácie v tomto filtri.'}</Empty>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table adm-table--rows">
              <thead>
                <tr>
                  <th>Termín</th>
                  <th>Plocha</th>
                  <th>Zákazník</th>
                  <th>Telefón</th>
                  <th>Cena</th>
                  <th>Platba</th>
                  <th>Stav</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.id}>
                    <td className="nowrap">
                      <Link href={`/admin/rezervacie/${b.id}`} className="adm-person">
                        <strong>
                          {fmtDayShort(b.startsAt)} · {fmtRange(b.startsAt, b.endsAt)}
                        </strong>
                        <small>{b.code}</small>
                      </Link>
                    </td>
                    <td>{AREA_SHORT[b.area]}</td>
                    <td>
                      <span className="adm-person">
                        <strong>{b.teamName || b.contactName}</strong>
                        <small>{b.teamName ? b.contactName : (b.user?.email ?? b.guestEmail ?? 'bez účtu')}</small>
                      </span>
                    </td>
                    <td className="nowrap">{b.contactPhone || '—'}</td>
                    <td className="nowrap">{euros(b.priceCents)}</td>
                    <td>
                      {b.paymentStatus === 'PAID' ? <Chip tone="ok">Zaplatená</Chip> : b.paymentStatus === 'REFUNDED' ? <Chip tone="blue">Vrátená</Chip> : <Chip tone="warn">{METHOD_LABEL[b.paymentMethod]}</Chip>}
                    </td>
                    <td>
                      {b.status === 'CANCELLED' ? (
                        <Chip tone="muted">Zrušená</Chip>
                      ) : b.status === 'NO_SHOW' ? (
                        <Chip tone="red">Neprišiel</Chip>
                      ) : b.checkedInAt ? (
                        <Chip tone="ok">Prišiel</Chip>
                      ) : (
                        <Chip tone="blue">{STATUS_LABEL[b.status]}</Chip>
                      )}
                    </td>
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
