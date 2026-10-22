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
import { emailEnabled } from '@/lib/email';
import { RzBand } from '@/components/booking/RzBand';
import { getBaseUrl } from '@/lib/requestInfo';
import { reconcileBooking } from '@/lib/payments/service';
import { payAgainAction } from '@/lib/actions/booking';

export const metadata: Metadata = { title: 'Rezervácia', robots: { index: false } };

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ nova?: string; zrusena?: string; platba?: string; vratene?: string; vratenie?: string }> };

export default async function BookingDetail({ params, searchParams }: Props) {
  const { code } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/rezervacia/${code}`);
  if (!/^ISP-[A-Z0-9]{6}$/.test(code)) notFound();
  let booking = await prisma.booking.findUnique({ where: { code } });
  if (!booking || (booking.userId !== user.id && !isStaff(user.role))) notFound();
  // Návrat z platobnej stránky: webhook môže prísť o pár sekúnd neskôr, preto sa opýtame brány priamo.
  if (booking.paymentStatus === 'PENDING') {
    try {
      await reconcileBooking(booking.id, await getBaseUrl());
      booking = (await prisma.booking.findUnique({ where: { code } }))!;
    } catch (err) {
      console.error('[payments:reconcile]', code, err);
    }
  }
  const pending = booking.paymentStatus === 'PENDING' && booking.status === 'CONFIRMED';
  const checkout = pending
    ? await prisma.payment.findFirst({ where: { bookingId: booking.id, state: 'CREATED', expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' }, select: { checkoutUrl: true, expiresAt: true } })
    : null;

  const settings = await getBookingSettings();
  const site = await getSite();
  const active = booking.status === 'CONFIRMED' && booking.endsAt > new Date();
  const canCancel = booking.status === 'CONFIRMED' && (booking.paymentStatus === 'PENDING' || booking.startsAt.getTime() - Date.now() >= settings.cancelFreeHours * 3600000);
  const qr = active && !pending ? await QRCode.toDataURL(`ISP:${booking.code}:${booking.qrToken}`, { margin: 1, width: 280, color: { dark: '#000000', light: '#ffffff' } }) : null;

  return (
    <>
    <RzBand
      crumbs={[{ href: '/', label: 'Komplex' }, { href: '/ucet/rezervacie', label: 'Moje rezervácie' }, { label: booking.code }]}
      step={pending ? 'Čaká na platbu kartou' : booking.status === 'CONFIRMED' ? (active ? 'Potvrdená rezervácia' : 'Odohraná rezervácia') : STATUS_LABEL[booking.status]}
      title={booking.code}
    />
    <section className="dk2 rz-dk bk">
      <div className="wrap bk__in">
        {sp.nova ? <FormAlert success={emailEnabled() ? 'Hotovo! Rezervácia je potvrdená. Potvrdenie sme poslali aj e-mailom.' : 'Hotovo! Rezervácia je potvrdená. QR kód nájdeš tu aj v Moje rezervácie.'} /> : null}
        {sp.zrusena ? <FormAlert success="Rezervácia je zrušená a čas je opäť voľný." /> : null}
        {sp.vratene ? <FormAlert success="Peniaze sme vrátili na tvoju kartu. Na účte budú zvyčajne do 5 až 10 pracovných dní." /> : null}
        {sp.vratenie ? <FormAlert error="Peniaze sa nepodarilo vrátiť automaticky. Recepcia ti ich vráti ručne – nemusíš nič robiť." /> : null}
        {sp.platba === 'ok' && booking.paymentStatus === 'PAID' ? <FormAlert success={emailEnabled() ? 'Zaplatené. Rezervácia je potvrdená a potvrdenie sme poslali e-mailom.' : 'Zaplatené. Rezervácia je potvrdená.'} /> : null}
        {sp.platba === 'ok' && pending ? <FormAlert success="Platbu overujeme. Obnov stránku o pár sekúnd." /> : null}
        {sp.platba === 'zrusena' && pending ? <FormAlert error="Platba nebola dokončená. Termín ti ešte chvíľu podržíme – môžeš zaplatiť znova." /> : null}
        {sp.platba === 'chyba' && pending ? <FormAlert error="Platobná brána teraz neodpovedá. Skús to o chvíľu znova." /> : null}
        {sp.platba === 'limit' && pending ? <FormAlert error="Príliš veľa pokusov o platbu. Skús to neskôr alebo kontaktuj recepciu." /> : null}
        {sp.platba === 'zlyhala' || (sp.platba && booking.status === 'CANCELLED' && booking.paymentStatus === 'UNPAID') ? (
          <FormAlert error="Platba nebola dokončená, preto sme termín uvoľnili. Žiadne peniaze sme nestiahli." />
        ) : null}
        {pending ? (
          <div className="card bk__paynow" role="region" aria-label="Platba kartou">
            <h2 className="h-card">Dokonči platbu kartou</h2>
            <p className="muted">
              Termín ti držíme do {booking.payDeadline ? booking.payDeadline.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' }) : 'konca lehoty'}. Ak platba
              dovtedy nepríde, rezervácia sa zruší sama a peniaze ti nestiahneme.
            </p>
            {checkout?.checkoutUrl ? (
              <a href={checkout.checkoutUrl} className="btn btn--sm u-start">
                Zaplatiť {euros(booking.priceCents)} kartou
              </a>
            ) : (
              <form action={payAgainAction}>
                <input type="hidden" name="code" value={booking.code} />
                <button className="btn btn--sm">Zaplatiť {euros(booking.priceCents)} kartou</button>
              </form>
            )}
          </div>
        ) : null}

        <div className="bk__ticket">
          <div className="bk__info">
            <span className="kicker">{pending ? 'Čaká na platbu' : booking.status === 'CONFIRMED' ? (active ? 'Potvrdená rezervácia' : 'Odohraná rezervácia') : STATUS_LABEL[booking.status]}</span>
            <h2 className="display bk__title">{fmtDayLong(booking.startsAt)}</h2>
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
                <dt>Sprchy</dt>
                <dd>{booking.showers > 0 ? `áno · ${euros(booking.showerCents)}` : 'nie'}</dd>
              </div>
              <div>
                <dt>Spolu</dt>
                <dd>{euros(booking.priceCents)}</dd>
              </div>
              <div>
                <dt>Platba</dt>
                <dd>
                  {METHOD_LABEL[booking.paymentMethod]} · {PAYMENT_LABEL[booking.paymentStatus]}
                  {booking.refundedCents > 0 ? ` · vrátené ${euros(booking.refundedCents)}` : ''}
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
                {booking.paymentStatus === 'UNPAID' ? (
                  <Link
                    href={`/rezervacia?presun=${booking.code}&sprchy=${booking.showers > 0 ? 1 : 0}`}
                    className="btn btn--sm btn--ghost u-start"
                   
                  >
                    Presunúť na iný termín
                  </Link>
                ) : (
                  <p className="muted">{pending ? 'Rezerváciu čakajúcu na platbu nemožno presunúť – zruš ju a vytvor novú.' : 'Zaplatenú rezerváciu presunie recepcia.'}</p>
                )}
                <CancelBookingForm code={booking.code} cancelFreeHours={settings.cancelFreeHours} paidByCard={booking.paymentMethod === 'CARD' && (booking.paymentStatus === 'PAID' || booking.paymentStatus === 'PARTIALLY_REFUNDED')} />
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
    </>
  );
}
