// Testy výpočtov súťaže: body podľa IIHF, poradie, séria, štatistiky a priebežné skóre.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { standings, goalLines, skaterStats, goalieStats, rank, outcome, inkOn, safeColor, type LGame, type LGoal, type LTeam, type LPlayer } from '../lib/league/calc.ts';

const T: LTeam[] = [
  { id: 'a', name: 'Alfa', short: 'ALF', color: '#ff0000' },
  { id: 'b', name: 'Beta', short: 'BET', color: '#00ff00' },
  { id: 'c', name: 'Gama', short: 'GAM', color: '#0000ff' },
];
const g = (id: string, homeId: string, awayId: string, hs: number | null, as: number | null, decision = 'REG', day = 1, extra: Partial<LGame> = {}): LGame => ({
  id, homeId, awayId, startsAt: new Date(Date.UTC(2026, 10, day, 18)), status: hs === null ? 'SCHEDULED' : 'FINAL', homeScore: hs, awayScore: as, decision, homeShots: null, awayShots: null, homeGoalieId: null, awayGoalieId: null, ...extra,
});

test('body podľa IIHF: 3 / 2 / 1 / 0', () => {
  const games = [g('1', 'a', 'b', 4, 2, 'REG', 1), g('2', 'b', 'c', 3, 2, 'OT', 2), g('3', 'c', 'a', 2, 1, 'SO', 3), g('4', 'a', 'c', null, null, 'REG', 4)];
  const s = standings(T, games);
  const by = Object.fromEntries(s.map((r) => [r.team.id, r]));
  assert.equal(by.a.pts, 3 + 1); // výhra + prehra po nájazdoch
  assert.equal(by.b.pts, 0 + 2); // prehra + výhra po predĺžení
  assert.equal(by.c.pts, 1 + 2);
  assert.equal(by.a.gp, 2); // naplánovaný zápas sa neráta
  assert.deepEqual(s.map((r) => r.team.id), ['a', 'c', 'b']);
  assert.equal(by.a.diff, 4 + 1 - 2 - 2);
  assert.equal(by.a.home, '1-0-0');
  assert.equal(by.a.away, '0-0-1');
  assert.equal(by.c.streak, 'V1');
  assert.equal(by.a.streak, 'P1');
  assert.equal(outcome(games[1], 'c'), 'OTL');
});

test('séria a posledných 5', () => {
  const games = [1, 2, 3].map((d) => g(`w${d}`, 'a', 'b', 2, 1, 'REG', d));
  const by = Object.fromEntries(standings(T, games).map((r) => [r.team.id, r]));
  assert.equal(by.a.streak, 'V3');
  assert.equal(by.b.streak, 'P3');
  assert.equal(by.a.last5, '3-0-0');
  assert.equal(by.a.pct, 1);
});

const P: LPlayer[] = [
  { id: 'p1', teamId: 'a', name: 'Ján Novák', number: 9, position: 'F' },
  { id: 'p2', teamId: 'a', name: 'Peter Malý', number: 4, position: 'D' },
  { id: 'g1', teamId: 'b', name: 'Brankár Beta', number: 30, position: 'G' },
];
const goal = (id: string, gameId: string, teamId: string, scorerId: string | null, assist1Id: string | null, period: number, time: string, kind = 'EV'): LGoal => ({ id, gameId, teamId, scorerId, assist1Id, assist2Id: null, period, time, kind });

test('góly: poradie, počty a priebežné skóre', () => {
  const games = [g('1', 'a', 'b', 2, 0, 'REG', 1, { awayGoalieId: 'g1', homeShots: 20 }), g('2', 'a', 'b', 1, 0, 'REG', 2, { awayGoalieId: 'g1', homeShots: 10 })];
  const goals = [goal('x2', '1', 'a', 'p1', null, 3, '19:10', 'EN'), goal('x1', '1', 'a', 'p1', 'p2', 1, '05:00', 'PP'), goal('x3', '2', 'a', 'p2', 'p1', 2, '01:00')];
  const lines = goalLines(goals, games);
  const l1 = lines.get('1')!;
  assert.deepEqual(l1.map((x) => x.id), ['x1', 'x2']);
  assert.equal(l1[1].scorerN, 2);
  assert.equal(l1[1].home, 2);
  assert.equal(lines.get('2')![0].a1N, 1);
  const sk = Object.fromEntries(skaterStats(P, T, games, goals).map((r) => [r.player.id, r]));
  assert.equal(sk.p1.g, 2);
  assert.equal(sk.p1.a, 1);
  assert.equal(sk.p1.pts, 3);
  assert.equal(sk.p2.pts, 2);
  assert.equal(sk.p1.gp, 2);
  const gl = goalieStats(P, T, games, goals)[0];
  assert.equal(gl.gp, 2);
  assert.equal(gl.ga, 2); // gól do prázdnej bránky sa nepočíta
  assert.equal(gl.gaa, 1);
  assert.equal(gl.so, 0);
  assert.equal(gl.svPct, (29 - 2) / 29);
});

test('poradie s rovnakými hodnotami', () => {
  const r = rank([{ v: 5 }, { v: 3 }, { v: 3 }, { v: 1 }], (x) => x.v);
  assert.deepEqual(r.map((x) => `${x.tie ? 'R' : ''}${x.rank}`), ['1', 'R2', 'R2', '4']);
});

test('farby tímu', () => {
  assert.equal(safeColor('red; background:url(x)'), '#1f4fd8');
  assert.equal(inkOn('#ffffff'), '#0b1626');
  assert.equal(inkOn('#0b1626'), '#ffffff');
});
