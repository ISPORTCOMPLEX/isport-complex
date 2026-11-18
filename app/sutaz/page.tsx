import type { Metadata } from 'next';
import Link from 'next/link';
import { GameCard } from '@/components/league/GameCard';
import { LeagueEmpty, TeamBadge, hhmm, longDay } from '@/components/league/ui';
import { goalLines, isFinal, rank, skaterStats, standings } from '@/lib/league/calc';
import { loadLeague } from '@/lib/league/data';
import { todayIso } from '@/lib/booking/time';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('Súťaž tímov'),
    description: t('Hokejová minisúťaž tímov v I-SPORT COMPLEX Košice – výsledky, tabuľka, štatistiky hráčov, rozpis a registrácia tímu.'),
    alternates: { canonical: '/sutaz' },
  };
}

export default async function SutazPage() {
  const t = await getT();
  const L = await loadLeague();
  if (!L.teams.length)
    return (
      <>
        <h1 className="lgh">{t('Súťaž tímov')}</h1>
        <LeagueEmpty t={t} title={t('Prihlás svoj tím do súťaže')} text={t('Pripravujeme hokejovú minisúťaž tímov na našom ľade. Zaregistruj tím so súpiskou – po schválení sa objaví v tabuľke a dostane termíny zápasov.')} />
        <ul className="lg-how">
          <li>
            <b>1</b>
            <span>
              <strong>{t('Registrácia')}</strong>
              {t('Vyplníš názov tímu, kontakt a súpisku hráčov.')}
            </span>
          </li>
          <li>
            <b>2</b>
            <span>
              <strong>{t('Schválenie')}</strong>
              {t('Prihlášku skontrolujeme a ozveme sa ti.')}
            </span>
          </li>
          <li>
            <b>3</b>
            <span>
              <strong>{t('Zápasy')}</strong>
              {t('Výsledky, tabuľka a štatistiky hráčov sa zobrazujú tu na webe.')}
            </span>
          </li>
        </ul>
      </>
    );

  const team = new Map(L.teams.map((x) => [x.id, x]));
  const players = new Map(L.players.map((p) => [p.id, p]));
  const today = todayIso();
  const next = L.games.filter((g) => g.status !== 'FINAL' && todayIso(g.startsAt) >= today).slice(0, 6);
  const last = L.games.filter(isFinal).slice(-2).reverse();
  const lines = goalLines(L.goals, L.games);
  const table = standings(L.teams, L.games);
  const scorers = rank(
    skaterStats(L.players, L.teams, L.games, L.goals).filter((s) => s.pts > 0),
    (s) => s.pts,
    'desc',
    5,
    (s) => s.g,
  );

  return (
    <>
      <h1 className="lgh">{t('Súťaž tímov')}</h1>
      <div className="lgo">
        <div className="lgo__main">
          {last.length ? (
            <section>
              <div className="lgo__h">
                <h2>{t('Posledné výsledky')}</h2>
                <Link href="/sutaz/vysledky">{t('Všetky výsledky')} →</Link>
              </div>
              <div className="lgc-grid lgc-grid--2">
                {last.map((g) => (
                  <GameCard key={g.id} game={g} home={team.get(g.homeId)!} away={team.get(g.awayId)!} lines={lines.get(g.id) ?? []} players={players} t={t} />
                ))}
              </div>
            </section>
          ) : null}
          <section className="lgo__box">
            <div className="lgo__h">
              <h2>{t('Najbližšie zápasy')}</h2>
              <Link href="/sutaz/rozpis">{t('Celý rozpis')} →</Link>
            </div>
            {next.length ? (
              <ul className="lgr__list">
                {next.map((g) => {
                  const h = team.get(g.homeId)!;
                  const a = team.get(g.awayId)!;
                  return (
                    <li key={g.id} className="lgr__row">
                      <span className="lgr__match">
                        <span className="lgr__tm lgr__tm--h">{h.name}</span>
                        <TeamBadge team={h} />
                        <span className="lgr__vs">{t('vs')}</span>
                        <TeamBadge team={a} />
                        <span className="lgr__tm">{a.name}</span>
                      </span>
                      <span className="lgr__time">
                        <small>{longDay(todayIso(g.startsAt), t)}</small> {hhmm(g.startsAt, t)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="lg-muted">{t('Ďalšie zápasy zatiaľ nie sú naplánované.')}</p>
            )}
          </section>
        </div>
        <aside className="lgo__side">
          <section className="lgo__box">
            <div className="lgo__h">
              <h2>{t('Tabuľka')}</h2>
              <Link href="/sutaz/tabulky">{t('Celá')} →</Link>
            </div>
            <table className="lgmini">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">{t('Tím')}</th>
                  <th scope="col">
                    <abbr title={t('Zápasy')}>Z</abbr>
                  </th>
                  <th scope="col">
                    <abbr title={t('Body')}>B</abbr>
                  </th>
                </tr>
              </thead>
              <tbody>
                {table.slice(0, 8).map((r, i) => (
                  <tr key={r.team.id}>
                    <td>{i + 1}</td>
                    <th scope="row">
                      <span className="lgtb__team">
                        <TeamBadge team={r.team} size="sm" />
                        {r.team.name}
                      </span>
                    </th>
                    <td>{r.gp}</td>
                    <td>
                      <b>{r.pts}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          {scorers.length ? (
            <section className="lgo__box">
              <div className="lgo__h">
                <h2>{t('Kanadské bodovanie')}</h2>
                <Link href="/sutaz/statistiky">{t('Štatistiky')} →</Link>
              </div>
              <ol className="lgo__sc">
                {scorers.map((r) => (
                  <li key={r.row.player.id}>
                    <span>
                      {r.tie ? 'R' : ''}
                      {r.rank}.
                    </span>
                    <b>{r.row.player.name}</b>
                    <small>{r.row.team.short}</small>
                    <em>
                      {r.row.g}+{r.row.a}
                    </em>
                    <strong>{r.row.pts}</strong>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
          <Link href="/sutaz/registracia" className="lgo__reg">
            <b>{t('Prihlás svoj tím')}</b>
            <span>{t('Registrácia tímu so súpiskou online')}</span>
          </Link>
        </aside>
      </div>
    </>
  );
}
