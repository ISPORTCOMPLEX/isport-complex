// Výpočty súťaže – tabuľka (body podľa IIHF), štatistiky hráčov a gólmanov, priebežné skóre gólov.
// Čisté funkcie bez databázy (testy v tests/league.test.ts).

export type LTeam = { id: string; name: string; short: string; color: string; city?: string };
export type LPlayer = { id: string; teamId: string; name: string; number: number | null; position: string };
export type LGame = {
  id: string;
  homeId: string;
  awayId: string;
  startsAt: Date;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  decision: string;
  homeShots: number | null;
  awayShots: number | null;
  homeGoalieId: string | null;
  awayGoalieId: string | null;
};
export type LGoal = { id: string; gameId: string; teamId: string; scorerId: string | null; assist1Id: string | null; assist2Id: string | null; period: number; time: string; kind: string; createdAt?: Date };

export type Outcome = 'W' | 'OTW' | 'OTL' | 'L';
export const POINTS: Record<Outcome, number> = { W: 3, OTW: 2, OTL: 1, L: 0 };

export const isFinal = (g: LGame) => g.status === 'FINAL' && g.homeScore !== null && g.awayScore !== null && g.homeScore !== g.awayScore;

export function outcome(g: LGame, teamId: string): Outcome | null {
  if (!isFinal(g)) return null;
  const home = g.homeId === teamId;
  if (!home && g.awayId !== teamId) return null;
  const mine = (home ? g.homeScore : g.awayScore) as number;
  const theirs = (home ? g.awayScore : g.homeScore) as number;
  const extra = g.decision === 'OT' || g.decision === 'SO';
  if (mine > theirs) return extra ? 'OTW' : 'W';
  return extra ? 'OTL' : 'L';
}

export type StandingRow = {
  team: LTeam;
  gp: number;
  w: number;
  otw: number;
  otl: number;
  l: number;
  pts: number;
  pct: number;
  gf: number;
  ga: number;
  diff: number;
  home: string;
  away: string;
  last5: string;
  streak: string;
};

// záznam „výhry-prehry-prehry po predĺžení“ (výhry vrátane predĺženia)
const rec = (o: Outcome[]) => `${o.filter((x) => x === 'W' || x === 'OTW').length}-${o.filter((x) => x === 'L').length}-${o.filter((x) => x === 'OTL').length}`;

export function standings(teams: LTeam[], games: LGame[]): StandingRow[] {
  const done = games.filter(isFinal).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const rows = teams.map((team) => {
    const mine = done.filter((g) => g.homeId === team.id || g.awayId === team.id);
    const outs = mine.map((g) => outcome(g, team.id) as Outcome);
    const gf = mine.reduce((s, g) => s + ((g.homeId === team.id ? g.homeScore : g.awayScore) ?? 0), 0);
    const ga = mine.reduce((s, g) => s + ((g.homeId === team.id ? g.awayScore : g.homeScore) ?? 0), 0);
    const pts = outs.reduce((s, o) => s + POINTS[o], 0);
    // séria: posledné výsledky rovnakého druhu (V = výhra, P = prehra; predĺženie sa ráta podľa výsledku)
    let streak = '';
    if (outs.length) {
      const win = (o: Outcome) => o === 'W' || o === 'OTW';
      const lastWin = win(outs[outs.length - 1]);
      let n = 0;
      for (let i = outs.length - 1; i >= 0 && win(outs[i]) === lastWin; i--) n++;
      streak = `${lastWin ? 'V' : 'P'}${n}`;
    }
    return {
      team,
      gp: mine.length,
      w: outs.filter((o) => o === 'W').length,
      otw: outs.filter((o) => o === 'OTW').length,
      otl: outs.filter((o) => o === 'OTL').length,
      l: outs.filter((o) => o === 'L').length,
      pts,
      pct: mine.length ? pts / (mine.length * 3) : 0,
      gf,
      ga,
      diff: gf - ga,
      home: rec(mine.filter((g) => g.homeId === team.id).map((g) => outcome(g, team.id) as Outcome)),
      away: rec(mine.filter((g) => g.awayId === team.id).map((g) => outcome(g, team.id) as Outcome)),
      last5: rec(outs.slice(-5)),
      streak,
    };
  });
  return rows.sort((a, b) => b.pts - a.pts || a.gp - b.gp || b.w - a.w || b.diff - a.diff || b.gf - a.gf || a.team.name.localeCompare(b.team.name, 'sk'));
}

// „mm:ss“ → sekundy (na zoradenie gólov v tretine)
export const clock = (t: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : 9999;
};

export function sortGoals(goals: LGoal[], games: LGame[]): LGoal[] {
  const when = new Map(games.map((g) => [g.id, g.startsAt.getTime()]));
  return [...goals].sort(
    (a, b) => (when.get(a.gameId) ?? 0) - (when.get(b.gameId) ?? 0) || a.gameId.localeCompare(b.gameId) || a.period - b.period || clock(a.time) - clock(b.time) || (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0),
  );
}

