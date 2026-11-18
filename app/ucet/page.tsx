import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/session';
import { ArrowUpRight } from '@/components/Icons';
import { prisma } from '@/lib/prisma';
import { AREA_LABEL } from '@/lib/booking/format';
import { fmtDayShort, fmtRange } from '@/lib/booking/time';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Môj účet') };
}

export default async function UcetPage() {
  const t = await getT();
  const user = await requireUser('/ucet');
  const nextBookings = await prisma.booking.findMany({
    where: { userId: user.id, status: 'CONFIRMED', endsAt: { gt: new Date() } },
    orderBy: { startsAt: 'asc' },
    take: 3,
  });
  const since = new Intl.DateTimeFormat('sk-SK', { month: 'long', year: 'numeric', timeZone: 'Europe/Bratislava' }).format(user.createdAt);
  return (
    <div className="acct__stack">
      <header className="acct__head">
        <h1 className="display acct__title">
          {t('Ahoj,')}{' '}<span className="red">{user.firstName}</span>
        </h1>
        <p className="muted">{t('Člen od {since}', { since })}</p>
      </header>

      <Link href="/rezervacia" className="card card--red acct__cta">
        <div>
          <span className="pill">{t('Rezervácia ľadu')}</span>
          <h2 className="h-card">{t('Rezervuj si ďalší tréning')}</h2>
          <p>{t('Celá ľadová plocha, sprchy za príplatok.')}</p>
        </div>
        <span className="round-arrow">
          <ArrowUpRight />
        </span>
      </Link>

      <div className="acct__grid">
        <Link href="/ucet/rezervacie" className="card acct__tile">
          <h2 className="h-card">{t('Moje rezervácie')}</h2>
          {nextBookings.length === 0 ? (
            <p className="muted">{t('Nemáš žiadne nadchádzajúce rezervácie.')}</p>
          ) : (
            <ul className="acct__mini">
              {nextBookings.map((b) => (
                <li key={b.id}>
                  <strong>{fmtDayShort(b.startsAt, t)}</strong> <span className="num">{fmtRange(b.startsAt, b.endsAt)}</span>
                  <small>{t(AREA_LABEL[b.area])}</small>
                </li>
              ))}
            </ul>
          )}
        </Link>
        <Link href="/ucet/zabezpecenie" className="card acct__tile">
          <h2 className="h-card">{t('Zabezpečenie')}</h2>
          <p className="muted">{t('Dvojstupňové overenie:')}</p>
          <span className={`status ${user.twoFactorEnabledAt ? 'status--ok' : 'status--warn'}`}>{user.twoFactorEnabledAt ? t('Zapnuté') : t('Vypnuté – odporúčame zapnúť')}</span>
        </Link>
        <Link href="/ucet/profil" className="card acct__tile">
          <h2 className="h-card">{t('Osobné údaje')}</h2>
          <p className="muted">
            {user.firstName} {user.lastName}
            <br />
            {user.phone ?? t('Telefón nie je vyplnený')}
          </p>
        </Link>
      </div>
    </div>
  );
}
