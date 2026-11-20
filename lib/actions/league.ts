'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { hitLimit } from '@/lib/rateLimit';
import { getBaseUrl, getRequestInfo } from '@/lib/requestInfo';
import { getSessionUser } from '@/lib/session';
import { requireStaff } from '@/lib/staff';
import { ensureLeagueTables } from '@/lib/league/db';
import { safeColor } from '@/lib/league/calc';
import { hallTime } from '@/lib/booking/time';
import { isEmail, isPhone, normalizeEmail, normalizePhone, str, checked } from '@/lib/validate';
import { getT, MAIL_SK_EN } from '@/lib/i18n/server';
import { checkReport, compareReports, readGoals, readIds, type ReportInput } from '@/lib/league/report';
import { sendLeagueResultEmail } from '@/lib/email';
import { checkPlayer, rosterFrom } from '@/lib/league/roster';
import { verifyOwnImg } from '@/lib/league/images';

export type TeamFormState = { error?: string; errors?: Record<string, string>; done?: boolean };

const POSITIONS = ['F', 'D', 'G'];
const safeJson = (v: string): unknown => {
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};
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
  const roster = rosterFrom((k) => form.getAll(k).map((v) => String(v)));
  let logoRaw: unknown = null;
  try {
    logoRaw = JSON.parse(str(form, 'logo', 2000) || 'null');
  } catch {
    logoRaw = null;
  }
  const errors: Record<string, string> = {};
  if (name.length < 2 || name.length > 60) errors.name = t('Zadaj názov tímu (2 – 60 znakov).');
  if (!/^[A-Z0-9ÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]{2,4}$/.test(short)) errors.short = t('Skratka má 2 – 4 písmená alebo číslice, napr. KES.');
  if (contactName.length < 2) errors.contactName = t('Zadaj meno kontaktnej osoby.');
  if (!isEmail(contactEmail)) errors.contactEmail = t('Zadaj platný e-mail.');
  if (contactPhone && !isPhone(contactPhone)) errors.contactPhone = t('Neplatný telefón.');
  if (roster.length < 5) errors.roster = t('Súpiska potrebuje aspoň 5 hráčov.');
  else if (roster.length > 30) errors.roster = t('Súpiska môže mať najviac 30 hráčov.');
  else {
    const bad = roster.map((p, i) => ({ i, e: checkPlayer(p) })).find((x) => x.e);
    const nums = roster.map((p) => p.number).filter((n): n is number => n !== null);
    if (bad) errors.roster = t('Hráč {n}: {e}.', { n: bad.i + 1, e: t(bad.e as string) });
    else if (new Set(nums).size !== nums.length) errors.roster = t('Dvaja hráči majú rovnaké číslo dresu.');
  }
  const logo = logoRaw ? await verifyOwnImg(logoRaw, user.id) : null;
  if (!logo) errors.logo = t('Nahraj logo tímu.');
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

  // fotky hráčov (nepovinné) – len tie, ktoré používateľ naozaj nahral
  const photos = await Promise.all(roster.map((p) => (p.photo ? verifyOwnImg(safeJson(p.photo), user.id).catch(() => null) : Promise.resolve(null))));
  const players = roster.map((p, i) => ({ name: p.name, number: p.number, position: p.position, birthYear: p.birthYear, heightCm: p.heightCm, weightKg: p.weightKg, shoots: p.shoots, photo: photos[i] ?? undefined }));
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
      logo: logo ?? undefined,
      players: { create: players },
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
      confirmedBy: final ? 'admin' : '',
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

// ───────── Zápis výsledku vedúcim tímu ─────────
// Každý tím zapíše skóre zápasu, svojich strelcov, súpisku a brankára. Keď sa skóre oboch zápisov zhoduje,
// výsledok sa sám zapíše do súťaže. Pri nezhode dostanú vedúci oboch tímov e-mail.
export type ReportState = { error?: string; errors?: string[]; done?: 'waiting' | 'confirmed' | 'mismatch' | 'swapped'; at?: number };

