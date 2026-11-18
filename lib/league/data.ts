import 'server-only';
import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { ensureLeagueTables } from './db';
import { safeColor, type LGame, type LGoal, type LPlayer, type LTeam } from './calc';

export type League = { teams: LTeam[]; players: LPlayer[]; games: LGame[]; goals: LGoal[] };
const EMPTY: League = { teams: [], players: [], games: [], goals: [] };

// Celá súťaž v jednom načítaní (malá minisúťaž – desiatky tímov a zápasov). Verejne len schválené tímy.
export const loadLeague = cache(async (): Promise<League> => {
  try {
    await ensureLeagueTables();
    const teams = await prisma.leagueTeam.findMany({ where: { status: 'APPROVED' }, orderBy: { name: 'asc' }, select: { id: true, name: true, short: true, color: true, city: true } });
    const ids = teams.map((t) => t.id);
    if (!ids.length) return EMPTY;
    const [players, games] = await Promise.all([
      prisma.leaguePlayer.findMany({ where: { teamId: { in: ids } }, orderBy: [{ number: 'asc' }, { name: 'asc' }] }),
      prisma.leagueGame.findMany({ where: { homeId: { in: ids }, awayId: { in: ids } }, orderBy: { startsAt: 'asc' } }),
    ]);
    const goals = games.length ? await prisma.leagueGoal.findMany({ where: { gameId: { in: games.map((g) => g.id) } } }) : [];
    return {
      teams: teams.map((t) => ({ ...t, color: safeColor(t.color) })),
      players: players.map((p) => ({ id: p.id, teamId: p.teamId, name: p.name, number: p.number, position: p.position })),
      games,
      goals,
    };
  } catch {
    return EMPTY;
  }
});
