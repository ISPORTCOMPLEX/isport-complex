import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getProvider } from '@/lib/payments';
import { requireUser } from '@/lib/session';
import { euros, fmtDayLong, fmtRange } from '@/lib/booking/time';
import { mockPayAction } from '@/lib/actions/mockPayment';
import { RzBand } from '@/components/booking/RzBand';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Testovacia platba'), robots: { index: false } };
}

type Props = { params: Promise<{ ref: string }> };

// Náhrada platobnej stránky brány pri vývoji. Na produkcii neexistuje (404).
export default async function MockCheckout({ params }: Props) {
  const t = await getT();
  if (getProvider()?.id !== 'mock') notFound();
  const { ref } = await params;
  const user = await requireUser(`/platba/test/${ref}`);
  const p = await prisma.payment.findUnique({ where: { sessionRef: ref }, include: { booking: true } });
  if (!p || p.booking.userId !== user.id) notFound();
  const open = p.state === 'CREATED' && (!p.expiresAt || p.expiresAt > new Date());

  return (
    <>
      <RzBand crumbs={[{ href: '/', label: t('Domov') }, { href: `/rezervacia/${p.booking.code}`, label: p.booking.code }]} step={t('Testovací režim · žiadne skutočné peniaze')} title={t('Platba kartou')} />
      <section className="dk2 rz-dk">
        <div className="wrap rz-narrow">
          <div className="rz-card">
            <p className="alert alert--error" role="note">
              {t('Toto je testovacia brána. Na ostrom webe tu bude platobná stránka Stripe s kartou, Apple Pay a Google Pay.')}
            </p>
            <dl className="rez__dl">
              <div>
                <dt>{t('Rezervácia')}</dt>
                <dd>{p.booking.code}</dd>
              </div>
              <div>
                <dt>{t('Termín')}</dt>
                <dd>
                  {fmtDayLong(p.booking.startsAt, t)}, {fmtRange(p.booking.startsAt, p.booking.endsAt)}
                </dd>
              </div>
              <div>
                <dt>{t('Suma')}</dt>
                <dd>{euros(p.amountCents)}</dd>
              </div>
            </dl>
            {open ? (
              <div className="bk__actions">
                {(['pay', 'fail', 'cancel'] as const).map((o) => (
                  <form key={o} action={mockPayAction}>
                    <input type="hidden" name="ref" value={ref} />
                    <input type="hidden" name="outcome" value={o} />
                    <button className={o === 'pay' ? 'btn btn--sm' : 'btn btn--sm btn--ghost'}>{o === 'pay' ? t('Zaplatiť (test)') : o === 'fail' ? t('Platba zlyhá') : t('Späť bez platby')}</button>
                  </form>
                ))}
              </div>
            ) : (
              <p className="rz-lead">{t('Táto platobná relácia už je uzavretá.')}</p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
