import { PlayerAvatar, TeamBadge } from '@/components/league/ui';
import type { GoalLine, LGame, LPlayer, LTeam } from '@/lib/league/calc';
import type { T } from '@/lib/i18n/translate';

const KIND: Record<string, string> = { PP: 'Presilovka', SH: 'Oslabenie', EN: 'Prázdna bránka', PS: 'Trestné strieľanie' };
const KIND_SHORT: Record<string, string> = { PP: 'PP', SH: 'SH', EN: 'EN', PS: 'TS' };

// Karta odohraného zápasu ako na NHL.com: stav, tímy so strelami a skóre, zoznam gólov s asistenciami.
export function GameCard({ game, home, away, lines, players, t }: { game: LGame; home: LTeam; away: LTeam; lines: GoalLine[]; players: Map<string, LPlayer>; t: T }) {
  const status = game.decision === 'OT' ? t('Koniec/P') : game.decision === 'SO' ? t('Koniec/SN') : t('Koniec');
  const hs = game.homeScore ?? 0;
  const as = game.awayScore ?? 0;
  const row = (team: LTeam, score: number, shots: number | null, win: boolean) => (
    <div className={`lgc__row${win ? ' is-win' : ''}`}>
      <TeamBadge team={team} />
      <span className="lgc__team">
        <b>{team.name}</b>
        {shots !== null ? <small>{t('Strely: {n}', { n: shots })}</small> : null}
      </span>
      <b className="lgc__sc">{score}</b>
    </div>
  );
  const per = (p: number) => (p >= 4 ? t('P') : `${p}.`);
  const pl = (id: string | null) => (id ? players.get(id) : undefined);
  return (
    <article className="lgc">
      <span className="lgc__st">{status}</span>
      {row(home, hs, game.homeShots, hs > as)}
      {row(away, as, game.awayShots, as > hs)}
      {lines.length ? (
        <div className="lgc__goals">
          <h3>{t('Góly')}</h3>
          <ol>
            {lines.map((g) => {
              const s = pl(g.scorerId);
              const team = g.teamId === home.id ? home : away;
              const asts = [g.assist1Id ? `${pl(g.assist1Id)?.name ?? '—'} (${g.a1N})` : '', g.assist2Id ? `${pl(g.assist2Id)?.name ?? '—'} (${g.a2N})` : ''].filter(Boolean);
              return (
                <li key={g.id} className="lgc__g">
                  <PlayerAvatar player={{ name: s?.name ?? team.short, photo: s?.photo }} team={team} />
                  <span className="lgc__gt">
                    <span className="lgc__gs">
                      <b>{s ? s.name : t('Neznámy strelec')}</b>
                      {s ? <span className="lgc__gn"> ({g.scorerN})</span> : null}
                      {KIND_SHORT[g.kind] ? (
                        <abbr className={`lgc__kind lgc__kind--${g.kind}`} title={t(KIND[g.kind])}>
                          {KIND_SHORT[g.kind]}
                        </abbr>
                      ) : null}
                    </span>
                    <span className="lgc__ga">{asts.length ? asts.join(', ') : t('bez asistencie')}</span>
                    <span className="lgc__gx">
                      {home.short} {g.home} – {away.short} {g.away} ({per(g.period)}{g.time ? ` – ${g.time}` : ''})
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}
    </article>
  );
}
