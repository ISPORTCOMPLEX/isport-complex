import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/staff';
import { ensureLeagueTables } from '@/lib/league/db';
import { AdmHead, Chip, Empty, Panel } from '@/components/admin/ui';
import { TeamBadge } from '@/components/league/ui';
import { GOAL_KIND } from '@/lib/league/labels';
import { sortGoals } from '@/lib/league/calc';
import { addGoalAction, deleteGameAction, deleteGoalAction, updateGameAction } from '@/lib/actions/league';
import { todayIso } from '@/lib/booking/time';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Zápas') };
}

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ stav?: string; chyba?: string }> };

export default async function AdminGamePage({ params, searchParams }: Props) {
  const t = await getT();
  await requireStaff('league.manage', '/admin/sutaz');
  await ensureLeagueTables();
  const { id } = await params;
  const sp = await searchParams;
  const g = await prisma.leagueGame.findUnique({
    where: { id },
    include: { home: { include: { players: { orderBy: [{ number: 'asc' }, { name: 'asc' }] } } }, away: { include: { players: { orderBy: [{ number: 'asc' }, { name: 'asc' }] } } }, goals: true },
  });
  if (!g) notFound();
  const all = [...g.home.players, ...g.away.players];
  const name = (pid: string | null) => (pid ? (all.find((p) => p.id === pid)?.name ?? '—') : '');
  const goals = sortGoals(g.goals, [g]);
  const hg = goals.filter((x) => x.teamId === g.homeId).length;
  const ag = goals.length - hg;
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Bratislava', hour: '2-digit', minute: '2-digit', hour12: false }).format(g.startsAt);
  const label = (p: { number: number | null; name: string }) => `${p.number !== null ? `#${p.number} ` : ''}${p.name}`;
  const opts = (team: typeof g.home) => (
    <optgroup label={team.name}>
      {team.players.map((p) => (
        <option key={p.id} value={p.id}>
          {label(p)}
        </option>
      ))}
    </optgroup>
  );
  const goalieSel = (field: string, team: typeof g.home, value: string | null) => (
    <select name={field} defaultValue={value ?? ''} className="adm-select">
      <option value="">{t('— neuvedený —')}</option>
      {team.players
        .slice()
        .sort((a, b) => (a.position === 'G' ? -1 : 0) - (b.position === 'G' ? -1 : 0))
        .map((p) => (
          <option key={p.id} value={p.id}>
            {label(p)}
            {p.position === 'G' ? ` (${t('brankár')})` : ''}
          </option>
        ))}
    </select>
  );

  return (
    <div className="adm__stack">
      <Link href="/admin/sutaz#zapasy" className="adm-back">
        ← {t('Súťaž tímov')}
      </Link>
      <AdmHead
        title={`${g.home.name} – ${g.away.name}`}
        sub={g.status === 'FINAL' ? <Chip tone="ok">{t('Odohraný')}</Chip> : <Chip tone="blue">{t('Naplánovaný')}</Chip>}
      />
      {sp.stav ? <div className="alert alert--ok">{t('Uložené.')}</div> : null}
      {sp.chyba === 'skore' ? <div className="alert alert--error">{t('Odohraný zápas potrebuje skóre a víťaza (remíza nie je možná – rozhodne predĺženie alebo nájazdy).')}</div> : null}
      {sp.chyba === 'gol' ? <div className="alert alert--error">{t('Vyber strelca gólu.')}</div> : null}
      {g.status === 'FINAL' && goals.length > 0 && (hg !== g.homeScore || ag !== g.awayScore) ? (
        <div className="alert alert--error">{t('Zapísané góly ({hg}:{ag}) nesedia so skóre zápasu ({hs}:{as}).', { hg, ag, hs: g.homeScore ?? 0, as: g.awayScore ?? 0 })}</div>
      ) : null}

      <Panel title={t('Výsledok a termín')}>
        <form action={updateGameAction} className="lg-adm-game">
          <input type="hidden" name="id" value={g.id} />
          <div className="lg-adm-score">
            <span className="lg-adm-side">
              <TeamBadge team={g.home} size="lg" />
              <b>{g.home.name}</b>
              <small>{t('Domáci')}</small>
            </span>
            <input name="homeScore" defaultValue={g.homeScore ?? ''} inputMode="numeric" maxLength={2} className="adm-input lg-adm-big" aria-label={t('Góly domácich')} />
            <span className="lg-adm-colon">:</span>
            <input name="awayScore" defaultValue={g.awayScore ?? ''} inputMode="numeric" maxLength={2} className="adm-input lg-adm-big" aria-label={t('Góly hostí')} />
            <span className="lg-adm-side">
              <TeamBadge team={g.away} size="lg" />
              <b>{g.away.name}</b>
              <small>{t('Hostia')}</small>
            </span>
          </div>
          <div className="adm-inline-form">
            <label className="adm-label lg-adm-narrow">
              {t('Rozhodnutie')}
              <select name="decision" defaultValue={g.decision} className="adm-select">
                <option value="REG">{t('Riadny čas')}</option>
                <option value="OT">{t('Predĺženie')}</option>
                <option value="SO">{t('Nájazdy')}</option>
              </select>
            </label>
            <label className="adm-label lg-adm-narrow">
              {t('Strely domácich')}
              <input name="homeShots" defaultValue={g.homeShots ?? ''} inputMode="numeric" maxLength={3} className="adm-input" />
            </label>
            <label className="adm-label lg-adm-narrow">
              {t('Strely hostí')}
              <input name="awayShots" defaultValue={g.awayShots ?? ''} inputMode="numeric" maxLength={3} className="adm-input" />
            </label>
            <label className="adm-label">
              {t('Brankár domácich')}
              {goalieSel('homeGoalieId', g.home, g.homeGoalieId)}
            </label>
            <label className="adm-label">
              {t('Brankár hostí')}
              {goalieSel('awayGoalieId', g.away, g.awayGoalieId)}
            </label>
          </div>
          <div className="adm-inline-form">
            <label className="adm-label lg-adm-narrow">
              {t('Dátum')}
              <input type="date" name="date" defaultValue={todayIso(g.startsAt)} className="adm-input" />
            </label>
            <label className="adm-label lg-adm-narrow">
              {t('Čas')}
              <input type="time" name="time" defaultValue={time} step={300} className="adm-input" />
            </label>
            <label className="lg-adm-check">
              <input type="checkbox" name="final" value="1" defaultChecked={g.status === 'FINAL'} />
              {t('Zápas je odohraný (zobrazí sa vo výsledkoch a v tabuľke)')}
            </label>
            <button className="btn btn--sm">{t('Uložiť zápas')}</button>
          </div>
        </form>
      </Panel>

      <div id="goly" />
      <Panel title={t('Góly ({hg}:{ag})', { hg, ag })}>
        {goals.length === 0 ? (
          <Empty>{t('Zatiaľ bez zapísaných gólov. Góly sú nepovinné – bez nich sa ukáže len skóre.')}</Empty>
        ) : (
          <ul className="lg-adm-goals">
            {goals.map((x) => (
              <li key={x.id}>
                <span className="lg-adm-gt">
                  {x.period >= 4 ? t('P') : `${x.period}.`} {x.time}
                </span>
                <TeamBadge team={x.teamId === g.homeId ? g.home : g.away} size="sm" />
                <span>
                  <b>{name(x.scorerId) || t('Neznámy strelec')}</b>
                  {x.assist1Id ? <small> ({[name(x.assist1Id), name(x.assist2Id)].filter(Boolean).join(', ')})</small> : null}
                  {x.kind !== 'EV' ? <em className="lg-adm-kind">{t(GOAL_KIND[x.kind] ?? x.kind)}</em> : null}
                </span>
                <form action={deleteGoalAction}>
                  <input type="hidden" name="id" value={x.id} />
                  <button className="lg-adm-del">{t('Zmazať')}</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        {all.length ? (
          <form action={addGoalAction} className="adm-inline-form">
            <input type="hidden" name="gameId" value={g.id} />
            <label className="adm-label">
              {t('Strelec')}
              <select name="scorerId" className="adm-select" required defaultValue="">
                <option value="" disabled>
                  {t('Vyber hráča')}
                </option>
                {opts(g.home)}
                {opts(g.away)}
              </select>
            </label>
            <label className="adm-label">
              {t('1. asistencia')}
              <select name="assist1Id" className="adm-select" defaultValue="">
                <option value="">{t('— bez asistencie —')}</option>
                {opts(g.home)}
                {opts(g.away)}
              </select>
            </label>
            <label className="adm-label">
              {t('2. asistencia')}
              <select name="assist2Id" className="adm-select" defaultValue="">
                <option value="">{t('— bez asistencie —')}</option>
                {opts(g.home)}
                {opts(g.away)}
              </select>
            </label>
            <label className="adm-label lg-adm-narrow">
              {t('Tretina')}
              <select name="period" className="adm-select" defaultValue="1">
                <option value="1">1.</option>
                <option value="2">2.</option>
                <option value="3">3.</option>
                <option value="4">{t('Predĺženie')}</option>
              </select>
            </label>
            <label className="adm-label lg-adm-narrow">
              {t('Čas (mm:ss)')}
              <input name="time" placeholder="08:15" maxLength={5} className="adm-input" pattern="\d{1,2}:\d{2}" />
            </label>
            <label className="adm-label lg-adm-narrow">
              {t('Druh')}
              <select name="kind" className="adm-select" defaultValue="EV">
                {Object.entries(GOAL_KIND).map(([k, v]) => (
                  <option key={k} value={k}>
                    {t(v)}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted">{t('Tím gólu sa určí podľa strelca. Asistencie musia byť z rovnakého tímu ako strelec.')}</p>
            <button className="btn btn--sm">{t('Pridať gól')}</button>
          </form>
        ) : (
          <p className="muted">{t('Tímy nemajú na súpiske hráčov – doplň ich v detaile tímu.')}</p>
        )}
      </Panel>

      <Panel title={t('Zmazanie zápasu')}>
        <form action={deleteGameAction} className="adm-inline-form u-mt0">
          <input type="hidden" name="id" value={g.id} />
          <p className="muted">{t('Zmaže zápas aj so zapísanými gólmi. Nedá sa vrátiť.')}</p>
          <button className="btn btn--sm btn--danger">{t('Zmazať zápas')}</button>
        </form>
      </Panel>
    </div>
  );
}