export async function submitReportAction(_prev: ReportState, form: FormData): Promise<ReportState> {
  const t = await getT();
  const user = await getSessionUser();
  if (!user) return { error: t('Prihlás sa, prosím.') };
  await ensureLeagueTables();
  const gameId = str(form, 'gameId', 40);
  const teamId = str(form, 'teamId', 40);
  if (!isId(gameId) || !isId(teamId)) return { error: t('Neplatná požiadavka.') };
  const limit = await hitLimit(`league:report:${user.id}`, 40, 60 * 60);
  if (!limit.ok) return { error: t('Priveľa pokusov. Skús to o chvíľu.') };

  const team = await prisma.leagueTeam.findFirst({ where: { id: teamId, userId: user.id, status: 'APPROVED' }, include: { players: { select: { id: true } } } });
  if (!team) return { error: t('Výsledok môže zapísať len vedúci tímu.') };
  const game = await prisma.leagueGame.findUnique({ where: { id: gameId }, include: { home: true, away: true } });
  if (!game || (game.homeId !== teamId && game.awayId !== teamId)) return { error: t('Zápas sa nenašiel.') };
  if (game.status === 'FINAL') return { error: t('Výsledok tohto zápasu je už zapísaný. Ak je v ňom chyba, napíš správcovi súťaže.') };
  if (game.startsAt.getTime() > Date.now()) return { error: t('Výsledok sa dá zapísať až po začiatku zápasu.') };

  const num = (k: string) => (str(form, k, 3) === '' ? NaN : Number(str(form, k, 3)));
  let goalsRaw: unknown = [];
  try {
    goalsRaw = JSON.parse(String(form.get('goals') ?? '[]').slice(0, 20000));
  } catch {
    goalsRaw = [];
  }
  const input: ReportInput = {
    homeScore: num('homeScore'),
    awayScore: num('awayScore'),
    decision: str(form, 'decision', 3),
    shots: str(form, 'shots', 3) === '' ? null : num('shots'),
    goalieId: isId(str(form, 'goalieId', 40)) ? str(form, 'goalieId', 40) : null,
    lineup: [...new Set(form.getAll('lineup').map(String).filter(isId))].slice(0, 40),
    goals: readGoals(goalsRaw).slice(0, 40),
  };
  const side = game.homeId === teamId ? 'home' : 'away';
  const errors = checkReport(input, side, team.players.map((p) => p.id));
  if (errors.length) return { error: t('Zápis má chyby – oprav ich a odošli znova.'), errors: errors.map((e) => t(e)) };

  const data = { userId: user.id, homeScore: input.homeScore, awayScore: input.awayScore, decision: input.decision, shots: input.shots, goalieId: input.goalieId, lineup: input.lineup, goals: input.goals };
  await prisma.leagueReport.upsert({ where: { gameId_teamId: { gameId, teamId } }, create: { gameId, teamId, ...data }, update: data });
  const otherId = side === 'home' ? game.awayId : game.homeId;
  const other = await prisma.leagueReport.findUnique({ where: { gameId_teamId: { gameId, teamId: otherId } } });
  revalidatePath('/sutaz/moj-tim', 'layout');
  if (!other) return { done: 'waiting', at: Date.now() };

  const cmp = compareReports(input, other);
  const base = await getBaseUrl();
  const matchName = `${game.home.name} – ${game.away.name}`;
  const recipients = [game.home, game.away].filter((x) => x.contactEmail);
  const rowsFor = (homeScore: number, awayScore: number) => (tt: typeof t) => [
    { label: tt('Zápas'), value: matchName },
    { label: tt('Skóre'), value: `${homeScore} : ${awayScore}` },
  ];

  if (cmp !== 'match') {
    for (const r of recipients)
      await sendLeagueResultEmail(MAIL_SK_EN(), r.contactEmail, r.contactName, `${base}/sutaz/moj-tim/zapas/${gameId}?tim=${r.id}`, cmp, matchName, (tt) => [
        { label: tt('Zápas'), value: matchName },
        { label: tt('Zápis domácich'), value: `${(side === 'home' ? input : other).homeScore} : ${(side === 'home' ? input : other).awayScore}` },
        { label: tt('Zápis hostí'), value: `${(side === 'away' ? input : other).homeScore} : ${(side === 'away' ? input : other).awayScore}` },
      ]).catch(() => undefined);
    return { done: cmp, at: Date.now() };
  }

  // zhoda → výsledok sa zapíše aj so strelcami oboch tímov, súpiskami, brankármi a strelami
  const home = side === 'home' ? input : { ...other, lineup: readIds(other.lineup), goals: readGoals(other.goals) };
  const away = side === 'away' ? input : { ...other, lineup: readIds(other.lineup), goals: readGoals(other.goals) };
  const goalRows = [
    ...home.goals.map((g) => ({ ...g, teamId: game.homeId })),
    ...away.goals.map((g) => ({ ...g, teamId: game.awayId })),
  ];
  await prisma.$transaction([
    prisma.leagueGoal.deleteMany({ where: { gameId } }),
    prisma.leagueGame.update({
      where: { id: gameId },
      data: {
        status: 'FINAL',
        confirmedBy: 'teams',
        homeScore: input.homeScore,
        awayScore: input.awayScore,
        decision: input.decision,
        homeShots: home.shots,
        awayShots: away.shots,
        homeGoalieId: home.goalieId,
        awayGoalieId: away.goalieId,
        homeLineup: home.lineup,
        awayLineup: away.lineup,
      },
    }),
    ...goalRows.map((g) => prisma.leagueGoal.create({ data: { gameId, teamId: g.teamId, scorerId: g.scorerId, assist1Id: g.assist1Id, assist2Id: g.assist2Id, period: g.period, time: g.time, kind: g.kind } })),
  ]);
  await audit(user.id, 'league.game.confirmed', gameId, { homeScore: input.homeScore, awayScore: input.awayScore });
  revalidatePath('/sutaz', 'layout');
  for (const r of recipients) await sendLeagueResultEmail(MAIL_SK_EN(), r.contactEmail, r.contactName, `${base}/sutaz/vysledky`, 'ok', matchName, rowsFor(input.homeScore, input.awayScore)).catch(() => undefined);
  return { done: 'confirmed', at: Date.now() };
}

