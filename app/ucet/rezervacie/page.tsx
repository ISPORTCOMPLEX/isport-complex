import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { AREA_LABEL, PAYMENT_LABEL, STATUS_LABEL } from '@/lib/booking/format';
import { euros, fmtDayShort, fmtRange } from '@/lib/booking/time';
import { CalendarArt, EmptyState } from '@/components/EmptyArt';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Moje rezervácie') };
}

export default async function MojeRezervacie() {
  const t = await getT();
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
        <h1 className="display acct__title">{t('Moje rezervácie')}</h1>
      </header>

      <div className="card acct__panel">
        <div className="tfa__head u-w100">
          <h2 className="h-card">{t('Nadchádzajúce')}</h2>
          <Link href="/rezervacia" className="btn btn--sm">
            {t('Nová rezervácia')}
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState art={<CalendarArt />} title={t('Zatiaľ žiadne rezervácie')} text={t('Prvú hodinu na ľade si vyberieš za minútu. Potvrdenie s QR kódom uvidíš tu.')}>
            <Link href="/rezervacia" className="sbtn sbtn--md">
              {t('Rezervovať ľad')}
            </Link>
          </EmptyState>
        ) : (
          <ul className="bk-list">
            {upcoming.map((b) => (
              <li key={b.id}>
                <Link href={`/rezervacia/${b.code}`} className="bk-row">
                  <span className="bk-row__date">
                    <strong>{fmtDayShort(b.startsAt, t)}</strong>
                    <span className="num">{fmtRange(b.startsAt, b.endsAt)}</span>
                  </span>
                  <span className="bk-row__mid">
                    <strong>{t(AREA_LABEL[b.area])}</strong>
                    <small>
                      {b.code} · {t(PAYMENT_LABEL[b.paymentStatus])}
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
        <h2 className="h-card">{t('História')}</h2>
        {past.length === 0 ? (
          <p className="muted">{t('Zatiaľ žiadne.')}</p>
        ) : (
          <ul className="bk-list bk-list--past">
            {past.map((b) => (
              <li key={b.id}>
                <Link href={`/rezervacia/${b.code}`} className="bk-row">
                  <span className="bk-row__date">
                    <strong>{fmtDayShort(b.startsAt, t)}</strong>
                    <span className="num">{fmtRange(b.startsAt, b.endsAt)}</span>
                  </span>
                  <span className="bk-row__mid">
                    <strong>{t(AREA_LABEL[b.area])}</strong>
                    <small>
                      {b.code} · {b.status === 'CONFIRMED' ? t('Odohraná') : t(STATUS_LABEL[b.status])}
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
