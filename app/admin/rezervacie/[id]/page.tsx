import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireStaff, can } from '@/lib/staff';
import { AREA_LABEL, METHOD_LABEL, PAYMENT_LABEL, STATUS_LABEL } from '@/lib/booking/format';
import { euros, fmtDayLong, fmtRange } from '@/lib/booking/time';
import { AdmHead, Chip, Empty, Panel, ago, auditText, fmtDateTime } from '@/components/admin/ui';
import { FormAlert } from '@/components/forms/FormAlert';
import { adminCancelBooking, adminCheckIn, adminMarkPaid, adminMarkUnpaid, adminNoShow, adminRefundAction } from '@/lib/actions/adminBooking';
import { getProvider } from '@/lib/payments';

export const metadata: Metadata = { title: 'Detail rezervácie' };

const NOTICE: Record<string, { ok: boolean; text: string }> = {
  vytvorena: { ok: true, text: 'Rezervácia je vytvorená.' },
  zaplatena: { ok: true, text: 'Rezervácia je označená ako zaplatená.' },
  nezaplatena: { ok: true, text: 'Označenie platby je zrušené.' },
  prichod: { ok: true, text: 'Príchod je potvrdený.' },
  neprisiel: { ok: true, text: 'Rezervácia je označená „neprišiel“.' },
  zrusena: { ok: true, text: 'Rezervácia je zrušená a čas je opäť voľný.' },
  'nie-aktivna': { ok: false, text: 'Rezervácia už nie je aktívna.' },
  'este-nezacala': { ok: false, text: '„Neprišiel“ sa dá označiť až po začiatku rezervácie.' },
  vratene: { ok: true, text: 'Peniaze sú vrátené na kartu zákazníka. Zákazník dostal e-mail.' },
  'vratenie-zlyhalo': { ok: false, text: 'Vrátenie sa nepodarilo. Skontroluj platobnú bránu alebo vráť peniaze priamo v jej administrácii – stav sa zladí sám.' },
  'zrusena-bez-vratenia': { ok: false, text: 'Rezervácia je zrušená, ale peniaze sa nepodarilo vrátiť automaticky. Vráť ich v sekcii Platby kartou nižšie.' },
  'karta-vratit': { ok: false, text: 'Rezervácia je zaplatená kartou online. Namiesto zrušenia označenia vráť peniaze v sekcii Platby kartou.' },
  'suma-neplatna': { ok: false, text: 'Neplatná suma. Zadaj napr. 25 alebo 12,50.' },
  limit: { ok: false, text: 'Príliš veľa vrátení za krátky čas. Skús to neskôr.' },
};

const PAY_STATE: Record<string, string> = { CREATED: 'čaká na zákazníka', SUCCEEDED: 'zaplatené', FAILED: 'zlyhala', EXPIRED: 'vypršala', CANCELED: 'zrušená' };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ stav?: string | string[] }> };

