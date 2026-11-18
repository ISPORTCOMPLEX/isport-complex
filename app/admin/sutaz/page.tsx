import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/staff';
import { ensureLeagueTables } from '@/lib/league/db';
import { AdmHead, Chip, Empty, Panel, ago } from '@/components/admin/ui';
import { TeamBadge } from '@/components/league/ui';
import { createGameAction } from '@/lib/actions/league';
import { todayIso } from '@/lib/booking/time';
import { getT } from '@/lib/i18n/server';
import { TEAM_STATUS } from '@/lib/league/labels';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Súťaž tímov') };
}


type Props = { searchParams: Promise<{ stav?: string; chyba?: string }> };

export default async function AdminSutazPage({ searchParams }: Props) {
  const t = await getT();
  await requireStaff('league.manage', '/admin/sutaz');
  const sp = await searchParams;
  await ensureLeagueTables();
  const [teams, games] = await Promise.all([
    prisma.leagueTeam.findMany({ orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], include: { _count: { select: { players: true } } } }),
    prisma.leagueGame.findMany({ orderBy: { startsAt: 'desc' }, take: 200, include: { home: true, away: true, _count: { select: { goals: true } } } }),
  ]);
  const approved = teams.filter((x) => x.status === 'APPROVED');
  const order = { PENDING: 0, APPROVED: 1, REJECTED: 2 } as Record<string, number>;
  teams.sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3));
  const fmt = new Intl.DateTimeFormat(t.intl, { timeZone: 'Europe/Bratislava', weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="adm__stack">
      <AdmHead
        title={t('Súťaž tímov')}
        sub={
          <>
            {t('Prihlášky tímov, súpisky, zápasy a výsledky. Verejne:')} <Link href="/sutaz">/sutaz</Link>
          </>
        }
      />
      {sp.stav ? <div className="alert alert--ok">{sp.stav === 'zmazane' ? t('Zmazané.') : t('Uložené.')}</div> : null}
      {sp.chyba === 'zapas' ? <div className="alert alert--error">{t('Zápas sa nepodarilo vytvoriť – vyber dva rôzne schválené tímy, dátum a čas.')}</div> : null}

      <Panel title={t('Tímy')}>
        {teams.length === 0 ? (
          <Empty>{t('Zatiaľ sa neprihlásil žiadny tím. Prihláška je na stránke /sutaz/registracia.')}</Empty>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table adm-table--rows">
              <thead>
                <tr>
                  <th>{t('Tím')}</th>
                  <th>{t('Kontakt')}</th>
                  <th>{t('Hráči')}</th>
                  <th>{t('Prihlásený')}</th>
                  <th>{t('Stav')}</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <Link href={`/admin/sutaz/tim/${x.id}`} className="adm-person lg-adm-team">
                        <TeamBadge team={x} size="sm" />
                        <span>
                          <strong>{x.name}</strong>
                          <small>{[x.short, x.city].filter(Boolean).join(' · ')}</small>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <span className="adm-person">
                        <strong>{x.contactName}</strong>
                        <small>{x.contactEmail}</small>
                      </span>
                    </td>
                    <td>{x._count.players}</td>
                    <td className="nowrap">{ago(x.createdAt, t)}</td>
                    <td>
                      <Chip tone={TEAM_STATUS[x.status]?.tone ?? 'muted'}>{t(TEAM_STATUS[x.status]?.label ?? x.status)}</Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div id="zapasy" />
      <Panel title={t('Nový zápas')}>
        {approved.length < 2 ? (
          <Empty>{t('Na vytvorenie zápasu treba aspoň dva schválené tímy.')}</Empty>
        ) : (
          <form action={createGameAction} className="adm-inline-form u-mt0">
            <label className="adm-label">
              {t('Domáci')}
              <select name="homeId" className="adm-select" required>
                {approved.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="adm-label">
              {t('Hostia')}
              <select name="awayId" className="adm-select" required defaultValue={approved[1]?.id}>
                {approved.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="adm-label lg-adm-narrow">
              {t('Dátum')}
              <input type="date" name="date" className="adm-input" required defaultValue={todayIso()} />
            </label>
            <label className="adm-label lg-adm-narrow">
              {t('Čas')}
              <input type="time" name="time" className="adm-input" required defaultValue="19:00" step={300} />
            </label>
            <button className="btn btn--sm">{t('Pridať zápas')}</button>
          </form>
        )}
      </Panel>

      <Panel title={t('Zápasy')}>
        {games.length === 0 ? (
          <Empty>{t('Zatiaľ žiadne zápasy.')}</Empty>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table adm-table--rows">
              <thead>
                <tr>
                  <th>{t('Termín')}</th>
                  <th>{t('Zápas')}</th>
                  <th>{t('Skóre')}</th>
                  <th>{t('Góly')}</th>
                  <th>{t('Stav')}</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g) => (
                  <tr key={g.id}>
                    <td className="nowrap">
                      <Link href={`/admin/sutaz/zapas/${g.id}`}>{fmt.format(g.startsAt)}</Link>
                    </td>
                    <td>
                      <Link href={`/admin/sutaz/zapas/${g.id}`} className="lg-adm-match">
                        <TeamBadge team={g.home} size="sm" /> {g.home.name} – {g.away.name} <TeamBadge team={g.away} size="sm" />
                      </Link>
                    </td>
                    <td className="nowrap">
                      {g.homeScore !== null && g.awayScore !== null ? `${g.homeScore}:${g.awayScore}${g.decision === 'OT' ? ' pp' : g.decision === 'SO' ? ' sn' : ''}` : '—'}
                    </td>
                    <td>{g._count.goals}</td>
                    <td>{g.status === 'FINAL' ? <Chip tone="ok">{t('Odohraný')}</Chip> : <Chip tone="blue">{t('Naplánovaný')}</Chip>}</td>
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
