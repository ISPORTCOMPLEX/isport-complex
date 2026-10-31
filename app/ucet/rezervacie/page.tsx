import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { AREA_LABEL, PAYMENT_LABEL, STATUS_LABEL } from '@/lib/booking/format';
import { euros, fmtDayShort, fmtRange } from '@/lib/booking/time';

export const metadata: Metadata = { title: 'Moje rezervácie' };

export default async function MojeRezervacie() {
  const user = await requireUser('/ucet/rezervacie');
  const now = new Date();
  const [upcoming, past] = await Promise.all([
    prisma.booking.findMany({ where: { userId: user.id, status: 'CONFIRMED', endsAt: { gt: now } }, orderBy: { startsAt: 'asc' } }),
    prisma.booking.findMany({
      where: { userId: user.id, OR: [{ status: { not: 'CONFIRMED' } }, { endsAt: { lte: now } }] },
      orderBy: { startsAt: 'desc' },
      take: 30,
    }),
  ]);

  return (
    <div className="acct__stack">
      <header className="acct__head">
        <h1 className="display acct__title">Moje rezervácie</h1>
      </header>

      <div className="card acct__panel">
        <div className="tfa__head u-w100">
          <h2 className="h-card">Nadchádzajúce</h2>
          <Link href="/rezervacia" className="btn btn--sm">
            Nová rezervácia
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="muted">Nemáš žiadne nadchádzajúce rezervácie.</p>
        ) : (
          <ul className="bk-list">
            {upcoming.map((b) => (
              <li key={b.id}>
                <Link href={`/rezervacia/${b.code}`} className="bk-row">
                  <span className="bk-row__date">
                    <strong>{fmtDayShort(b.startsAt)}</strong>
                    <span className="num">{fmtRange(b.startsAt, b.endsAt)}</span>
                  </span>
                  <span className="bk-row__mid">
                    <strong>{AREA_LABEL[b.area]}</strong>
                    <small>
                      {b.code} · {PAYMENT_LABEL[b.paymentStatus]}
                    </small>
                  </span>
                  <span className="bk-row__price num">{euros(b.priceCents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card acct__panel">
        <h2 className="h-card">História</h2>
        {past.length === 0 ? (
          <p className="muted">Zatiaľ žiadne.</p>
        ) : (
          <ul className="bk-list bk-list--past">
            {past.map((b) => (
              <li key={b.id}>
                <Link href={`/rezervacia/${b.code}`} className="bk-row">
                  <span className="bk-row__date">
                    <strong>{fmtDayShort(b.startsAt)}</strong>
                    <span className="num">{fmtRange(b.startsAt, b.endsAt)}</span>
                  </span>
                  <span className="bk-row__mid">
                    <strong>{AREA_LABEL[b.area]}</strong>
                    <small>
                      {b.code} · {b.status === 'CONFIRMED' ? 'Odohraná' : STATUS_LABEL[b.status]}
                    </small>
                  </span>
                  <span className="bk-row__price num">{euros(b.priceCents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
