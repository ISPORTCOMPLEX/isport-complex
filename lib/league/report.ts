// Zápis výsledku tímom – kontrola a porovnanie dvoch zápisov (čisté funkcie, testy v tests/league.test.ts).

export type ReportGoal = { scorerId: string; assist1Id: string | null; assist2Id: string | null; period: number; time: string; kind: string };
export type ReportInput = { homeScore: number; awayScore: number; decision: string; shots: number | null; goalieId: string | null; lineup: string[]; goals: ReportGoal[] };
export type Compare = 'match' | 'swapped' | 'mismatch';

const KINDS = ['EV', 'PP', 'SH', 'EN', 'PS'];

// Zhoda = rovnaké skóre domácich, hostí aj spôsob rozhodnutia. „swapped“ = čísla sú prehodené (domáci ↔ hostia).
export function compareReports(a: Pick<ReportInput, 'homeScore' | 'awayScore' | 'decision'>, b: Pick<ReportInput, 'homeScore' | 'awayScore' | 'decision'>): Compare {
  if (a.homeScore === b.homeScore && a.awayScore === b.awayScore && a.decision === b.decision) return 'match';
  if (a.homeScore === b.awayScore && a.awayScore === b.homeScore && a.homeScore !== a.awayScore) return 'swapped';
  return 'mismatch';
}

// Koľko gólov musí mať tím zapísaných: jeho skóre, pri výhre na nájazdy o jeden menej (víťazný nájazd nie je gól hráča).
export function ownGoalsNeeded(r: Pick<ReportInput, 'homeScore' | 'awayScore' | 'decision'>, side: 'home' | 'away'): number {
  const mine = side === 'home' ? r.homeScore : r.awayScore;
  const theirs = side === 'home' ? r.awayScore : r.homeScore;
  return r.decision === 'SO' && mine > theirs ? mine - 1 : mine;
}

// Kontrola zápisu; vráti zoznam chýb (prázdny = v poriadku). roster = id hráčov tímu.
export function checkReport(r: ReportInput, side: 'home' | 'away', roster: string[]): string[] {
  const err: string[] = [];
  const okInt = (v: number) => Number.isInteger(v) && v >= 0 && v <= 99;
  if (!okInt(r.homeScore) || !okInt(r.awayScore)) err.push('Zadaj skóre domácich aj hostí.');
  else if (r.homeScore === r.awayScore) err.push('Zápas nemôže skončiť remízou – víťaza určí predĺženie alebo nájazdy.');
  if (!['REG', 'OT', 'SO'].includes(r.decision)) err.push('Vyber, ako sa zápas skončil.');
  if (r.decision !== 'REG' && Math.abs(r.homeScore - r.awayScore) !== 1) err.push('Po predĺžení alebo nájazdoch je rozdiel skóre vždy 1 gól.');
  if (r.shots !== null && !(Number.isInteger(r.shots) && r.shots >= 0 && r.shots <= 150)) err.push('Neplatný počet striel.');
  const lineup = new Set(r.lineup);
  if (r.lineup.some((id) => !roster.includes(id))) err.push('Na súpiske zápasu je hráč, ktorý nepatrí do tímu.');
  if (lineup.size < 5) err.push('Označ aspoň 5 hráčov, ktorí nastúpili.');
  if (r.goalieId && !lineup.has(r.goalieId)) err.push('Brankár musí byť medzi hráčmi, ktorí nastúpili.');
  if (!err.length) {
    const need = ownGoalsNeeded(r, side);
    if (r.goals.length !== need) err.push(`Podľa skóre treba zapísať ${need} ${need === 1 ? 'gól' : need >= 2 && need <= 4 ? 'góly' : 'gólov'} vášho tímu (zapísaných: ${r.goals.length}).`);
  }
  r.goals.forEach((g, i) => {
    const n = i + 1;
    if (!lineup.has(g.scorerId)) err.push(`Gól ${n}: strelec musí byť medzi hráčmi, ktorí nastúpili.`);
    for (const a of [g.assist1Id, g.assist2Id]) if (a && (!lineup.has(a) || a === g.scorerId)) err.push(`Gól ${n}: asistencia musí byť od iného hráča zo zápasu.`);
    if (g.assist1Id && g.assist1Id === g.assist2Id) err.push(`Gól ${n}: dve rovnaké asistencie.`);
    if (!g.assist1Id && g.assist2Id) err.push(`Gól ${n}: najprv vyplň 1. asistenciu.`);
    if (![1, 2, 3, 4].includes(g.period)) err.push(`Gól ${n}: neplatná tretina.`);
    if (g.period === 4 && r.decision !== 'OT') err.push(`Gól ${n}: gól v predĺžení je len pri výsledku po predĺžení.`);
    if (g.time && !/^\d{1,2}:[0-5]\d$/.test(g.time)) err.push(`Gól ${n}: čas zapíš ako mm:ss.`);
    if (!KINDS.includes(g.kind)) err.push(`Gól ${n}: neplatný druh gólu.`);
  });
  if (r.decision === 'OT' && r.goals.filter((g) => g.period === 4).length > 1) err.push('V predĺžení môže padnúť len jeden gól.');
  return [...new Set(err)];
}

// Bezpečné načítanie zápisu z databázy (Json)
export function readGoals(v: unknown): ReportGoal[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((g): g is Record<string, unknown> => !!g && typeof g === 'object')
    .map((g) => ({
      scorerId: String(g.scorerId ?? ''),
      assist1Id: g.assist1Id ? String(g.assist1Id) : null,
      assist2Id: g.assist2Id ? String(g.assist2Id) : null,
      period: Number(g.period) || 1,
      time: String(g.time ?? ''),
      kind: String(g.kind ?? 'EV'),
    }))
    .filter((g) => g.scorerId);
}
export const readIds = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
