import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { ensureLeagueTables } from '@/lib/league/db';
import { compareReports, readGoals, readIds } from '@/lib/league/report';
import { ReportForm } from '@/components/league/ReportForm';
import { TeamBadge, hhmm, longDay } from '@/components/league/ui';
import { todayIso } from '@/lib/booking/time';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Zápis výsledku'), robots: { index: false, follow: false } };
}

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tim?: string }> };

export default async function ZapisPage({ params, searchParams }: Props) {
  const t = await getT();
  const { id } = await params;
  const want = (await searchParams).tim ?? '';
  const me = await getSessionUser();
  if (!me) return redirect(`/prihlasenie?next=${encodeURIComponent(`/sutaz/moj-tim/zapas/${id}`)}`);
  await ensureLeagueTables();
  const game = await prisma.leagueGame.findUnique({
    where: { id },
    include: {
      home: { include: { players: { orderBy: [{ number: 'asc' }, { name: 'asc' }] } } },
      away: { include: { players: { orderBy: [{ number: 'asc' }, { name: 'asc' }] } } },
      reports: true,
    },
  });
  if (!game) notFound();
  const owned = [game.home, game.away].filter((x) => x.userId === me.id && x.status === 'APPROVED');
  const team = owned.find((x) => x.id === want) ?? owned[0];
  if (!team) notFound();
  const side = team.id === game.homeId ? 'home' : 'away';
  const own = game.reports.find((r) => r.teamId === team.id) ?? null;
  const opp = game.reports.find((r) => r.teamId !== team.id) ?? null;
  const cmp = own && opp ? compareReports(own, opp) : null;
  const started = game.startsAt.getTime() <= Date.now();

  return (
    <>
      <Link href="/sutaz/moj-tim" className="lg-back">
        ← {t('Môj tím')}
      </Link>
      <h1 className="lgh">{t('Zápis výsledku')}</h1>
      <div className="lgz__game">
        <span className="lgz__team">
          <TeamBadge team={game.home} size="lg" />
          <b>{game.home.name}</b>
          <small>{t('Domáci')}</small>
        </span>
        <span className="lgz__mid">
          <b>{longDay(todayIso(game.startsAt), t)}</b>
          <span>{hhmm(game.startsAt, t)}</span>
          <small>{t('Zapisuješ za tím {name}', { name: team.name })}</small>
        </span>
        <span className="lgz__team">
          <TeamBadge team={game.away} size="lg" />
          <b>{game.away.name}</b>
          <small>{t('Hostia')}</small>
        </span>
      </div>

      {game.status === 'FINAL' ? (
        <div className="lgz__note is-ok">
          <b>{t('Výsledok je zapísaný: {h} : {a}', { h: game.homeScore ?? 0, a: game.awayScore ?? 0 })}</b>
          <span>{game.confirmedBy === 'teams' ? t('Potvrdili ho oba tímy.') : t('Zapísal ho správca súťaže.')} {t('Ak je v ňom chyba, napíš správcovi súťaže.')}</span>
        </div>
      ) : !started ? (
        <div className="lgz__note">
          <b>{t('Zápas ešte nezačal')}</b>
          <span>{t('Výsledok zapíšeš po začiatku zápasu.')}</span>
        </div>
      ) : (
        <>
          {cmp && cmp !== 'match' ? (
            <div className="lgz__note is-bad" role="alert">
              <b>{t('Výsledok sa nezhoduje so zápisom súpera')}</b>
              <span>
                {cmp === 'swapped'
                  ? t('Súper zapísal opačné skóre – pravdepodobne niekto prehodil domácich a hostí. Skontroluj, že skóre domácich ({home}) a hostí ({away}) máš v správnych políčkach.', { home: game.home.name, away: game.away.name })
                  : t('Skontroluj skóre aj spôsob, akým sa zápas skončil. Ak je tvoj zápis správny, dohodni sa so súperom, aby svoj zápis opravil.')}
              </span>
            </div>
          ) : own && !opp ? (
            <div className="lgz__note">
              <b>{t('Tvoj zápis je uložený')}</b>
              <span>{t('Čakáme na zápis súpera. Keď sa skóre zhodne, výsledok sa zapíše automaticky. Dovtedy ho môžeš upraviť.')}</span>
            </div>
          ) : !own && opp ? (
            <div className="lgz__note">
              <b>{t('Súper už výsledok zapísal')}</b>
              <span>{t('Zapíš ho aj ty. Ak sa skóre zhodne, hneď sa zapíše do súťaže.')}</span>
            </div>
          ) : null}
          <ReportForm
            gameId={game.id}
            teamId={team.id}
            side={side}
            home={game.home.name}
            away={game.away.name}
            roster={team.players.map((p) => ({ id: p.id, name: p.name, number: p.number, position: p.position }))}
            initial={
              own
                ? { homeScore: String(own.homeScore), awayScore: String(own.awayScore), decision: own.decision, shots: own.shots === null ? '' : String(own.shots), goalieId: own.goalieId ?? '', lineup: readIds(own.lineup), goals: readGoals(own.goals) }
                : null
            }
          />
        </>
      )}
    </>
  );
}