export default async function AdminBookingDetail({ params, searchParams }: Props) {
  const { id } = await params;
  const me = await requireStaff('bookings.view', `/admin/rezervacie/${id}`);
  const sp = await searchParams;
  const b = await prisma.booking.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } }, payments: { orderBy: { createdAt: 'desc' }, include: { refunds: { orderBy: { createdAt: 'desc' } } } } },
  });
  if (!b) notFound();
  const changes = await prisma.auditLog.findMany({ where: { target: b.id }, orderBy: { createdAt: 'desc' }, take: 10, include: { actor: { select: { firstName: true, lastName: true } } } });
  const manage = can(me.role, 'bookings.manage');
  const pay = can(me.role, 'payments.manage');
  const active = b.status === 'CONFIRMED';
  const started = b.startsAt <= new Date();
  const notice = typeof sp.stav === 'string' ? NOTICE[sp.stav] : undefined;
  const hidden = <input type="hidden" name="bookingId" value={b.id} />;
  const provider = getProvider();
  const cardPaid = b.payments.filter((p) => p.state === 'SUCCEEDED').reduce((a, p) => a + p.amountCents, 0);
  const cardLeft = cardPaid - b.payments.reduce((a, p) => a + (p.state === 'SUCCEEDED' ? p.refundedCents : 0), 0);

  return (
    <div className="adm__stack">
      <Link href="/admin/rezervacie" className="adm-back">
        ← Rezervácie
      </Link>
      <AdmHead title={b.code} sub={`${fmtDayLong(b.startsAt)} · ${fmtRange(b.startsAt, b.endsAt)} · ${AREA_LABEL[b.area]}`}>
        {b.status === 'CANCELLED' ? <Chip tone="muted">Zrušená</Chip> : b.status === 'NO_SHOW' ? <Chip tone="red">Neprišiel</Chip> : b.checkedInAt ? <Chip tone="ok">Prišiel</Chip> : <Chip tone="blue">{STATUS_LABEL[b.status]}</Chip>}
        {b.paymentStatus === 'PAID' ? <Chip tone="ok">Zaplatená</Chip> : <Chip tone="warn">{PAYMENT_LABEL[b.paymentStatus]}</Chip>}
      </AdmHead>

      {notice ? <FormAlert error={notice.ok ? undefined : notice.text} success={notice.ok ? notice.text : undefined} /> : null}

      {(manage || pay) && b.status !== 'CANCELLED' ? (
        <Panel title="Akcie">
          <div className="adm-actions">
            {manage && active && !b.checkedInAt ? (
              <form action={adminCheckIn}>
                {hidden}
                <button className="btn btn--sm">Potvrdiť príchod</button>
              </form>
            ) : null}
            {pay && (b.paymentStatus === 'UNPAID' || b.paymentStatus === 'PENDING') ? (
              <form action={adminMarkPaid}>
                {hidden}
                <button className="btn btn--sm btn--ghost">Označiť ako zaplatenú ({euros(b.priceCents)})</button>
              </form>
            ) : null}
            {pay && b.paymentStatus === 'PAID' ? (
              <form action={adminMarkUnpaid}>
                {hidden}
                <button className="btn btn--sm btn--ghost">Zrušiť označenie platby</button>
              </form>
            ) : null}
            {manage && active && started && !b.checkedInAt ? (
              <form action={adminNoShow}>
                {hidden}
                <button className="btn btn--sm btn--ghost">Neprišiel</button>
              </form>
            ) : null}
          </div>
          {manage && active ? (
            <details className="tfa__more">
              <summary>Zrušiť rezerváciu</summary>
              <form action={adminCancelBooking} className="adm-inline-form">
                {hidden}
                <label className="adm-label">
                  Dôvod
                  <input name="reason" className="adm-input" maxLength={300} placeholder="napr. na žiadosť zákazníka, porucha rolby" />
                </label>
                <label className="check u-full">
                  <input type="checkbox" name="notify" defaultChecked />
                  <span>Poslať zákazníkovi e-mail o zrušení</span>
                </label>
                {pay && cardLeft > 0 ? (
                  <label className="check u-full">
                    <input type="checkbox" name="refund" defaultChecked />
                    <span>Vrátiť {euros(cardLeft)} na kartu zákazníka</span>
                  </label>
                ) : null}
                <button className="btn btn--sm btn--danger">Zrušiť rezerváciu</button>
              </form>
            </details>
          ) : null}
        </Panel>
      ) : null}

      <div className="adm-grid">
        <Panel title="Rezervácia">
          <dl className="adm-dl">
            <div>
              <dt>Plocha</dt>
              <dd>{AREA_LABEL[b.area]}</dd>
            </div>
            <div>
              <dt>Dĺžka</dt>
              <dd>{b.hours} h</dd>
            </div>
            <div>
              <dt>Sprchy</dt>
              <dd>{b.showers ? `áno (${euros(b.showerCents)})` : 'nie'}</dd>
            </div>
            <div>
              <dt>Cena</dt>
              <dd>{euros(b.priceCents)}</dd>
            </div>
            <div>
              <dt>Spôsob platby</dt>
              <dd>{METHOD_LABEL[b.paymentMethod]}</dd>
            </div>
            <div>
              <dt>Zaplatené</dt>
              <dd>{b.paidAt ? fmtDateTime(b.paidAt) : 'Nie'}</dd>
            </div>
            {b.refundedCents > 0 ? (
              <div>
                <dt>Vrátené</dt>
                <dd>{euros(b.refundedCents)}</dd>
              </div>
            ) : null}
            {b.paymentStatus === 'PENDING' && b.payDeadline ? (
              <div>
                <dt>Termín držíme do</dt>
                <dd>{fmtDateTime(b.payDeadline)}</dd>
              </div>
            ) : null}
            <div>
              <dt>Príchod</dt>
              <dd>{b.checkedInAt ? fmtDateTime(b.checkedInAt) : '—'}</dd>
            </div>
            <div>
              <dt>Vytvorená</dt>
              <dd>{fmtDateTime(b.createdAt)}</dd>
            </div>
            {b.cancelledAt ? (
              <div>
                <dt>Zrušená</dt>
                <dd>
                  {fmtDateTime(b.cancelledAt)} · {b.cancelledBy === 'staff' ? 'recepcia' : 'zákazník'}
                  {b.cancelReason ? ` · ${b.cancelReason}` : ''}
                </dd>
              </div>
            ) : null}
            {b.note ? (
              <div className="u-span">
                <dt>Poznámka zákazníka</dt>
                <dd>{b.note}</dd>
              </div>
            ) : null}
          </dl>
        </Panel>
        <Panel title="Zákazník">
          <dl className="adm-dl">
            <div>
              <dt>Kontakt</dt>
              <dd>{b.contactName}</dd>
            </div>
            <div>
              <dt>Telefón</dt>
              <dd>{b.contactPhone ? <a href={`tel:${b.contactPhone}`}>{b.contactPhone}</a> : '—'}</dd>
            </div>
            <div>
              <dt>Tím / klub</dt>
              <dd>{b.teamName ?? '—'}</dd>
            </div>
            <div>
              <dt>Účet</dt>
              <dd>
                {!b.user ? (
                  <span className="muted">Bez účtu{b.guestEmail ? ` · ${b.guestEmail}` : ''}</span>
                ) : can(me.role, 'users.view') ? (
                  <Link href={`/admin/zakaznici/${b.user.id}`}>{b.user.email}</Link>
                ) : (
                  b.user.email
                )}
              </dd>
            </div>
          </dl>
        </Panel>
      </div>

      {b.payments.length > 0 ? (
        <Panel title="Platby kartou">
          <div className="adm-table-wrap">
            <table className="adm-table">
              <caption className="sr-only">Platby kartou k rezervácii {b.code}</caption>
              <thead>
                <tr>
                  <th scope="col">Vytvorená</th>
                  <th scope="col">Brána</th>
                  <th scope="col">Suma</th>
                  <th scope="col">Stav</th>
                  <th scope="col">Vrátené</th>
                </tr>
              </thead>
              <tbody>
                {b.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{fmtDateTime(p.createdAt)}</td>
                    <td>
                      {p.provider}
                      {p.livemode ? '' : ' · test'}
                    </td>
                    <td>{euros(p.amountCents)}</td>
                    <td>
                      {PAY_STATE[p.state] ?? p.state}
                      {p.paidAt ? ` · ${fmtDateTime(p.paidAt)}` : ''}
                      {p.failureReason ? ` · ${p.failureReason}` : ''}
                    </td>
                    <td>
                      {p.refundedCents > 0 ? euros(p.refundedCents) : '—'}
                      {p.refunds.map((r) => (
                        <small key={r.id} className="muted u-block">
                          {fmtDateTime(r.createdAt)} · {euros(r.amountCents)} · {r.status}
                          {r.reason ? ` · ${r.reason}` : ''}
                        </small>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pay && cardLeft > 0 ? (
            provider ? (
              <details className="tfa__more">
                <summary>Vrátiť peniaze na kartu</summary>
                <form action={adminRefundAction} className="adm-inline-form">
                  {hidden}
                  <label className="adm-label">
                    Suma v € (prázdne = celých {euros(cardLeft)})
                    <input name="amount" className="adm-input" inputMode="decimal" maxLength={20} placeholder={(cardLeft / 100).toFixed(2).replace('.', ',')} />
                  </label>
                  <label className="adm-label">
                    Dôvod
                    <input name="reason" className="adm-input" maxLength={300} placeholder="napr. skrátený tréning, porucha rolby" />
                  </label>
                  <button className="btn btn--sm btn--danger">Vrátiť peniaze</button>
                </form>
              </details>
            ) : (
              <p className="muted">Platobná brána je teraz vypnutá. Peniaze vráť priamo v jej administrácii – stav sa zladí, keď ju znova zapneš.</p>
            )
          ) : null}
        </Panel>
      ) : null}

      <Panel title="Zásahy personálu">
        {changes.length === 0 ? (
          <Empty>Zatiaľ žiadne.</Empty>
        ) : (
          <ul className="adm-events">
            {changes.map((c) => (
              <li key={c.id}>
                <span className="adm-dot" />
                <div>
                  <strong>{auditText(c.action, c.meta)}</strong>
                  <small>
                    {ago(c.createdAt)} · {c.actor ? `${c.actor.firstName} ${c.actor.lastName}` : 'neznámy'}
                  </small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
