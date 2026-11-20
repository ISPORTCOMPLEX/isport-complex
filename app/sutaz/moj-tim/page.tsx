import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { ensureLeagueTables } from '@/lib/league/db';
import { compareReports } from '@/lib/league/report';
import { TeamBadge, hhmm, longDay } from '@/components/league/ui';
import { todayIso } from '@/lib/booking/time';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Môj tím – Súťaž tímov'), robots: { index: false, follow: false } };
}

const STATUS_LABEL: Record<string, string> = { PENDING: 'Čaká na schválenie', APPROVED: 'Schválený', REJECTED: 'Neschválený' };

// Stránka vedúceho tímu: zápasy jeho tímov a stav zápisu výsledkov.
export default async function MojTimPage() {
  const t = await getT();
  const me = await getSessionUser();
  if (!me) return redirect('/prihlasenie?next=%2Fsutaz%2Fmoj-tim');
  await ensureLeagueTables();
  const teams = await prisma.leagueTeam.findMany({ where: { userId: me.id }, orderBy: { createdAt: 'asc' } });
  const ids = teams.filter((x) => x.status === 'APPROVED').map((x) => x.id);
  const games = ids.length
    ? await prisma.leagueGame.findMany({
        where: { OR: [{ homeId: { in: ids } }, { awayId: { in: ids } }] },
        orderBy: { startsAt: 'asc' },
        include: { home: true, away: true, reports: { select: { teamId: true, homeScore: true, awayScore: true, decision: true } } },
      })
    : [];
  const now = Date.now();

  return (
    <>
      <h1 className="lgh">{t('Môj tím')}</h1>
      {teams.length === 0 ? (
        <div className="lgr-none">
          <p>{t('Zatiaľ nemáš prihlásený žiadny tím.')}</p>
          <Link href="/sutaz/registracia" className="lgbtn lgbtn--gold">
            {t('Prihlásiť tím do súťaže')}
          </Link>
        </div>
      ) : (
        teams.map((team) => {
          const mine = games.filter((g) => g.homeId === team.id || g.awayId === team.id);
          const rows = mine.map((g) => {
            const own = g.reports.find((r) => r.teamId === team.id);
            const opp = g.reports.find((r) => r.teamId !== team.id);
            const started = g.startsAt.getTime() <= now;
            const state =
              g.status === 'FINAL'
                ? 'final'
                : !started
                  ? 'planned'
                  : !own
                    ? 'todo'
                    : !opp
                      ? 'waiting'
                      : compareReports(own, opp) === 'match'
                        ? 'final'
                        : 'mismatch';
            return { g, state };
          });
          const todo = rows.filter((r) => r.state === 'todo' || r.state === 'mismatch').length;
          return (
            <section key={team.id} className="lgmy">
              <div className="lgmy__head">
                <TeamBadge team={team} size="lg" />
                <div>
                  <h2>{team.name}</h2>
                  <span className={`lgreg-st lgreg-st--${team.status.toLowerCase()}`}>{t(STATUS_LABEL[team.status] ?? team.status)}</span>
                </div>
                <Link href={`/sutaz/moj-tim/tim/${team.id}`} className="lgbtn lgmy__edit">
                  {t('Logo a súpiska')}
                </Link>
                {todo ? <span className="lgmy__todo">{t.n(todo, '{n} zápas čaká na zápis|{n} zápasy čakajú na zápis|{n} zápasov čaká na zápis')}</span> : null}
              </div>
              {team.status !== 'APPROVED' ? (
                <p className="lg-muted">{t('Zápasy uvidíš po schválení tímu.')}</p>
              ) : rows.length === 0 ? (
                <p className="lg-muted">{t('Tím zatiaľ nemá naplánované zápasy.')}</p>
              ) : (
                <ul className="lgmy__list">
                  {rows
                    .slice()
                    .sort((a, b) => ({ mismatch: 0, todo: 1, waiting: 2, planned: 3, final: 4 })[a.state]! - ({ mismatch: 0, todo: 1, waiting: 2, planned: 3, final: 4 })[b.state]! || a.g.startsAt.getTime() - b.g.startsAt.getTime())
                    .map(({ g, state }) => (
                      <li key={g.id} className={`lgmy__row is-${state}`}>
                        <span className="lgmy__when">
                          <b>{longDay(todayIso(g.startsAt), t)}</b>
                          <small>{hhmm(g.startsAt, t)}</small>
                        </span>
                        <span className="lgmy__match">
                          <TeamBadge team={g.home} size="sm" />
                          <span>
                            {g.home.name} – {g.away.name}
                          </span>
                          <TeamBadge team={g.away} size="sm" />
                        </span>
                        <span className="lgmy__st">
                          {state === 'final'
                            ? `${t('Zapísané')} ${g.homeScore ?? ''}:${g.awayScore ?? ''}`
                            : state === 'planned'
                              ? t('Naplánovaný')
                              : state === 'todo'
                                ? t('Zapíš výsledok')
                                : state === 'waiting'
                                  ? t('Čaká na zápis súpera')
                                  : t('Výsledok sa nezhoduje')}
                        </span>
                        {state === 'todo' || state === 'mismatch' || state === 'waiting' ? (
                          <Link href={`/sutaz/moj-tim/zapas/${g.id}?tim=${team.id}`} className={state === 'waiting' ? 'lgbtn' : 'lgbtn lgbtn--gold'}>
                            {state === 'waiting' ? t('Upraviť zápis') : state === 'mismatch' ? t('Skontrolovať') : t('Zapísať')}
                          </Link>
                        ) : (
                          <span />
                        )}
                      </li>
                    ))}
                </ul>
              )}
            </section>
          );
        })
      )}
    </>
  );
}
