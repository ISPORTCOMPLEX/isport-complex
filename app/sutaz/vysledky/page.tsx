import type { Metadata } from 'next';
import Link from 'next/link';
import { GameCard } from '@/components/league/GameCard';
import { DayStrip, LeagueEmpty, longDay } from '@/components/league/ui';
import { goalLines, isFinal } from '@/lib/league/calc';
import { loadLeague } from '@/lib/league/data';
import { todayIso } from '@/lib/booking/time';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Výsledky – Súťaž tímov'), description: t('Výsledky zápasov súťaže tímov v I-SPORT COMPLEX Košice – skóre, strely a strelci gólov.') };
}

type Props = { searchParams: Promise<{ datum?: string }> };

export default async function VysledkyPage({ searchParams }: Props) {
  const t = await getT();
  const L = await loadLeague();
  const want = (await searchParams).datum ?? '';
  const done = L.games.filter(isFinal);
  const byDay = new Map<string, number>();
  for (const g of done) byDay.set(todayIso(g.startsAt), (byDay.get(todayIso(g.startsAt)) ?? 0) + 1);
  const days = [...byDay.keys()].sort();
  const sel = byDay.has(want) ? want : days[days.length - 1];

  if (!L.teams.length) return <LeagueEmpty t={t} title={t('Súťaž sa pripravuje')} text={t('Výsledky sa tu objavia po prvých zápasoch. Prihlás svoj tím a hraj o víťazstvo.')} />;
  if (!sel)
    return (
      <>
        <h1 className="lgh">{t('Výsledky')}</h1>
        <LeagueEmpty t={t} title={t('Zatiaľ bez odohraných zápasov')} text={t('Prvé výsledky pribudnú hneď po odohraní zápasov. Termíny nájdeš v rozpise.')} cta={false} />
        <p className="lg-center">
          <Link href="/sutaz/rozpis" className="lgbtn">
            {t('Pozrieť rozpis')}
          </Link>
        </p>
      </>
    );

  const i = days.indexOf(sel);
  const from = Math.max(0, Math.min(i - 3, days.length - 7));
  const strip = days.slice(from, from + 7).map((iso) => ({ iso, count: byDay.get(iso) ?? 0 }));
  const lines = goalLines(L.goals, L.games);
  const team = new Map(L.teams.map((x) => [x.id, x]));
  const players = new Map(L.players.map((p) => [p.id, p]));
  const games = done.filter((g) => todayIso(g.startsAt) === sel);

  return (
    <>
      <h1 className="lgh">{t('Výsledky')}</h1>
      <DayStrip days={strip} current={sel} href={(iso) => `/sutaz/vysledky?datum=${iso}`} t={t} />
      <h2 className="lgh2">{longDay(sel, t)}</h2>
      <div className="lgc-grid">
        {games.map((g) => (
          <GameCard key={g.id} game={g} home={team.get(g.homeId)!} away={team.get(g.awayId)!} lines={lines.get(g.id) ?? []} players={players} t={t} />
        ))}
      </div>
    </>
  );
}
