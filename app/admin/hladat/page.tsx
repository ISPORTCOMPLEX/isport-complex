import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireStaff, can } from '@/lib/staff';
import { AdmHead, Chip, Empty, Panel, fmtDateTime } from '@/components/admin/ui';
import { STATUS_LABEL } from '@/lib/booking/format';
import { euros, fmtDayShort, fmtRange } from '@/lib/booking/time';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Hľadať') };
}

type Props = { searchParams: Promise<{ q?: string }> };

// Globálne vyhľadávanie: rezervácie, zákazníci a dopyty naraz.
export default async function Hladat({ searchParams }: Props) {
  const t = await getT();
  const me = await requireStaff('dashboard', '/admin/hladat');
  const q = (typeof (await searchParams).q === 'string' ? (await searchParams).q! : '').trim().slice(0, 80);
  const digits = q.replace(/[\s+]/g, '');
  const num = /^\d{1,9}$/.test(q) ? Number(q) : null;
  const ok = q.length >= 2;

  const [bookings, users, inquiries] = ok
    ? await Promise.all([
        can(me.role, 'bookings.view')
          ? prisma.booking.findMany({
              where: {
                OR: [
                  { code: { contains: q.toUpperCase() } },
                  ...(num ? [{ number: num }] : []),
                  { contactName: { contains: q, mode: 'insensitive' } },
                  { teamName: { contains: q, mode: 'insensitive' } },
                  ...(digits.length >= 4 ? [{ contactPhone: { contains: digits } }] : []),
                  { guestEmail: { contains: q, mode: 'insensitive' } },
                  { user: { email: { contains: q, mode: 'insensitive' } } },
                ],
              },
              orderBy: { startsAt: 'desc' },
              take: 15,
            })
          : [],
        can(me.role, 'users.view')
          ? prisma.user.findMany({
              where: {
                deletedAt: null,
                OR: [
                  { email: { contains: q, mode: 'insensitive' } },
                  { firstName: { contains: q, mode: 'insensitive' } },
                  { lastName: { contains: q, mode: 'insensitive' } },
                  ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
                ],
              },
              take: 10,
              select: { id: true, firstName: true, lastName: true, email: true, phone: true, createdAt: true },
            })
          : [],
        can(me.role, 'inquiries.manage')
          ? prisma.inquiry.findMany({
              where: {
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { email: { contains: q, mode: 'insensitive' } },
                  { organization: { contains: q, mode: 'insensitive' } },
                  { message: { contains: q, mode: 'insensitive' } },
                ],
              },
              orderBy: { createdAt: 'desc' },
              take: 10,
              select: { id: true, name: true, email: true, organization: true, type: true, createdAt: true, status: true },
            })
          : [],
      ])
    : [[], [], []];
  const total = bookings.length + users.length + inquiries.length;

  return (
    <div className="adm__stack">
      <AdmHead title={t('Hľadať')} sub={ok ? t.n(total, '{n} výsledok pre „{q}“|{n} výsledky pre „{q}“|{n} výsledkov pre „{q}“', { q }) : t('Rezervácie, zákazníci a dopyty na jednom mieste')} />
      <form className="adm-search adm-search--big" action="/admin/hladat" role="search">
        <input type="search" name="q" defaultValue={q} placeholder={t('Kód, číslo, meno, tím, telefón alebo e-mail')} aria-label={t('Hľadať')} maxLength={80} autoFocus />
        <button type="submit" className="btn btn--sm">
          {t('Hľadať')}
        </button>
      </form>
      {!ok ? null : total === 0 ? (
        <Panel>
          <Empty>{t('Nič sme nenašli. Skús kratší výraz alebo len časť mena.')}</Empty>
        </Panel>
      ) : (
        <>
          {bookings.length ? (
            <Panel title={t('Rezervácie ({length})', { length: bookings.length })}>
              <div className="adm-table-wrap">
                <table className="adm-table adm-table--rows">
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id}>
                        <td className="nowrap">
                          <Link href={`/admin/rezervacie/${b.id}`} className="adm-person">
                            <strong>
                              {fmtDayShort(b.startsAt, t)} · {fmtRange(b.startsAt, b.endsAt)}
                            </strong>
                            <small>
                              {t('{code} · č. {number}', { code: b.code, number: b.number })} 
                            
                            </small>
                          </Link>
                        </td>
                        <td>
                          <span className="adm-person">
                            <strong>{b.teamName || b.contactName}</strong>
                            <small>{b.contactPhone}</small>
                          </span>
                        </td>
                        <td className="nowrap">{euros(b.priceCents)}</td>
                        <td>
                          <Chip tone={b.status === 'CANCELLED' ? 'muted' : b.paymentStatus === 'PAID' ? 'ok' : 'warn'}>{b.status === 'CONFIRMED' ? (b.paymentStatus === 'PAID' ? t('Zaplatená') : t('Nezaplatená')) : t(STATUS_LABEL[b.status])}</Chip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ) : null}
          {users.length ? (
            <Panel title={t('Zákazníci ({length})', { length: users.length })}>
              <div className="adm-table-wrap">
                <table className="adm-table adm-table--rows">
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
                        <td>{u.phone ?? '—'}</td>
                        <td className="nowrap muted">{t('od {fmtDateTime}', { fmtDateTime: fmtDateTime(u.createdAt, t) })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ) : null}
          {inquiries.length ? (
            <Panel title={t('Dopyty ({length})', { length: inquiries.length })}>
              <div className="adm-table-wrap">
                <table className="adm-table adm-table--rows">
                  <tbody>
                    {inquiries.map((i) => (
                      <tr key={i.id}>
                        <td>
                          <Link href={`/admin/dopyty/${i.id}`} className="adm-person">
                            <strong>{i.organization || i.name}</strong>
                            <small>{i.email}</small>
                          </Link>
                        </td>
                        <td>{i.type === 'CLUB' ? t('Klub') : t('Kontakt')}</td>
                        <td className="nowrap muted">{fmtDateTime(i.createdAt, t)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ) : null}
        </>
      )}
    </div>
  );
}
