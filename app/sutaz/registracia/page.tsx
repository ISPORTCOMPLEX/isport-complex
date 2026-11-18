import type { Metadata } from 'next';
import Link from 'next/link';
import { TeamRegisterForm } from '@/components/league/TeamRegisterForm';
import { TeamBadge } from '@/components/league/ui';
import { getSessionUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { ensureLeagueTables } from '@/lib/league/db';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Registrácia tímu – Súťaž tímov'), description: t('Prihlás svoj hokejový tím do súťaže tímov v I-SPORT COMPLEX Košice.') };
}

const STATUS: Record<string, string> = { PENDING: 'Čaká na schválenie', APPROVED: 'Schválený', REJECTED: 'Neschválený' };

export default async function RegistraciaPage() {
  const t = await getT();
  const me = await getSessionUser();
  const mine = me
    ? await ensureLeagueTables()
        .then(() => prisma.leagueTeam.findMany({ where: { userId: me.id }, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, short: true, color: true, status: true, _count: { select: { players: true } } } }))
        .catch(() => [])
    : [];
  return (
    <>
      <h1 className="lgh">{t('Registrácia tímu')}</h1>
      <div className="lgreg-wrap">
        <div className="lgreg-main">
          {me ? (
            <TeamRegisterForm name={`${me.firstName} ${me.lastName}`.trim()} email={me.email} phone={me.phone ?? ''} />
          ) : (
            <div className="lgreg__login">
              <h2>{t('Najprv sa prihlás')}</h2>
              <p>{t('Tím prihlasuje kapitán alebo vedúci tímu zo svojho účtu. Účet si vytvoríš za minútu a uvidíš v ňom aj stav prihlášky.')}</p>
              <div>
                <Link href="/prihlasenie?next=%2Fsutaz%2Fregistracia" className="lgbtn lgbtn--gold">
                  {t('Prihlásiť sa')}
                </Link>
                <Link href="/registracia" className="lgbtn">
                  {t('Vytvoriť účet')}
                </Link>
              </div>
            </div>
          )}
        </div>
        <aside className="lgreg-side">
          {mine.length ? (
            <section className="lgo__box">
              <h2 className="lgreg-side__h">{t('Moje tímy')}</h2>
              <p className="lg-muted lgreg-side__p">
                <Link href="/sutaz/moj-tim">{t('Zápasy a zápis výsledkov')} →</Link>
              </p>
              <ul className="lgreg-mine">
                {mine.map((x) => (
                  <li key={x.id}>
                    <TeamBadge team={x} size="sm" />
                    <span>
                      <b>{x.name}</b>
                      <small>{t.n(x._count.players, '{n} hráč|{n} hráči|{n} hráčov')}</small>
                    </span>
                    <span className={`lgreg-st lgreg-st--${x.status.toLowerCase()}`}>{t(STATUS[x.status] ?? x.status)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className="lgo__box">
            <h2 className="lgreg-side__h">{t('Ako to funguje')}</h2>
            <ol className="lgreg-steps">
              <li>{t('Vyplníš údaje o tíme a súpisku hráčov.')}</li>
              <li>{t('Prihlášku skontrolujeme a ozveme sa na tvoj e-mail.')}</li>
              <li>{t('Po schválení dostane tím termíny zápasov v rozpise.')}</li>
              <li>{t('Výsledky, tabuľka a štatistiky hráčov sa zobrazujú tu na webe.')}</li>
            </ol>
          </section>
        </aside>
      </div>
    </>
  );
}
