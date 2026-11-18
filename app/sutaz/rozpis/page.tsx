import type { Metadata } from 'next';
import Link from 'next/link';
import { DayStrip, LeagueEmpty, TeamBadge, hhmm, longDay } from '@/components/league/ui';
import { loadLeague } from '@/lib/league/data';
import { addDays, todayIso } from '@/lib/booking/time';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Rozpis – Súťaž tímov'), description: t('Rozpis zápasov súťaže tímov v I-SPORT COMPLEX Košice – dátum, čas a súpery.') };
}

type Props = { searchParams: Promise<{ od?: string }> };

export default async function RozpisPage({ searchParams }: Props) {
  const t = await getT();
  const L = await loadLeague();
  if (!L.teams.length) return <LeagueEmpty t={t} title={t('Súťaž sa pripravuje')} text={t('Rozpis zápasov zverejníme, keď budú tímy prihlásené a schválené.')} />;
  const today = todayIso();
  const raw = (await searchParams).od ?? '';
  const start = /^\d{4}-\d{2}-\d{2}$/.test(raw) && raw >= addDays(today, -60) && raw <= addDays(today, 365) ? raw : today;
  const team = new Map(L.teams.map((x) => [x.id, x]));
  const upcoming = L.games.filter((g) => g.status !== 'FINAL' && todayIso(g.startsAt) >= today);
  const week = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const byDay = new Map<string, typeof upcoming>();
  for (const g of L.games.filter((g) => g.status !== 'FINAL')) {
    const d = todayIso(g.startsAt);
    if (week.includes(d)) byDay.set(d, [...(byDay.get(d) ?? []), g]);
  }
  const next = upcoming.find((g) => todayIso(g.startsAt) > week[6]);

  return (
    <>
      <h1 className="lgh">{t('Rozpis')}</h1>
      <div className="lgd-wrap">
        <Link href={`/sutaz/rozpis?od=${addDays(start, -7)}`} className="lgd__arr" aria-label={t('Predchádzajúci týždeň')}>
          ‹
        </Link>
        <DayStrip days={week.map((iso) => ({ iso, count: byDay.get(iso)?.length ?? 0 }))} current={start} href={(iso) => `/sutaz/rozpis?od=${iso}`} t={t} />
        <Link href={`/sutaz/rozpis?od=${addDays(start, 7)}`} className="lgd__arr" aria-label={t('Ďalší týždeň')}>
          ›
        </Link>
      </div>
      {byDay.size === 0 ? (
        <div className="lgr-none">
          <p>{t('V týchto dňoch nie je naplánovaný žiadny zápas.')}</p>
          {next ? (
            <Link href={`/sutaz/rozpis?od=${todayIso(next.startsAt)}`} className="lgbtn">
              {t('Najbližší zápas: {d}', { d: longDay(todayIso(next.startsAt), t) })}
            </Link>
          ) : null}
        </div>
      ) : (
        week
          .filter((d) => byDay.has(d))
          .map((d) => (
            <section key={d} className="lgr">
              <h2 className="lgh2">{longDay(d, t)}</h2>
              <div className="lgr__head" aria-hidden="true">
                <span>{t('Súboj')}</span>
                <span>{t('Čas')}</span>
              </div>
              <ul className="lgr__list">
                {byDay.get(d)!.map((g) => {
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
                      <time className="lgr__time" dateTime={g.startsAt.toISOString()}>
                        {hhmm(g.startsAt, t)}
                      </time>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
      )}
    </>
  );
}
