import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/session';
import { ArrowUpRight } from '@/components/Icons';
import { prisma } from '@/lib/prisma';
import { AREA_LABEL } from '@/lib/booking/format';
import { fmtDayShort, fmtRange } from '@/lib/booking/time';

export const metadata: Metadata = { title: 'Môj účet' };

export default async function UcetPage() {
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
        <span className="kicker">Môj účet</span>
        <h1 className="display acct__title">
          Ahoj, <span className="red">{user.firstName}</span>
        </h1>
        <p className="muted">Člen od {since}</p>
      </header>

      <Link href="/rezervacia" className="card card--red acct__cta">
        <div>
          <span className="pill">Rezervácia ľadu</span>
          <h2 className="h-card">Rezervuj si ďalší tréning</h2>
          <p>Celá ľadová plocha, šatne za príplatok.</p>
        </div>
        <span className="round-arrow">
          <ArrowUpRight />
        </span>
      </Link>

      <div className="acct__grid">
        <Link href="/ucet/rezervacie" className="card acct__tile">
          <h2 className="h-card">Moje rezervácie</h2>
          {nextBookings.length === 0 ? (
            <p className="muted">Nemáš žiadne nadchádzajúce rezervácie.</p>
          ) : (
            <ul className="acct__mini">
              {nextBookings.map((b) => (
                <li key={b.id}>
                  <strong>{fmtDayShort(b.startsAt)}</strong> <span className="num">{fmtRange(b.startsAt, b.endsAt)}</span>
                  <small>{AREA_LABEL[b.area]}</small>
                </li>
              ))}
            </ul>
          )}
        </Link>
        <Link href="/ucet/zabezpecenie" className="card acct__tile">
          <h2 className="h-card">Zabezpečenie</h2>
          <p className="muted">Dvojstupňové overenie:</p>
          <span className={`status ${user.twoFactorEnabledAt ? 'status--ok' : 'status--warn'}`}>{user.twoFactorEnabledAt ? 'Zapnuté' : 'Vypnuté – odporúčame zapnúť'}</span>
        </Link>
        <Link href="/ucet/profil" className="card acct__tile">
          <h2 className="h-card">Osobné údaje</h2>
          <p className="muted">
            {user.firstName} {user.lastName}
            <br />
            {user.phone ?? 'Telefón nie je vyplnený'}
          </p>
        </Link>
      </div>
    </div>
  );
}
