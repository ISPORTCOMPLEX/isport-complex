import type { Metadata } from 'next';
import { StatBox, type StatRow, type StatTab } from '@/components/league/StatBox';
import { LeagueEmpty, POS } from '@/components/league/ui';
import { goalieStats, initials, inkOn, rank, skaterStats, standings, type LPlayer, type LTeam } from '@/lib/league/calc';
import { loadLeague } from '@/lib/league/data';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Štatistiky – Súťaž tímov'), description: t('Najlepší hráči, obrancovia a gólmani súťaže tímov v I-SPORT COMPLEX Košice.') };
}

export default async function StatistikyPage() {
  const t = await getT();
  const L = await loadLeague();
  if (!L.teams.length) return <LeagueEmpty t={t} title={t('Súťaž sa pripravuje')} text={t('Štatistiky hráčov sa začnú počítať po prvých zápasoch.')} />;

  const num = (v: number, d = 0) => v.toLocaleString(t.intl, { minimumFractionDigits: d, maximumFractionDigits: d });
  const sub = (p: LPlayer, team: LTeam) => [team.short, p.number !== null ? `#${p.number}` : '', t(POS[p.position] ?? 'Ú')].filter(Boolean).join(' • ');
  const prow = <R extends { player: LPlayer; team: LTeam }>(r: { row: R; rank: number; tie: boolean }, value: string): StatRow => ({
    key: r.row.player.id,
    rank: r.rank,
    tie: r.tie,
    name: r.row.player.name,
    value,
    color: r.row.team.color,
    ink: inkOn(r.row.team.color),
    initials: initials(r.row.player.name),
    sub: sub(r.row.player, r.row.team),
    photo: r.row.player.photo ?? null,
  });
  const skaters = skaterStats(L.players, L.teams, L.games, L.goals);
  const empty = t('Zatiaľ bez štatistík – pribudnú po prvých zápasoch.');
  const skaterTabs = (rows: typeof skaters): StatTab[] => [
    { label: t('Body'), unit: t('Body'), rows: rank(rows.filter((r) => r.pts > 0), (r) => r.pts, 'desc', 10, (r) => r.g).map((r) => prow(r, num(r.row.pts))), empty },
    { label: t('Góly'), unit: t('Góly'), rows: rank(rows.filter((r) => r.g > 0), (r) => r.g).map((r) => prow(r, num(r.row.g))), empty },
    { label: t('Asistencie'), unit: t('Asistencie'), rows: rank(rows.filter((r) => r.a > 0), (r) => r.a).map((r) => prow(r, num(r.row.a))), empty },
  ];
  const goalies = goalieStats(L.players, L.teams, L.games, L.goals);
  const maxGp = Math.max(0, ...standings(L.teams, L.games).map((s) => s.gp));
  const minGp = Math.max(1, Math.ceil(maxGp * 0.4));
  const qual = goalies.filter((g) => g.gp >= minGp);
  const gTabs: StatTab[] = [
    { label: t('Priemer'), unit: t('Priemer'), rows: rank(qual, (g) => g.gaa, 'asc').map((r) => prow(r, num(r.row.gaa, 2))), empty },
    { label: t('Úspešnosť zákrokov'), unit: t('Úspešnosť'), rows: rank(qual.filter((g) => g.svPct !== null), (g) => g.svPct ?? 0).map((r) => prow(r, `${num((r.row.svPct ?? 0) * 100, 1)} %`)), empty },
    { label: t('Nuly'), unit: t('Nuly'), rows: rank(goalies.filter((g) => g.so > 0), (g) => g.so).map((r) => prow(r, num(r.row.so))), empty },
  ];
  const st = standings(L.teams, L.games).filter((s) => s.gp > 0);
  const trow = (r: { row: (typeof st)[number]; rank: number; tie: boolean }, value: string): StatRow => ({
    key: r.row.team.id,
    rank: r.rank,
    tie: r.tie,
    name: r.row.team.name,
    value,
    color: r.row.team.color,
    ink: inkOn(r.row.team.color),
    initials: r.row.team.short,
    sub: t.n(r.row.gp, '{n} zápas|{n} zápasy|{n} zápasov'),
    photo: r.row.team.logo ?? null,
    logo: true,
  });
  const teamTabs: StatTab[] = [
    { label: t('Strelené góly'), unit: t('Góly na zápas'), rows: rank(st, (s) => s.gf / s.gp).map((r) => trow(r, num(r.row.gf / r.row.gp, 2))), empty },
    { label: t('Inkasované'), unit: t('Inkasované na zápas'), rows: rank(st, (s) => s.ga / s.gp, 'asc').map((r) => trow(r, num(r.row.ga / r.row.gp, 2))), empty },
    { label: t('Skóre'), unit: t('Rozdiel skóre'), rows: rank(st, (s) => s.diff).map((r) => trow(r, `${r.row.diff > 0 ? '+' : ''}${r.row.diff}`)), empty },
  ];

  return (
    <>
      <h1 className="lgh">{t('Štatistiky')}</h1>
      <div className="lgs-grid">
        <StatBox title={t('Hráči')} tabs={skaterTabs(skaters)} />
        <StatBox title={t('Gólmani')} note={minGp > 1 ? t('(odchytali aspoň {n} zápasy)', { n: minGp }) : undefined} tabs={gTabs} />
        <StatBox title={t('Obrancovia')} tabs={skaterTabs(skaters.filter((s) => s.player.position === 'D'))} />
        <StatBox title={t('Tímy')} tabs={teamTabs} />
      </div>
    </>
  );
}