// ───────── Úprava tímu vedúcim (logo, súpiska, fotky hráčov) ─────────
export async function saveMyTeamAction(_prev: TeamFormState, form: FormData): Promise<TeamFormState> {
  const t = await getT();
  const user = await getSessionUser();
  if (!user) return { error: t('Prihlás sa, prosím.') };
  await ensureLeagueTables();
  const teamId = str(form, 'teamId', 40);
  const team = isId(teamId) ? await prisma.leagueTeam.findFirst({ where: { id: teamId, userId: user.id }, include: { players: { select: { id: true, name: true } } } }) : null;
  if (!team) return { error: t('Tím sa nenašiel.') };
  const limit = await hitLimit(`league:team-save:${user.id}`, 30, 60 * 60);
  if (!limit.ok) return { error: t('Priveľa pokusov. Skús to o chvíľu.') };

  const roster = rosterFrom((k) => form.getAll(k).map((v) => String(v)));
  const errors: Record<string, string> = {};
  const logo = await verifyOwnImg(safeJson(str(form, 'logo', 2000)), user.id);
  if (!logo) errors.logo = t('Tím musí mať logo.');
  if (roster.length < 5) errors.roster = t('Súpiska potrebuje aspoň 5 hráčov.');
  else if (roster.length > 30) errors.roster = t('Súpiska môže mať najviac 30 hráčov.');
  else {
    const bad = roster.map((p, i) => ({ i, e: checkPlayer(p) })).find((x) => x.e);
    const nums = roster.map((p) => p.number).filter((n): n is number => n !== null);
    if (bad) errors.roster = t('Hráč {n}: {e}.', { n: bad.i + 1, e: t(bad.e as string) });
    else if (new Set(nums).size !== nums.length) errors.roster = t('Dvaja hráči majú rovnaké číslo dresu.');
  }
  // hráči, ktorí zmizli zo súpisky – odstrániť sa dajú len bez gólov, asistencií a zápasov v bráne
  const own = new Set(team.players.map((p) => p.id));
  const kept = new Set(roster.map((p) => p.id).filter((id): id is string => !!id && own.has(id)));
  const removed = team.players.filter((p) => !kept.has(p.id));
  if (removed.length) {
    const ids = removed.map((p) => p.id);
    const used = await prisma.leagueGoal.findFirst({ where: { OR: [{ scorerId: { in: ids } }, { assist1Id: { in: ids } }, { assist2Id: { in: ids } }] }, select: { scorerId: true, assist1Id: true, assist2Id: true } });
    const goalie = await prisma.leagueGame.findFirst({ where: { OR: [{ homeGoalieId: { in: ids } }, { awayGoalieId: { in: ids } }] }, select: { id: true } });
    if (used || goalie) errors.roster = t('Niektorého z odstránených hráčov nemožno vymazať – má v súťaži góly, asistencie alebo zápasy v bráne.');
  }
  if (Object.keys(errors).length) return { error: t('Skontroluj označené polia.'), errors };

  const photos = await Promise.all(roster.map((p) => (p.photo ? verifyOwnImg(safeJson(p.photo), user.id).catch(() => null) : Promise.resolve(null))));
  const { Prisma } = await import('@prisma/client');
  await prisma.$transaction([
    prisma.leagueTeam.update({ where: { id: team.id }, data: { logo } }),
    ...(removed.length ? [prisma.leaguePlayer.deleteMany({ where: { id: { in: removed.map((p) => p.id) }, teamId: team.id } })] : []),
    ...roster.map((p, i) => {
      const data = { name: p.name, number: p.number, position: p.position, birthYear: p.birthYear, heightCm: p.heightCm, weightKg: p.weightKg, shoots: p.shoots, photo: photos[i] ?? Prisma.DbNull };
      return p.id && own.has(p.id) ? prisma.leaguePlayer.update({ where: { id: p.id }, data }) : prisma.leaguePlayer.create({ data: { ...data, teamId: team.id } });
    }),
  ]);
  revalidatePath('/sutaz', 'layout');
  revalidatePath('/admin/sutaz');
  return { done: true };
}
