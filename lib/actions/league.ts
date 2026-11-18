'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { hitLimit } from '@/lib/rateLimit';
import { getRequestInfo } from '@/lib/requestInfo';
import { getSessionUser } from '@/lib/session';
import { requireStaff } from '@/lib/staff';
import { ensureLeagueTables } from '@/lib/league/db';
import { safeColor } from '@/lib/league/calc';
import { hallTime } from '@/lib/booking/time';
import { isEmail, isPhone, normalizeEmail, normalizePhone, str, checked } from '@/lib/validate';
import { getT } from '@/lib/i18n/server';

export type TeamFormState = { error?: string; errors?: Record<string, string>; done?: boolean };

const POSITIONS = ['F', 'D', 'G'];
const isId = (v: string) => /^[a-z0-9]{10,40}$/i.test(v);
const clean = (v: string) => v.replace(/[\u0000-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '').replace(/\s+/g, ' ').trim();

// ───────── Registrácia tímu (prihlásený používateľ) ─────────
export async function registerTeamAction(_prev: TeamFormState, form: FormData): Promise<TeamFormState> {
  const t = await getT();
  const user = await getSessionUser();
  if (!user) return { error: t('Na registráciu tímu sa prihlás.') };
  await ensureLeagueTables();

  const name = clean(str(form, 'name', 80));
  const short = clean(str(form, 'short', 8)).toUpperCase();
  const city = clean(str(form, 'city', 80));
  const color = safeColor(str(form, 'color', 7));
  const contactName = clean(str(form, 'contactName', 120));
  const contactEmail = normalizeEmail(str(form, 'contactEmail', 254));
  const contactPhone = normalizePhone(str(form, 'contactPhone', 30));
  const note = str(form, 'note', 1000).trim();
  const names = form.getAll('playerName').map((v) => clean(String(v)).slice(0, 80));
  const numbers = form.getAll('playerNumber').map((v) => String(v).trim());
  const positions = form.getAll('playerPos').map((v) => String(v));
  const roster = names
    .map((n, i) => ({ name: n, number: numbers[i] === '' || numbers[i] === undefined ? null : Number(numbers[i]), position: POSITIONS.includes(positions[i]) ? positions[i] : 'F' }))
    .filter((p) => p.name.length > 0);

  const errors: Record<string, string> = {};
  if (name.length < 2 || name.length > 60) errors.name = t('Zadaj názov tímu (2 – 60 znakov).');
  if (!/^[A-Z0-9ÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]{2,4}$/.test(short)) errors.short = t('Skratka má 2 – 4 písmená alebo číslice, napr. KES.');
  if (contactName.length < 2) errors.contactName = t('Zadaj meno kontaktnej osoby.');
  if (!isEmail(contactEmail)) errors.contactEmail = t('Zadaj platný e-mail.');
  if (contactPhone && !isPhone(contactPhone)) errors.contactPhone = t('Neplatný telefón.');
  if (roster.length < 5) errors.roster = t('Súpiska potrebuje aspoň 5 hráčov.');
  else if (roster.length > 30) errors.roster = t('Súpiska môže mať najviac 30 hráčov.');
  else if (roster.some((p) => p.number !== null && (!Number.isInteger(p.number) || p.number < 0 || p.number > 99))) errors.roster = t('Čísla dresov musia byť 0 – 99.');
  else {
    const nums = roster.map((p) => p.number).filter((n): n is number => n !== null);
    if (new Set(nums).size !== nums.length) errors.roster = t('Dvaja hráči majú rovnaké číslo dresu.');
  }
  if (!checked(form, 'consent')) errors.consent = t('Potvrď súhlas so spracovaním údajov.');
  if (Object.keys(errors).length) return { error: t('Skontroluj označené polia.'), errors };

  const limit = await hitLimit(`league:register:${user.id}`, 5, 24 * 60 * 60);
  if (!limit.ok) return { error: t('Dnes si už poslal veľa prihlášok. Skús to zajtra.') };
  const mine = await prisma.leagueTeam.count({ where: { userId: user.id, status: { not: 'REJECTED' } } });
  if (mine >= 3) return { error: t('Z jedného účtu môžu byť prihlásené najviac 3 tímy.') };
  const clash = await prisma.leagueTeam.findFirst({
    where: { status: { not: 'REJECTED' }, OR: [{ name: { equals: name, mode: 'insensitive' } }, { short }] },
    select: { name: true, short: true },
  });
  if (clash) {
    return clash.short === short
      ? { error: t('Skontroluj označené polia.'), errors: { short: t('Túto skratku už používa iný tím.') } }
      : { error: t('Skontroluj označené polia.'), errors: { name: t('Tím s týmto názvom je už prihlásený.') } };
  }

  await prisma.leagueTeam.create({
    data: {
      name,
      short,
      city,
      color,
      contactName,
      contactEmail,
      contactPhone,
      note,
      userId: user.id,
      players: { create: roster.map((p) => ({ name: p.name, number: p.number, position: p.position })) },
    },
  });
  revalidatePath('/admin/sutaz');
  return { done: true };
}

// ───────── Administrácia ─────────
async function staff() {
  const me = await requireStaff('league.manage', '/admin/sutaz');
  await ensureLeagueTables();
  return me;
}
async function audit(actorId: string, action: string, target: string, meta: Record<string, unknown> = {}) {
  const { ip } = await getRequestInfo();
  await prisma.auditLog.create({ data: { actorId, action, target, meta: meta as object, ip } }).catch(() => undefined);
}
const refresh = () => revalidatePath('/sutaz', 'layout');

export async function setTeamStatusAction(form: FormData): Promise<void> {
  const me = await staff();
  const id = str(form, 'id', 40);
  const status = str(form, 'status', 12);
  if (!isId(id) || !['APPROVED', 'REJECTED', 'PENDING'].includes(status)) redirect('/admin/sutaz');
  await prisma.leagueTeam.update({ where: { id }, data: { status, approvedAt: status === 'APPROVED' ? new Date() : null } });
  await audit(me.id, 'league.team.status', id, { status });
  refresh();
  redirect(`/admin/sutaz/tim/${id}?stav=ulozene`);
}

export async function updateTeamAction(form: FormData): Promise<void> {
  const me = await staff();
  const id = str(form, 'id', 40);
  if (!isId(id)) redirect('/admin/sutaz');
  const name = clean(str(form, 'name', 80)).slice(0, 60);
  const short = clean(str(form, 'short', 8)).toUpperCase();
  const data = {
    ...(name.length >= 2 ? { name } : {}),
    ...(/^[A-Z0-9ÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]{2,4}$/.test(short) ? { short } : {}),
    city: clean(str(form, 'city', 80)),
    color: safeColor(str(form, 'color', 7)),
  };
  await prisma.leagueTeam.update({ where: { id }, data });
  await audit(me.id, 'league.team.update', id);
  refresh();
  redirect(`/admin/sutaz/tim/${id}?stav=ulozene`);
}

export async function deleteTeamAction(form: FormData): Promise<void> {
  const me = await staff();
  const id = str(form, 'id', 40);
  if (!isId(id)) redirect('/admin/sutaz');
  const games = await prisma.leagueGame.count({ where: { OR: [{ homeId: id }, { awayId: id }] } });
  if (games) redirect(`/admin/sutaz/tim/${id}?chyba=zapasy`);
  await prisma.leagueTeam.delete({ where: { id } });
  await audit(me.id, 'league.team.delete', id);
  refresh();
  redirect('/admin/sutaz?stav=zmazane');
}

export async function addPlayerAction(form: FormData): Promise<void> {
  const me = await staff();
  const teamId = str(form, 'teamId', 40);
  const name = clean(str(form, 'name', 80));
  const numRaw = str(form, 'number', 3);
  const number = numRaw === '' ? null : Number(numRaw);
  const position = POSITIONS.includes(str(form, 'position', 1)) ? str(form, 'position', 1) : 'F';
  if (!isId(teamId)) redirect('/admin/sutaz');
  if (name.length < 2 || (number !== null && (!Number.isInteger(number) || number < 0 || number > 99))) redirect(`/admin/sutaz/tim/${teamId}?chyba=hrac`);
  await prisma.leaguePlayer.create({ data: { teamId, name, number, position } });
  await audit(me.id, 'league.player.add', teamId, { name });
  refresh();
  redirect(`/admin/sutaz/tim/${teamId}#supiska`);
}

export async function updatePlayerAction(form: FormData): Promise<void> {
  const me = await staff();
  const id = str(form, 'id', 40);
  const p = isId(id) ? await prisma.leaguePlayer.findUnique({ where: { id }, select: { teamId: true } }) : null;
  if (!p) redirect('/admin/sutaz');
  const name = clean(str(form, 'name', 80));
  const numRaw = str(form, 'number', 3);
  const number = numRaw === '' ? null : Number(numRaw);
  const position = POSITIONS.includes(str(form, 'position', 1)) ? str(form, 'position', 1) : 'F';
  if (name.length < 2 || (number !== null && (!Number.isInteger(number) || number < 0 || number > 99))) redirect(`/admin/sutaz/tim/${p.teamId}?chyba=hrac`);
  await prisma.leaguePlayer.update({ where: { id }, data: { name, number, position } });
  await audit(me.id, 'league.player.update', id);
  refresh();
  redirect(`/admin/sutaz/tim/${p.teamId}#supiska`);
}

export async function deletePlayerAction(form: FormData): Promise<void> {
  const me = await staff();
  const id = str(form, 'id', 40);
  const p = isId(id) ? await prisma.leaguePlayer.findUnique({ where: { id }, select: { teamId: true } }) : null;
  if (!p) redirect('/admin/sutaz');
  await prisma.leaguePlayer.delete({ where: { id } });
  await audit(me.id, 'league.player.delete', id);
  refresh();
  redirect(`/admin/sutaz/tim/${p.teamId}#supiska`);
}

// dátum „2026-11-20“ + čas „19:30“ → okamih v čase haly (Bratislava)
function startsAt(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return new Date(hallTime(date, Number(m[1])).getTime() + Number(m[2]) * 60_000);
}

export async function createGameAction(form: FormData): Promise<void> {
  const me = await staff();
  const homeId = str(form, 'homeId', 40);
  const awayId = str(form, 'awayId', 40);
  const at = startsAt(str(form, 'date', 10), str(form, 'time', 5));
  if (!isId(homeId) || !isId(awayId) || homeId === awayId || !at) redirect('/admin/sutaz?chyba=zapas#zapasy');
  const ok = await prisma.leagueTeam.count({ where: { id: { in: [homeId, awayId] }, status: 'APPROVED' } });
  if (ok !== 2) redirect('/admin/sutaz?chyba=zapas#zapasy');
  const g = await prisma.leagueGame.create({ data: { homeId, awayId, startsAt: at } });
  await audit(me.id, 'league.game.create', g.id);
  refresh();
  redirect('/admin/sutaz?stav=zapas#zapasy');
}

const intOrNull = (v: string, max = 999) => (v === '' ? null : Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= max ? Number(v) : null);

export async function updateGameAction(form: FormData): Promise<void> {
  const me = await staff();
  const id = str(form, 'id', 40);
  const g = isId(id) ? await prisma.leagueGame.findUnique({ where: { id }, include: { home: { select: { id: true } }, away: { select: { id: true } } } }) : null;
  if (!g) redirect('/admin/sutaz');
  const at = startsAt(str(form, 'date', 10), str(form, 'time', 5)) ?? g.startsAt;
  const homeScore = intOrNull(str(form, 'homeScore', 3), 99);
  const awayScore = intOrNull(str(form, 'awayScore', 3), 99);
  const decision = ['REG', 'OT', 'SO'].includes(str(form, 'decision', 3)) ? str(form, 'decision', 3) : 'REG';
  const final = checked(form, 'final');
  if (final && (homeScore === null || awayScore === null || homeScore === awayScore)) redirect(`/admin/sutaz/zapas/${id}?chyba=skore`);
  const goalie = async (v: string, teamId: string) => (isId(v) && (await prisma.leaguePlayer.count({ where: { id: v, teamId } })) ? v : null);
  await prisma.leagueGame.update({
    where: { id },
    data: {
      startsAt: at,
      status: final ? 'FINAL' : 'SCHEDULED',
      homeScore,
      awayScore,
      decision,
      homeShots: intOrNull(str(form, 'homeShots', 3)),
      awayShots: intOrNull(str(form, 'awayShots', 3)),
      homeGoalieId: await goalie(str(form, 'homeGoalieId', 40), g.homeId),
      awayGoalieId: await goalie(str(form, 'awayGoalieId', 40), g.awayId),
    },
  });
  await audit(me.id, 'league.game.update', id, { homeScore, awayScore, final });
  refresh();
  redirect(`/admin/sutaz/zapas/${id}?stav=ulozene`);
}

export async function deleteGameAction(form: FormData): Promise<void> {
  const me = await staff();
  const id = str(form, 'id', 40);
  if (!isId(id)) redirect('/admin/sutaz');
  await prisma.leagueGame.delete({ where: { id } }).catch(() => undefined);
  await audit(me.id, 'league.game.delete', id);
  refresh();
  redirect('/admin/sutaz?stav=zmazane#zapasy');
}

export async function addGoalAction(form: FormData): Promise<void> {
  const me = await staff();
  const gameId = str(form, 'gameId', 40);
  const g = isId(gameId) ? await prisma.leagueGame.findUnique({ where: { id: gameId }, select: { homeId: true, awayId: true } }) : null;
  if (!g) redirect('/admin/sutaz');
  const scorerId = str(form, 'scorerId', 40);
  const scorer = isId(scorerId) ? await prisma.leaguePlayer.findUnique({ where: { id: scorerId }, select: { teamId: true } }) : null;
  if (!scorer || (scorer.teamId !== g.homeId && scorer.teamId !== g.awayId)) redirect(`/admin/sutaz/zapas/${gameId}?chyba=gol#goly`);
  const mate = async (v: string) => (isId(v) && v !== scorerId && (await prisma.leaguePlayer.count({ where: { id: v, teamId: scorer.teamId } })) ? v : null);
  const a1 = await mate(str(form, 'assist1Id', 40));
  const a2raw = await mate(str(form, 'assist2Id', 40));
  const a2 = a1 && a2raw !== a1 ? a2raw : null;
  const period = Math.min(4, Math.max(1, Number(str(form, 'period', 1)) || 1));
  const tm = /^(\d{1,2}):(\d{2})$/.exec(str(form, 'time', 5));
  const time = tm && Number(tm[2]) < 60 ? `${tm[1].padStart(2, '0')}:${tm[2]}` : '';
  const kind = ['EV', 'PP', 'SH', 'EN', 'PS'].includes(str(form, 'kind', 2)) ? str(form, 'kind', 2) : 'EV';
  await prisma.leagueGoal.create({ data: { gameId, teamId: scorer.teamId, scorerId, assist1Id: a1, assist2Id: a2, period, time, kind } });
  await audit(me.id, 'league.goal.add', gameId);
  refresh();
  redirect(`/admin/sutaz/zapas/${gameId}#goly`);
}

export async function deleteGoalAction(form: FormData): Promise<void> {
  const me = await staff();
  const id = str(form, 'id', 40);
  const goal = isId(id) ? await prisma.leagueGoal.findUnique({ where: { id }, select: { gameId: true } }) : null;
  if (!goal) redirect('/admin/sutaz');
  await prisma.leagueGoal.delete({ where: { id } });
  await audit(me.id, 'league.goal.delete', goal.gameId);
  refresh();
  redirect(`/admin/sutaz/zapas/${goal.gameId}#goly`);
}