// Pri každom góle: koľký gól/asistencia v súťaži to bola pre hráča a stav zápasu po ňom.
export type GoalLine = LGoal & { scorerN: number; a1N: number; a2N: number; home: number; away: number };
export function goalLines(goals: LGoal[], games: LGame[]): Map<string, GoalLine[]> {
  const byGame = new Map<string, GoalLine[]>();
  const g = new Map<string, number>();
  const a = new Map<string, number>();
  const score = new Map<string, { home: number; away: number }>();
  const gameOf = new Map(games.map((x) => [x.id, x]));
  for (const goal of sortGoals(goals, games)) {
    const game = gameOf.get(goal.gameId);
    if (!game) continue;
    const s = score.get(goal.gameId) ?? { home: 0, away: 0 };
    if (goal.teamId === game.homeId) s.home++;
    else s.away++;
    score.set(goal.gameId, s);
    const inc = (m: Map<string, number>, id: string | null) => (id ? (m.set(id, (m.get(id) ?? 0) + 1), m.get(id) as number) : 0);
    const line: GoalLine = { ...goal, scorerN: inc(g, goal.scorerId), a1N: inc(a, goal.assist1Id), a2N: inc(a, goal.assist2Id), home: s.home, away: s.away };
    byGame.set(goal.gameId, [...(byGame.get(goal.gameId) ?? []), line]);
  }
  return byGame;
}

export type SkaterRow = { player: LPlayer; team: LTeam; gp: number; g: number; a: number; pts: number };
export function skaterStats(players: LPlayer[], teams: LTeam[], games: LGame[], goals: LGoal[]): SkaterRow[] {
  const final = new Set(games.filter(isFinal).map((x) => x.id));
  const gp = new Map<string, number>();
  for (const x of games.filter(isFinal)) for (const t of [x.homeId, x.awayId]) gp.set(t, (gp.get(t) ?? 0) + 1);
  const teamOf = new Map(teams.map((t) => [t.id, t]));
  const counted = goals.filter((x) => final.has(x.gameId));
  return players
    .filter((p) => p.position !== 'G' && teamOf.has(p.teamId))
    .map((p) => {
      const g = counted.filter((x) => x.scorerId === p.id).length;
      const a = counted.filter((x) => x.assist1Id === p.id || x.assist2Id === p.id).length;
      return { player: p, team: teamOf.get(p.teamId) as LTeam, gp: gp.get(p.teamId) ?? 0, g, a, pts: g + a };
    });
}

export type GoalieRow = { player: LPlayer; team: LTeam; gp: number; ga: number; gaa: number; svPct: number | null; so: number };
export function goalieStats(players: LPlayer[], teams: LTeam[], games: LGame[], goals: LGoal[]): GoalieRow[] {
  const teamOf = new Map(teams.map((t) => [t.id, t]));
  const done = games.filter(isFinal);
  const rows: GoalieRow[] = [];
  for (const p of players) {
    const team = teamOf.get(p.teamId);
    if (!team) continue;
    const mine = done.filter((x) => x.homeGoalieId === p.id || x.awayGoalieId === p.id);
    if (!mine.length) continue;
    let ga = 0;
    let shots = 0;
    let shotsKnown = true;
    let so = 0;
    for (const x of mine) {
      const home = x.homeGoalieId === p.id;
      // góly do prázdnej bránky sa brankárovi nerátajú
      const en = goals.filter((q) => q.gameId === x.id && q.teamId !== (home ? x.homeId : x.awayId) && q.kind === 'EN').length;
      const against = Math.max(0, ((home ? x.awayScore : x.homeScore) ?? 0) - en);
      ga += against;
      if (against === 0) so++;
      const s = home ? x.awayShots : x.homeShots;
      if (s === null) shotsKnown = false;
      else shots += Math.max(0, s - en);
    }
    rows.push({ player: p, team, gp: mine.length, ga, gaa: ga / mine.length, svPct: shotsKnown && shots > 0 ? (shots - ga) / shots : null, so });
  }
  return rows;
}

// Poradie s rovnakými hodnotami: „R5.“ ako na NHL.com (remíza na 5. mieste)
export type Ranked<T> = { row: T; rank: number; tie: boolean };
// `then` = pomocné zoradenie pri rovnakej hodnote (napr. viac gólov pri rovnakých bodoch) – poradie ostáva spoločné
export function rank<T>(rows: T[], value: (r: T) => number, dir: 'desc' | 'asc' = 'desc', limit = 10, then?: (r: T) => number): Ranked<T>[] {
  const sorted = [...rows].sort((a, b) => (dir === 'desc' ? value(b) - value(a) : value(a) - value(b)) || (then ? then(b) - then(a) : 0));
  const top = sorted.slice(0, limit);
  return top.map((row, i) => {
    const v = value(row);
    const first = sorted.findIndex((r) => value(r) === v);
    const count = sorted.filter((r) => value(r) === v).length;
    return { row, rank: first + 1, tie: count > 1 };
  });
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

// farba tímu len v bezpečnom tvare #rrggbb
export const safeColor = (c: string) => (/^#[0-9a-f]{6}$/i.test(c) ? c.toLowerCase() : '#1f4fd8');
// tmavý alebo svetlý text na farbe tímu
export function inkOn(hex: string): '#ffffff' | '#0b1626' {
  const c = safeColor(hex);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#0b1626' : '#ffffff';
}
