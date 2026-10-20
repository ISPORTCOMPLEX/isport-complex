import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getProvider } from '@/lib/payments';
import { requireUser } from '@/lib/session';
import { euros, fmtDayLong, fmtRange } from '@/lib/booking/time';
import { mockPayAction } from '@/lib/actions/mockPayment';
import { RzBand } from '@/components/booking/RzBand';

export const metadata: Metadata = { title: 'Testovacia platba', robots: { index: false } };

type Props = { params: Promise<{ ref: string }> };

// Náhrada platobnej stránky brány pri vývoji. Na produkcii neexistuje (404).
export default async function MockCheckout({ params }: Props) {
  if (getProvider()?.id !== 'mock') notFound();
  const { ref } = await params;
  const user = await requireUser(`/platba/test/${ref}`);
  const p = await prisma.payment.findUnique({ where: { sessionRef: ref }, include: { booking: true } });
  if (!p || p.booking.userId !== user.id) notFound();
  const open = p.state === 'CREATED' && (!p.expiresAt || p.expiresAt > new Date());

  return (
    <>
      <RzBand crumbs={[{ href: '/', label: 'Domov' }, { href: `/rezervacia/${p.booking.code}`, label: p.booking.code }]} step="Testovací režim · žiadne skutočné peniaze" title="Platba kartou" />
      <section className="ice rz-ice">
        <div className="wrap rz-narrow">
          <div className="rz-card">
            <p className="alert alert--error" role="note">
              Toto je testovacia brána. Na ostrom webe tu bude platobná stránka Stripe s kartou, Apple Pay a Google Pay.
            </p>
            <dl className="rez__dl">
              <div>
                <dt>Rezervácia</dt>
                <dd>{p.booking.code}</dd>
              </div>
              <div>
                <dt>Termín</dt>
                <dd>
                  {fmtDayLong(p.booking.startsAt)}, {fmtRange(p.booking.startsAt, p.booking.endsAt)}
                </dd>
              </div>
              <div>
                <dt>Suma</dt>
                <dd>{euros(p.amountCents)}</dd>
              </div>
            </dl>
            {open ? (
              <div className="bk__actions">
                {(['pay', 'fail', 'cancel'] as const).map((o) => (
                  <form key={o} action={mockPayAction}>
                    <input type="hidden" name="ref" value={ref} />
                    <input type="hidden" name="outcome" value={o} />
                    <button className={o === 'pay' ? 'btn btn--sm' : 'btn btn--sm btn--ghost'}>{o === 'pay' ? 'Zaplatiť (test)' : o === 'fail' ? 'Platba zlyhá' : 'Späť bez platby'}</button>
                  </form>
                ))}
              </div>
            ) : (
              <p className="rz-lead">Táto platobná relácia už je uzavretá.</p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
