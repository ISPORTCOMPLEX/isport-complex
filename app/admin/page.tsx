import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireStaff, can } from '@/lib/staff';
import { AdmHead, Chip, Empty, Panel, Stat, ago, fmtDateTime } from '@/components/admin/ui';
import { getBookingSettings } from '@/lib/booking/settings';
import { emailEnabled } from '@/lib/email';
import { AREA_SHORT } from '@/lib/booking/format';
import { addDays, euros, fmtRange, hallTime, todayIso } from '@/lib/booking/time';

export const metadata: Metadata = { title: 'Prehľad' };

const today = new Intl.DateTimeFormat('sk-SK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bratislava' });

export default async function AdminHome() {
  const me = await requireStaff('dashboard');
  const now = Date.now();
  const day = new Date(now - 24 * 3600 * 1000);
  const week = new Date(now - 7 * 24 * 3600 * 1000);
  const live = { deletedAt: null };

  const [total, newWeek, unverified, with2fa, banned, locked, failed24, botBlocked24, recent] = await Promise.all([
    prisma.user.count({ where: live }),
    prisma.user.count({ where: { ...live, createdAt: { gte: week } } }),
    prisma.user.count({ where: { ...live, emailVerifiedAt: null } }),
    prisma.user.count({ where: { ...live, twoFactorEnabledAt: { not: null } } }),
    prisma.user.count({ where: { ...live, bannedAt: { not: null } } }),
    prisma.user.findMany({ where: { ...live, lockedUntil: { gt: new Date() } }, select: { id: true, email: true, lockedUntil: true }, take: 5 }),
    prisma.securityEvent.count({ where: { type: { in: ['login', 'login-2fa'] }, ok: false, createdAt: { gte: day } } }),
    prisma.securityEvent.count({
      where: { ok: false, createdAt: { gte: day }, reason: { in: ['honeypot', 'too-fast', 'no-stamp', 'bad-stamp', 'disposable-list', 'disposable-mx'] } },
    }),
    prisma.user.findMany({
      where: live,
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, firstName: true, lastName: true, email: true, createdAt: true, emailVerifiedAt: true, role: true },
    }),
  ]);

  const suspiciousIps = can(me.role, 'security.view')
    ? await prisma.securityEvent.groupBy({
        by: ['ip'],
        where: { ok: false, createdAt: { gte: day }, ip: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { ip: 'desc' } },
        having: { ip: { _count: { gte: 10 } } },
        take: 5,
      })
    : [];

  const showBookings = can(me.role, 'bookings.view');
  const t = todayIso();
  const todayStart = hallTime(t, 0);
  const todayEnd = hallTime(addDays(t, 1), 0);
  const weekStart = new Date(now - 6 * 24 * 3600 * 1000);
  const settings = await getBookingSettings();
  const todays = showBookings
    ? await prisma.booking.findMany({ where: { startsAt: { gte: todayStart, lt: todayEnd }, status: { not: 'CANCELLED' } }, orderBy: { startsAt: 'asc' } })
    : [];
  const weekCents = showBookings
    ? ((await prisma.booking.aggregate({ where: { startsAt: { gte: weekStart, lt: new Date(now) }, status: { in: ['CONFIRMED', 'COMPLETED'] } }, _sum: { priceCents: true } }))._sum.priceCents ?? 0)
    : 0;
  const unpaidPast = showBookings ? await prisma.booking.count({ where: { status: 'CONFIRMED', paymentStatus: 'UNPAID', endsAt: { lt: new Date(now) } } }) : 0;
  const halfHoursToday = (settings.closeHour - settings.openHour) * 2;
  const usedToday = todays.reduce((sum, b) => sum + b.hours * (b.area === 'FULL' ? 2 : 1), 0);
  const waiting = todays.filter((b) => b.status === 'CONFIRMED' && !b.checkedInAt && b.endsAt > new Date(now)).length;

  const attention: { text: string; sub: string; href?: string }[] = [];
  if (showBookings && unpaidPast > 0) attention.push({ text: `${unpaidPast} odohraných rezervácií bez platby`, sub: 'Skontroluj platby na recepcii alebo prevodom', href: '/admin/rezervacie?f=nezaplatene' });
  if (unverified > 0 && can(me.role, 'users.view'))
    attention.push({ text: `${unverified} ${unverified === 1 ? 'účet čaká' : 'účty čakajú'} na aktiváciu`, sub: emailEnabled() ? 'Zákazník ešte neklikol na odkaz v e-maile' : 'E-maily nie sú spustené – over zákazníka a aktivuj účet', href: '/admin/zakaznici?f=neovereni' });
  for (const u of locked) attention.push({ text: `Zamknutý účet ${u.email}`, sub: `Po neúspešných prihláseniach, do ${fmtDateTime(u.lockedUntil)}`, href: `/admin/zakaznici/${u.id}` });
  for (const ip of suspiciousIps) attention.push({ text: `Veľa neúspešných pokusov z IP ${ip.ip}`, sub: `${ip._count._all} za posledných 24 hodín`, href: `/admin/bezpecnost?ip=${encodeURIComponent(ip.ip ?? '')}` });
  if (!me.twoFactorEnabledAt) attention.push({ text: 'Zapni si dvojstupňové overenie', sub: 'Povinné pre personál', href: '/ucet/zabezpecenie' });

  return (
    <div className="adm__stack">
      <AdmHead title="Prehľad" sub={<span style={{ textTransform: 'capitalize' }}>{today.format(new Date())}</span>}>
        {showBookings ? (
          <Link href="/admin/kalendar" className="btn btn--sm">
            Kalendár ľadu
          </Link>
        ) : null}
      </AdmHead>

      {showBookings ? (
        <div className="adm-stats">
          <Stat label="Rezervácie dnes" value={todays.length} note={`${waiting} ešte čakajú na príchod`} />
          <Stat label="Obsadenosť dnes" value={`${halfHoursToday ? Math.round((usedToday / halfHoursToday) * 100) : 0} %`} note={`${settings.openHour}:00 – ${settings.closeHour}:00`} />
          <Stat label="Tržby za 7 dní" value={euros(weekCents)} note="odohrané rezervácie" />
          <Stat label="Nezaplatené po termíne" value={unpaidPast} tone={unpaidPast > 0 ? 'warn' : undefined} />
        </div>
      ) : null}

      <div className="adm-stats">
        <Stat label="Registrovaní zákazníci" value={total} note={`+${newWeek} za posledných 7 dní`} />
        <Stat label="Neoverený e-mail" value={unverified} note="čakajú na kliknutie v e-maile" tone={unverified > 0 ? 'warn' : undefined} />
        <Stat label="Účty s 2FA" value={total ? `${Math.round((with2fa / total) * 100)} %` : '0 %'} note={`${with2fa} z ${total}`} tone="ok" />
        <Stat label="Neúspešné prihlásenia" value={failed24} note={`za 24 h · ${botBlocked24} zastavených botov`} tone={failed24 > 20 ? 'red' : undefined} />
      </div>

      <div className="adm-grid">
        <Panel title="Nové registrácie" action={can(me.role, 'users.view') ? { href: '/admin/zakaznici', label: 'Všetci zákazníci' } : undefined}>
          {recent.length === 0 ? (
            <Empty>Zatiaľ sa nikto nezaregistroval.</Empty>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Zákazník</th>
                    <th>Registrácia</th>
                    <th>Stav</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((u) => (
                    <tr key={u.id}>
                      <td>
                        {can(me.role, 'users.view') ? (
                          <Link href={`/admin/zakaznici/${u.id}`} className="adm-person">
                            <strong>
                              {u.firstName} {u.lastName}
                            </strong>
                            <small>{u.email}</small>
                          </Link>
                        ) : (
                          <span className="adm-person">
                            <strong>
                              {u.firstName} {u.lastName}
                            </strong>
                            <small>{u.email}</small>
                          </span>
                        )}
                      </td>
                      <td>{ago(u.createdAt)}</td>
                      <td>{u.emailVerifiedAt ? <Chip tone="ok">Overený</Chip> : <Chip tone="warn">Neoverený</Chip>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Vyžaduje pozornosť">
          {attention.length === 0 ? (
            <Empty>Všetko je v poriadku.</Empty>
          ) : (
            <ul className="adm-attn">
              {attention.map((a, i) => (
                <li key={i}>
                  {a.href ? (
                    <Link href={a.href}>
                      <strong>{a.text}</strong>
                      <small>{a.sub}</small>
                    </Link>
                  ) : (
                    <>
                      <strong>{a.text}</strong>
                      <small>{a.sub}</small>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          {banned > 0 ? <p className="muted adm-note">Zablokované účty: {banned}</p> : null}
        </Panel>
      </div>

      {showBookings ? (
        <Panel title="Dnes na ľade" action={{ href: '/admin/kalendar', label: 'Otvoriť kalendár' }}>
          {todays.length === 0 ? (
            <Empty>Dnes nie sú žiadne rezervácie.</Empty>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table adm-table--rows">
                <thead>
                  <tr>
                    <th>Čas</th>
                    <th>Zákazník</th>
                    <th>Plocha</th>
                    <th>Platba</th>
                    <th>Stav</th>
                  </tr>
                </thead>
                <tbody>
                  {todays.map((b) => (
                    <tr key={b.id}>
                      <td className="nowrap">
                        <Link href={`/admin/rezervacie/${b.id}`} className="adm-person">
                          <strong>{fmtRange(b.startsAt, b.endsAt)}</strong>
                          <small>{b.code}</small>
                        </Link>
                      </td>
                      <td>
                        <span className="adm-person">
                          <strong>{b.teamName || b.contactName}</strong>
                          <small>{b.contactPhone}</small>
                        </span>
                      </td>
                      <td>{AREA_SHORT[b.area]}</td>
                      <td>{b.paymentStatus === 'PAID' ? <Chip tone="ok">Zaplatená</Chip> : <Chip tone="warn">{euros(b.priceCents)}</Chip>}</td>
                      <td>{b.status === 'NO_SHOW' ? <Chip tone="red">Neprišiel</Chip> : b.checkedInAt ? <Chip tone="ok">Prišiel</Chip> : <Chip tone="blue">Čaká</Chip>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      ) : null}
    </div>
  );
}
