import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { isStaff } from '@/lib/staff';
import { getBookingSettings } from '@/lib/booking/settings';
import { AREA_LABEL, METHOD_LABEL, PAYMENT_LABEL, STATUS_LABEL } from '@/lib/booking/format';
import { euros, fmtDayLong, fmtRange } from '@/lib/booking/time';
import { CancelBookingForm } from '@/components/booking/CancelBookingForm';
import { FormAlert } from '@/components/forms/FormAlert';
import { getSite } from '@/lib/siteSettings';

export const metadata: Metadata = { title: 'Rezervácia', robots: { index: false } };

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ nova?: string; zrusena?: string }> };

export default async function BookingDetail({ params, searchParams }: Props) {
  const { code } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/rezervacia/${code}`);
  if (!/^ISP-[A-Z0-9]{6}$/.test(code)) notFound();
  const booking = await prisma.booking.findUnique({ where: { code } });
  if (!booking || (booking.userId !== user.id && !isStaff(user.role))) notFound();

  const settings = await getBookingSettings();
  const site = await getSite();
  const active = booking.status === 'CONFIRMED' && booking.endsAt > new Date();
  const canCancel = booking.status === 'CONFIRMED' && booking.startsAt.getTime() - Date.now() >= settings.cancelFreeHours * 3600000;
  const qr = active ? await QRCode.toDataURL(`ISP:${booking.code}:${booking.qrToken}`, { margin: 1, width: 280, color: { dark: '#000000', light: '#ffffff' } }) : null;

  return (
    <section className="section section--tight bk">
      <div className="wrap bk__in">
        {sp.nova ? <FormAlert success="Hotovo! Rezervácia je potvrdená. Potvrdenie sme poslali aj e-mailom." /> : null}
        {sp.zrusena ? <FormAlert success="Rezervácia je zrušená a čas je opäť voľný." /> : null}

        <div className="bk__ticket">
          <div className="bk__info">
            <span className="kicker">{booking.status === 'CONFIRMED' ? (active ? 'Potvrdená rezervácia' : 'Odohraná rezervácia') : STATUS_LABEL[booking.status]}</span>
            <h1 className="display bk__title">{fmtDayLong(booking.startsAt)}</h1>
            <p className="bk__time num">{fmtRange(booking.startsAt, booking.endsAt)}</p>
            <dl className="rez__dl bk__dl">
              <div>
                <dt>Kód</dt>
                <dd className="bk__code">{booking.code}</dd>
              </div>
              <div>
                <dt>Plocha</dt>
                <dd>{AREA_LABEL[booking.area]}</dd>
              </div>
              <div>
                <dt>Cena</dt>
                <dd>{euros(booking.priceCents)}</dd>
              </div>
              <div>
                <dt>Platba</dt>
                <dd>
                  {METHOD_LABEL[booking.paymentMethod]} · {PAYMENT_LABEL[booking.paymentStatus]}
                </dd>
              </div>
              {booking.teamName ? (
                <div>
                  <dt>Tím</dt>
                  <dd>{booking.teamName}</dd>
                </div>
              ) : null}
              <div>
                <dt>Kontakt</dt>
                <dd>
                  {booking.contactName}, {booking.contactPhone}
                </dd>
              </div>
            </dl>
            {booking.paymentMethod === 'TRANSFER' && booking.paymentStatus === 'UNPAID' && booking.status === 'CONFIRMED' ? (
              site.iban ? (
                <div className="bk__pay">
                  <strong>Platba prevodom</strong>
                  <dl className="rez__dl">
                    <div>
                      <dt>IBAN</dt>
                      <dd className="bk__code">{site.iban}</dd>
                    </div>
                    <div>
                      <dt>Suma</dt>
                      <dd>{euros(booking.priceCents)}</dd>
                    </div>
                    <div>
                      <dt>Variabilný symbol</dt>
                      <dd className="bk__code">{booking.number}</dd>
                    </div>
                    <div>
                      <dt>Správa pre príjemcu</dt>
                      <dd className="bk__code">{booking.code}</dd>
                    </div>
                  </dl>
                  <small className="muted">Prosíme o úhradu pred tréningom. Ak platba nepríde, zaplatíš na recepcii.</small>
                </div>
              ) : (
                <p className="muted bk__note">Platobné údaje na prevod ti pošleme e-mailom.</p>
              )
            ) : null}
          </div>
          {qr ? (
            <div className="bk__qr">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} width={220} height={220} alt={`QR kód rezervácie ${booking.code}`} />
              <small>Ukáž na recepcii pri príchode</small>
            </div>
          ) : null}
        </div>

        <div className="bk__actions">
          {active ? (
            <a href={`/api/rezervacia/${booking.code}/ics`} className="btn btn--ghost btn--sm">
              Pridať do kalendára
            </a>
          ) : null}
          <Link href="/ucet/rezervacie" className="btn btn--ghost btn--sm">
            Moje rezervácie
          </Link>
          <Link href="/rezervacia" className="btn btn--sm">
            Nová rezervácia
          </Link>
        </div>

        {booking.status === 'CONFIRMED' && booking.userId === user.id ? (
          <div className="card bk__cancel">
            <h2 className="h-card">Presun a zrušenie</h2>
            {canCancel ? (
              <>
                {booking.paymentStatus !== 'PAID' ? (
                  <Link
                    href={`/rezervacia?presun=${booking.code}&plocha=${booking.area === 'FULL' ? 'cela' : 'polovica'}`}
                    className="btn btn--sm btn--ghost"
                    style={{ alignSelf: 'flex-start' }}
                  >
                    Presunúť na iný termín
                  </Link>
                ) : (
                  <p className="muted">Zaplatenú rezerváciu presunie recepcia.</p>
                )}
                <CancelBookingForm code={booking.code} cancelFreeHours={settings.cancelFreeHours} />
              </>
            ) : (
              <p className="muted">
                Online sa dá zrušiť najneskôr {settings.cancelFreeHours} hodín pred začiatkom. Teraz už len cez recepciu.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
