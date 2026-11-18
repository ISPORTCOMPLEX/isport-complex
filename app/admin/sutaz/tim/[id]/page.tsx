import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/staff';
import { ensureLeagueTables } from '@/lib/league/db';
import { AdmHead, Chip, Empty, Panel, fmtDateTime } from '@/components/admin/ui';
import { TeamBadge } from '@/components/league/ui';
import { TEAM_STATUS, POSITION } from '@/lib/league/labels';
import { addPlayerAction, deletePlayerAction, deleteTeamAction, setTeamStatusAction, updatePlayerAction, updateTeamAction } from '@/lib/actions/league';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Tím') };
}

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ stav?: string; chyba?: string }> };

export default async function AdminTeamPage({ params, searchParams }: Props) {
  const t = await getT();
  await requireStaff('league.manage', '/admin/sutaz');
  await ensureLeagueTables();
  const { id } = await params;
  const sp = await searchParams;
  const team = await prisma.leagueTeam.findUnique({ where: { id }, include: { players: { orderBy: [{ position: 'asc' }, { number: 'asc' }, { name: 'asc' }] }, _count: { select: { homeGames: true, awayGames: true } } } });
  if (!team) notFound();
  const st = TEAM_STATUS[team.status] ?? TEAM_STATUS.PENDING;
  const games = team._count.homeGames + team._count.awayGames;

  const statusBtn = (status: string, label: string, cls = 'btn btn--sm') => (
    <form action={setTeamStatusAction}>
      <input type="hidden" name="id" value={team.id} />
      <input type="hidden" name="status" value={status} />
      <button className={cls}>{label}</button>
    </form>
  );

  return (
    <div className="adm__stack">
      <Link href="/admin/sutaz" className="adm-back">
        ← {t('Súťaž tímov')}
      </Link>
      <AdmHead title={team.name} sub={<Chip tone={st.tone}>{t(st.label)}</Chip>} />
      {sp.stav ? <div className="alert alert--ok">{t('Uložené.')}</div> : null}
      {sp.chyba === 'zapasy' ? <div className="alert alert--error">{t('Tím má zápasy – najprv ich zmaž, alebo tím len zamietni.')}</div> : null}
      {sp.chyba === 'hrac' ? <div className="alert alert--error">{t('Skontroluj meno (aspoň 2 znaky) a číslo dresu (0 – 99).')}</div> : null}

      <div className="adm-grid">
        <Panel title={t('Údaje tímu')}>
          <form action={updateTeamAction} className="adm-inline-form u-mt0">
            <input type="hidden" name="id" value={team.id} />
            <label className="adm-label">
              {t('Názov')}
              <input name="name" defaultValue={team.name} maxLength={60} className="adm-input" required />
            </label>
            <label className="adm-label lg-adm-narrow">
              {t('Skratka')}
              <input name="short" defaultValue={team.short} maxLength={4} className="adm-input" required />
            </label>
            <label className="adm-label">
              {t('Mesto')}
              <input name="city" defaultValue={team.city} maxLength={60} className="adm-input" />
            </label>
            <label className="adm-label lg-adm-narrow">
              {t('Farba')}
              <input type="color" name="color" defaultValue={team.color} className="adm-input lg-adm-color" />
            </label>
            <button className="btn btn--sm">{t('Uložiť')}</button>
          </form>
        </Panel>
        <Panel title={t('Prihláška')}>
          <dl className="adm-dl">
            <div>
              <dt>{t('Kontakt')}</dt>
              <dd>{team.contactName}</dd>
            </div>
            <div>
              <dt>{t('E-mail')}</dt>
              <dd>
                <a href={`mailto:${team.contactEmail}`}>{team.contactEmail}</a>
              </dd>
            </div>
            {team.contactPhone ? (
              <div>
                <dt>{t('Telefón')}</dt>
                <dd>
                  <a href={`tel:${team.contactPhone}`}>{team.contactPhone}</a>
                </dd>
              </div>
            ) : null}
            <div>
              <dt>{t('Prihlásený')}</dt>
              <dd>{fmtDateTime(team.createdAt, t)}</dd>
            </div>
            {team.note ? (
              <div>
                <dt>{t('Poznámka')}</dt>
                <dd className="u-pre">{team.note}</dd>
              </div>
            ) : null}
          </dl>
          <div className="lg-adm-acts">
            <TeamBadge team={team} size="lg" />
            {team.status !== 'APPROVED' ? statusBtn('APPROVED', t('Schváliť tím')) : null}
            {team.status !== 'REJECTED' ? statusBtn('REJECTED', t('Zamietnuť'), 'btn btn--sm btn--ghost') : null}
            {team.status === 'REJECTED' ? statusBtn('PENDING', t('Vrátiť na posúdenie'), 'btn btn--sm btn--ghost') : null}
          </div>
        </Panel>
      </div>

      <div id="supiska" />
      <Panel title={t('Súpiska ({n})', { n: team.players.length })}>
        {team.players.length === 0 ? (
          <Empty>{t('Súpiska je prázdna.')}</Empty>
        ) : (
          <ul className="lg-adm-roster">
            {team.players.map((p) => (
              <li key={p.id}>
                <form action={updatePlayerAction} className="lg-adm-prow">
                  <input type="hidden" name="id" value={p.id} />
                  <input name="number" defaultValue={p.number ?? ''} inputMode="numeric" maxLength={2} className="adm-input lg-adm-num" aria-label={t('Číslo')} />
                  <input name="name" defaultValue={p.name} maxLength={80} className="adm-input" aria-label={t('Meno')} required />
                  <select name="position" defaultValue={p.position} className="adm-select" aria-label={t('Post')}>
                    {Object.entries(POSITION).map(([k, v]) => (
                      <option key={k} value={k}>
                        {t(v)}
                      </option>
                    ))}
                  </select>
                  <button className="btn btn--sm btn--ghost">{t('Uložiť')}</button>
                </form>
                <form action={deletePlayerAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="lg-adm-del" aria-label={t('Odstrániť {name}', { name: p.name })}>
                    {t('Odstrániť')}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={addPlayerAction} className="adm-inline-form">
          <input type="hidden" name="teamId" value={team.id} />
          <label className="adm-label lg-adm-narrow">
            {t('Číslo')}
            <input name="number" inputMode="numeric" maxLength={2} className="adm-input" />
          </label>
          <label className="adm-label">
            {t('Meno a priezvisko')}
            <input name="name" maxLength={80} className="adm-input" required />
          </label>
          <label className="adm-label lg-adm-narrow">
            {t('Post')}
            <select name="position" className="adm-select" defaultValue="F">
              {Object.entries(POSITION).map(([k, v]) => (
                <option key={k} value={k}>
                  {t(v)}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn--sm">{t('Pridať hráča')}</button>
        </form>
      </Panel>

      <Panel title={t('Zmazanie tímu')}>
        {games ? (
          <p className="muted">{t('Tím má {n} zápasov, preto sa nedá zmazať. Ak nemá byť v súťaži, zamietni ho.', { n: games })}</p>
        ) : (
          <form action={deleteTeamAction} className="adm-inline-form u-mt0">
            <input type="hidden" name="id" value={team.id} />
            <p className="muted">{t('Zmaže tím aj s celou súpiskou. Nedá sa vrátiť.')}</p>
            <button className="btn btn--sm btn--danger">{t('Zmazať tím')}</button>
          </form>
        )}
      </Panel>
    </div>
  );
}
