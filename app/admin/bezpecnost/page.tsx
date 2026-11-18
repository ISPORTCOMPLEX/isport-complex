import type { Metadata } from 'next';
import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/staff';
import { AdmHead, Empty, Panel, Stat, EVENT_LABEL, fmtDateTime, reasonText } from '@/components/admin/ui';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Bezpečnosť') };
}

const PER_PAGE = 50;
const BOT_REASONS = ['honeypot', 'too-fast', 'no-stamp', 'bad-stamp'];

type Props = { searchParams: Promise<{ typ?: string | string[]; vysledok?: string | string[]; ip?: string | string[]; p?: string | string[] }> };
const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');

export default async function BezpecnostPage({ searchParams }: Props) {
  const t = await getT();
  await requireStaff('security.view', '/admin/bezpecnost');
  const sp = await searchParams;
  const typ = Object.keys(EVENT_LABEL).includes(one(sp.typ)) ? one(sp.typ) : '';
  const vysledok = ['ok', 'chyba'].includes(one(sp.vysledok)) ? one(sp.vysledok) : '';
  const ip = one(sp.ip).slice(0, 64);
  const page = Math.max(1, Math.min(200, Number.parseInt(one(sp.p), 10) || 1));
  const day = new Date(Date.now() - 24 * 3600 * 1000);

  const where: Prisma.SecurityEventWhereInput = {};
  if (typ) where.type = typ;
  if (vysledok) where.ok = vysledok === 'ok';
  if (ip) where.ip = ip;

  const [events, total, okLogins, badLogins, bots, disposable, topIps] = await Promise.all([
    prisma.securityEvent.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.securityEvent.count({ where }),
    prisma.securityEvent.count({ where: { type: { in: ['login', 'login-2fa'] }, ok: true, createdAt: { gte: day } } }),
    prisma.securityEvent.count({ where: { type: { in: ['login', 'login-2fa'] }, ok: false, createdAt: { gte: day } } }),
    prisma.securityEvent.count({ where: { reason: { in: BOT_REASONS }, createdAt: { gte: day } } }),
    prisma.securityEvent.count({ where: { reason: { in: ['disposable-list', 'disposable-mx'] }, createdAt: { gte: day } } }),
    prisma.securityEvent.groupBy({
      by: ['ip'],
      where: { ok: false, createdAt: { gte: day }, ip: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { ip: 'desc' } },
      take: 8,
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const href = (over: Record<string, string | number>) => {
    const m = { typ, vysledok, ip, p: page, ...over };
    const params = new URLSearchParams();
    if (m.typ) params.set('typ', String(m.typ));
    if (m.vysledok) params.set('vysledok', String(m.vysledok));
    if (m.ip) params.set('ip', String(m.ip));
    if (Number(m.p) > 1) params.set('p', String(m.p));
    const s = params.toString();
    return `/admin/bezpecnost${s ? `?${s}` : ''}`;
  };

  return (
    <div className="adm__stack">
      <AdmHead title={t('Bezpečnosť')} sub={t('Prihlásenia, registrácie a zastavené útoky')} />

      <div className="adm-stats">
        <Stat label={t('Úspešné prihlásenia')} value={okLogins} note={t('za 24 h')} tone="ok" />
        <Stat label={t('Neúspešné prihlásenia')} value={badLogins} note={t('za 24 h')} tone={badLogins > 20 ? 'red' : undefined} />
        <Stat label={t('Zastavení boti')} value={bots} note={t('skryté pole a časová pasca, 24 h')} />
        <Stat label={t('Dočasné e-maily')} value={disposable} note={t('odmietnuté registrácie, 24 h')} />
      </div>

      <div className="adm-grid adm-grid--wide">
        <Panel title={t('Záznamy')}>
          <form className="adm-filterbar" action="/admin/bezpecnost">
            <select name="typ" defaultValue={typ} className="adm-select" aria-label={t('Typ udalosti')}>
              <option value="">{t('Všetky typy')}</option>
              {Object.entries(EVENT_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {t(v)}
                </option>
              ))}
            </select>
            <select name="vysledok" defaultValue={vysledok} className="adm-select" aria-label={t('Výsledok')}>
              <option value="">{t('Úspech aj chyba')}</option>
              <option value="ok">{t('Len úspešné')}</option>
              <option value="chyba">{t('Len neúspešné')}</option>
            </select>
            <input name="ip" defaultValue={ip} placeholder={t('IP adresa')} className="adm-input" aria-label={t('IP adresa')} maxLength={64} />
            <button className="btn btn--sm">{t('Filtrovať')}</button>
            {typ || vysledok || ip ? (
              <Link href="/admin/bezpecnost" className="link-red">
                {t('Zrušiť filter')}
              </Link>
            ) : null}
          </form>

          {events.length === 0 ? (
            <Empty>{t('Žiadne záznamy.')}</Empty>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>{t('Čas')}</th>
                    <th>{t('Udalosť')}</th>
                    <th>{t('Výsledok')}</th>
                    <th>{t('E-mail / účet')}</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id}>
                      <td className="nowrap">{fmtDateTime(e.createdAt, t)}</td>
                      <td>{EVENT_LABEL[e.type] ? t(EVENT_LABEL[e.type]) : e.type}</td>
                      <td>
                        <span className={`adm-dot ${e.ok ? 'adm-dot--ok' : 'adm-dot--bad'}`} /> {e.ok ? 'OK' : t('Chyba')}
                        {e.reason ? <small className="muted"> · {reasonText(e.reason, t)}</small> : null}
                      </td>
                      <td>{e.userId ? <Link href={`/admin/zakaznici/${e.userId}`}>{e.email ?? t('účet')}</Link> : (e.email ?? <span className="muted">—</span>)}</td>
                      <td>{e.ip ? <Link href={href({ ip: e.ip, p: 1 })}>{e.ip}</Link> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {pages > 1 ? (
            <nav className="adm-pager" aria-label={t('Stránkovanie')}>
              {page > 1 ? <Link href={href({ p: page - 1 })}>{t('← Novšie')}</Link> : <span />}
              <span className="muted">
                {t('Strana {page} z {pages}', { page, pages })} 
              
              </span>
              {page < pages ? <Link href={href({ p: page + 1 })}>{t('Staršie →')}</Link> : <span />}
            </nav>
          ) : null}
        </Panel>

        <Panel title={t('Najviac neúspechov (24 h)')}>
          {topIps.length === 0 ? (
            <Empty>{t('Žiadne neúspešné pokusy.')}</Empty>
          ) : (
            <ul className="adm-iplist">
              {topIps.map((r) => (
                <li key={r.ip}>
                  <Link href={href({ ip: r.ip ?? '', vysledok: '', typ: '', p: 1 })}>{r.ip}</Link>
                  <b>{r._count._all}</b>
                </li>
              ))}
            </ul>
          )}
          <p className="muted adm-note">{t('Limity a zámky účtov fungujú automaticky. Pri trvalom útoku z jednej adresy ju zablokujeme vo Verceli (Firewall).')}</p>
        </Panel>
      </div>
    </div>
  );
}
