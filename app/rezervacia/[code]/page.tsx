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
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Rezervácia'), robots: { index: false } };
}

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ nova?: string; zrusena?: string; platba?: string; vratene?: string; vratenie?: string }> };

export default async function BookingDetail({ params, searchParams }: Props) {
  const t = await getT();
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
  const state = booking.status === 'CANCELLED' ? 'off' : pending ? 'wait' : active ? 'ok' : 'past';
  const stateLabel = { off: t('Zrušená'), wait: t('Čaká na platbu'), ok: t('Potvrdená'), past: t('Odohraná') }[state];
  const qr = active && !pending ? await QRCode.toDataURL(`ISP:${booking.code}:${booking.qrToken}`, { margin: 1, width: 400, color: { dark: '#000000', light: '#ffffff' } }) : null;

  return (
    <>
    <RzBand
      crumbs={[{ href: '/', label: t('Komplex') }, { href: '/ucet/rezervacie', label: t('Moje rezervácie') }, { label: booking.code }]}
      step={pending ? t('Čaká na platbu kartou') : booking.status === 'CONFIRMED' ? (active ? t('Potvrdená rezervácia') : t('Odohraná rezervácia')) : t(STATUS_LABEL[booking.status])}
      title={sp.nova && state === 'ok' ? (
        <>
          {t('Rezervácia')}
          <br />
          {t('potvrdená')}
        </>
      ) : (
        booking.code
      )}
    />
    <section className="dk2 rz-dk bk">
      <div className="wrap bk__in">
        {sp.nova ? <FormAlert success={emailEnabled() ? t('Hotovo! Rezervácia je potvrdená. Potvrdenie sme poslali aj e-mailom.') : t('Hotovo! Rezervácia je potvrdená. QR kód nájdeš tu aj v Moje rezervácie.')} /> : null}
        {sp.zrusena ? <FormAlert success={t('Rezervácia je zrušená a čas je opäť voľný.')} /> : null}
        {sp.vratene ? <FormAlert success={t('Peniaze sme vrátili na tvoju kartu. Na účte budú zvyčajne do 5 až 10 pracovných dní.')} /> : null}
        {sp.vratenie ? <FormAlert error={t('Peniaze sa nepodarilo vrátiť automaticky. Recepcia ti ich vráti ručne – nemusíš nič robiť.')} /> : null}
        {sp.platba === 'ok' && booking.paymentStatus === 'PAID' ? <FormAlert success={emailEnabled() ? t('Zaplatené. Rezervácia je potvrdená a potvrdenie sme poslali e-mailom.') : t('Zaplatené. Rezervácia je potvrdená.')} /> : null}
        {sp.platba === 'ok' && pending ? <FormAlert success={t('Platbu overujeme. Obnov stránku o pár sekúnd.')} /> : null}
        {sp.platba === 'zrusena' && pending ? <FormAlert error={t('Platba nebola dokončená. Termín ti ešte chvíľu podržíme – môžeš zaplatiť znova.')} /> : null}
        {sp.platba === 'chyba' && pending ? <FormAlert error={t('Platobná brána teraz neodpovedá. Skús to o chvíľu znova.')} /> : null}
        {sp.platba === 'limit' && pending ? <FormAlert error={t('Príliš veľa pokusov o platbu. Skús to neskôr alebo kontaktuj recepciu.')} /> : null}
        {sp.platba === 'zlyhala' || (sp.platba && booking.status === 'CANCELLED' && booking.paymentStatus === 'UNPAID') ? (
          <FormAlert error={t('Platba nebola dokončená, preto sme termín uvoľnili. Žiadne peniaze sme nestiahli.')} />
        ) : null}
        {pending ? (
          <div className="card bk__paynow" role="region" aria-label={t('Platba kartou')}>
            <h2 className="h-card">{t('Dokonči platbu kartou')}</h2>
            <p className="muted">
              {t('Termín ti držíme do')}{' '}{booking.payDeadline ? booking.payDeadline.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' }) : t('konca lehoty')}{t('. Ak platba dovtedy nepríde, rezervácia sa zruší sama a peniaze ti nestiahneme.')}
            </p>
            {checkout?.checkoutUrl ? (
              <a href={checkout.checkoutUrl} className="btn btn--sm u-start">
                {t('Zaplatiť {euros} kartou', { euros: euros(booking.priceCents) })} 
              </a>
            ) : (
              <form action={payAgainAction}>
                <input type="hidden" name="code" value={booking.code} />
                <button className="btn btn--sm">{t('Zaplatiť {euros} kartou', { euros: euros(booking.priceCents) })} </button>
              </form>
            )}
          </div>
        ) : null}

        <div className={`tk2${sp.nova ? ' tk2--new' : ''}`}>
          <div className="tk2__card">
            <div className="tk2__main">
              <div className="tk2__top">
                <span className="tk2__brand">
                  I-SPORT <i>COMPLEX</i> {' '}{t('· vstupenka na ľad')}
                </span>
                <span className={`tk2__state tk2__state--${state}`}>{stateLabel}</span>
              </div>
              <h2 className="tk2__date">{fmtDayLong(booking.startsAt, t)}</h2>
              <p className="tk2__time">{fmtRange(booking.startsAt, booking.endsAt)}</p>
              <dl className="tk2__grid">
                <div>
                  <dt>{t('Plocha')}</dt>
                  <dd>{t(AREA_LABEL[booking.area])}</dd>
                </div>
                <div>
                  <dt>{t('Šatňa')}</dt>
                  <dd>{t('v cene')}</dd>
                </div>
                <div>
                  <dt>{t('Sprchy')}</dt>
                  <dd>{booking.showers > 0 ? t('áno · {euros}', { euros: euros(booking.showerCents) }) : t('nie')}</dd>
                </div>
                {booking.teamName ? (
                  <div>
                    <dt>{t('Tím')}</dt>
                    <dd>{booking.teamName}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>{t('Platba')}</dt>
                  <dd>
                    {t(METHOD_LABEL[booking.paymentMethod])} · {t(PAYMENT_LABEL[booking.paymentStatus])}
                    {booking.refundedCents > 0 ? t(' · vrátené {euros}', { euros: euros(booking.refundedCents) }) : ''}
                  </dd>
                </div>
                <div>
                  <dt>{t('Spolu')}</dt>
                  <dd>{euros(booking.priceCents)}</dd>
                </div>
                <div className="tk2__wide">
                  <dt>{t('Kontakt')}</dt>
                  <dd>
                    {booking.contactName}, {booking.contactPhone}
                  </dd>
                </div>
              </dl>
              {booking.paymentMethod === 'TRANSFER' && booking.paymentStatus === 'UNPAID' && booking.status === 'CONFIRMED' ? (
                site.iban ? (
                  <div className="bk__pay">
                    <strong>{t('Platba prevodom')}</strong>
                    <dl className="rez__dl">
                      <div>
                        <dt>IBAN</dt>
                        <dd className="bk__code">{site.iban}</dd>
                      </div>
                      <div>
                        <dt>{t('Suma')}</dt>
                        <dd>{euros(booking.priceCents)}</dd>
                      </div>
                      <div>
                        <dt>{t('Variabilný symbol')}</dt>
                        <dd className="bk__code">{booking.number}</dd>
                      </div>
                      <div>
                        <dt>{t('Správa pre príjemcu')}</dt>
                        <dd className="bk__code">{booking.code}</dd>
                      </div>
                    </dl>
                    <small className="muted">{t('Prosíme o úhradu pred tréningom. Ak platba nepríde, zaplatíš na recepcii.')}</small>
                  </div>
                ) : (
                  <p className="muted bk__note">{t('Platobné údaje na prevod ti pošleme e-mailom.')}</p>
                )
              ) : null}
            </div>
            <div className="tk2__stub">
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} width={200} height={200} alt={t('QR kód rezervácie {code}', { code: booking.code })} />
              ) : (
                <span className="tk2__noqr">{pending ? t('QR kód sa zobrazí po zaplatení') : t('QR kód už nie je platný')}</span>
              )}
              <span className="tk2__code">{booking.code}</span>
              {qr ? (
                <span className="tk2__hint">
                  {t('Ukáž na recepcii.')}
                  <br />
                  {t('Príď 30 minút vopred.')}
                </span>
              ) : null}
            </div>
          </div>
          {sp.nova && state === 'ok' ? (
            <span className="tk2__burst" aria-hidden="true">
              <svg width="30" height="30" viewBox="0 0 24 24">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              {Array.from({ length: 18 }, (_, i) => (
                <i key={i} className="tk2__cf" />
              ))}
            </span>
          ) : null}
        </div>

        <div className="bk__actions">
          {active ? (
            <a href={`/api/rezervacia/${booking.code}/ics`} className="btn btn--ghost btn--sm">
              {t('Pridať do kalendára')}
            </a>
          ) : null}
          <Link href="/ucet/rezervacie" className="btn btn--ghost btn--sm">
            {t('Moje rezervácie')}
          </Link>
          <Link href="/rezervacia" className="btn btn--sm">
            {t('Nová rezervácia')}
          </Link>
        </div>

        {booking.status === 'CONFIRMED' && booking.userId === user.id ? (
          <div className="card bk__cancel">
            <h2 className="h-card">{t('Presun a zrušenie')}</h2>
            {canCancel ? (
              <>
                {booking.paymentStatus === 'UNPAID' ? (
                  <Link
                    href={`/rezervacia?presun=${booking.code}&sprchy=${booking.showers > 0 ? 1 : 0}`}
                    className="btn btn--sm btn--ghost u-start"
                   
                  >
                    {t('Presunúť na iný termín')}
                  </Link>
                ) : (
                  <p className="muted">{pending ? t('Rezerváciu čakajúcu na platbu nemožno presunúť – zruš ju a vytvor novú.') : t('Zaplatenú rezerváciu presunie recepcia.')}</p>
                )}
                <CancelBookingForm code={booking.code} cancelFreeHours={settings.cancelFreeHours} paidByCard={booking.paymentMethod === 'CARD' && (booking.paymentStatus === 'PAID' || booking.paymentStatus === 'PARTIALLY_REFUNDED')} />
              </>
            ) : (
              <p className="muted">
                {t('Online sa dá zrušiť najneskôr {cancelFreeHours} hodín pred začiatkom. Teraz už len cez recepciu.', { cancelFreeHours: settings.cancelFreeHours })} 
              </p>
            )}
          </div>
        ) : null}
      </div>
    </section>
    </>
  );
}
