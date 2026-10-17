import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireStaff, can } from '@/lib/staff';
import { AdmHead, Chip, Empty, Panel, Stat, ago, fmtDateTime } from '@/components/admin/ui';

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

  const attention: { text: string; sub: string; href?: string }[] = [];
  for (const u of locked) attention.push({ text: `Zamknutý účet ${u.email}`, sub: `Po neúspešných prihláseniach, do ${fmtDateTime(u.lockedUntil)}`, href: `/admin/zakaznici/${u.id}` });
  for (const ip of suspiciousIps) attention.push({ text: `Veľa neúspešných pokusov z IP ${ip.ip}`, sub: `${ip._count._all} za posledných 24 hodín`, href: `/admin/bezpecnost?ip=${encodeURIComponent(ip.ip ?? '')}` });
  if (!me.twoFactorEnabledAt) attention.push({ text: 'Zapni si dvojstupňové overenie', sub: 'Povinné pre personál', href: '/ucet/zabezpecenie' });

  return (
    <div className="adm__stack">
      <AdmHead title="Prehľad" sub={<span style={{ textTransform: 'capitalize' }}>{today.format(new Date())}</span>}>
        <span className="btn btn--sm adm-disabled" aria-disabled="true" title="Pribudne s rezerváciami">
          Nová rezervácia
        </span>
      </AdmHead>

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

      <Panel title="Dnes na ľade" className="adm-panel--soon">
        <Empty>Rezervácie, obsadenosť a tržby sa tu zobrazia po spustení rezervačného systému (ďalšia fáza).</Empty>
      </Panel>
    </div>
  );
}
