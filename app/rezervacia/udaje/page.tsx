import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { getBookingSettings } from '@/lib/booking/settings';
import { dayAvailability } from '@/lib/booking/availability';
import { validateSlot } from '@/lib/booking/create';
import { iceCents, showerCents } from '@/lib/booking/pricing';
import { euros, fmtDayLong, hallTime, isIsoDate, pad2 } from '@/lib/booking/time';
import { BookingForm } from '@/components/booking/BookingForm';
import { getProvider } from '@/lib/payments';
import { RzBand } from '@/components/booking/RzBand';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Údaje k rezervácii'), robots: { index: false } };
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');

export default async function UdajePage({ searchParams }: Props) {
  const t = await getT();
  const sp = await searchParams;
  const iso = one(sp.datum);
  const startHour = Number.parseInt(one(sp.od), 10);
  const hours = Number.parseInt(one(sp.hodiny), 10);
  const presun = /^ISP-[A-Z0-9]{6}$/.test(one(sp.presun)) ? one(sp.presun) : null;
  const settings = await getBookingSettings();
  const card = getProvider();
  const showers = settings.showersEnabled && one(sp.sprchy) === '1';
  const sp1 = showers ? 1 : 0;
  const self = `/rezervacia/udaje?datum=${iso}&od=${startHour}&hodiny=${hours}&sprchy=${sp1}${presun ? `&presun=${presun}` : ''}`;
  const user = await requireUser(self);

  let problem = isIsoDate(iso) ? validateSlot(settings, iso, startHour, hours, t) : t('Neplatný dátum.');
  const old = presun ? await prisma.booking.findUnique({ where: { code: presun } }) : null;
  if (presun && (!old || old.userId !== user.id || old.status !== 'CONFIRMED' || old.paymentStatus === 'PAID' || old.startsAt.getTime() - Date.now() < settings.cancelFreeHours * 3600000)) {
    problem = t('Túto rezerváciu už nie je možné presunúť online. Kontaktuj recepciu.');
  }
  if (!problem) {
    const slots = await dayAvailability(settings, iso);
    const wanted = slots.filter((s) => s.hour >= startHour && s.hour < startHour + hours);
    if (wanted.length !== hours || !wanted.every((s) => s.free)) problem = t('Vybraný čas už nie je voľný.');
  }

  if (problem) {
    return (
      <>
        <RzBand crumbs={[{ href: '/', label: t('Domov') }, { href: '/rezervacia', label: t('Rezervácia') }]} title={t('Termín nie je dostupný')} />
        <section className="dk2 rz-dk">
          <div className="wrap rz-narrow">
            <p className="rz-lead">{problem}</p>
            <Link href={isIsoDate(iso) ? `/rezervacia?datum=${iso}&sprchy=${sp1}` : '/rezervacia'} className="btn u-start">
              {t('Vybrať iný čas')}
            </Link>
          </div>
        </section>
      </>
    );
  }

  const start = hallTime(iso, startHour);
  const ice = iceCents(settings, iso, startHour, hours);
  const extra = showerCents(settings, showers);
  const last =
    old ??
    (await prisma.booking.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { teamName: true, contactPhone: true, contactName: true },
    }));

  return (
    <>
      <RzBand
        crumbs={[{ href: '/', label: t('Domov') }, { href: `/rezervacia?datum=${iso}&cas=${startHour}&sprchy=${sp1}`, label: t('Rezervácia') }, { label: t('Údaje') }]}
        title={old ? t('Presun {code}', { code: old.code }) : t('Dokončenie')}
      />
      <div className="wrap rz2">
        <div className="rz2__grid">
          <div className="rz2__main dk2">
            <section className="rz2__step" aria-label={t('Údaje')}>
              <h2 className="rz2__h">
                <span className="disp">{t('Údaje a platba')}</span>
              </h2>
              <div className="rz2__card">
                <BookingForm
                  hidden={{ datum: iso, od: String(startHour), hodiny: String(hours), sprchy: String(sp1), ...(old ? { presun: old.code } : {}) }}
                  moving={old ? old.code : null}
                  defaults={{
                    contactName: last?.contactName ?? `${user.firstName} ${user.lastName}`,
                    contactPhone: last?.contactPhone ?? user.phone ?? '',
                    teamName: last?.teamName ?? '',
                  }}
                  cancelFreeHours={settings.cancelFreeHours}
                  cardEnabled={card !== null}
                  cardTest={card?.test ?? false}
                />
              </div>
            </section>
          </div>
          <aside className="rz2__aside rz2__aside--keep" aria-label={t('Súhrn rezervácie')}>
            <div className="rz2__sum">
              <div className="rz2__bar">
                <span className="wide-display">{t('Tvoja rezervácia')}</span>
                <span>{t('KROK {n} / 3', { n: 2 })}</span>
              </div>
              <div className="rz2__body">
                <span className="rz2__when">
                  <span>{fmtDayLong(start, t)}</span>
                  <span className="disp rz2__range">
                    {pad2(startHour)} – {pad2(startHour + hours)}
                  </span>
                </span>
                <div className="rz2__rows">
                  <span>
                    <span>{t('Celá ľadová plocha · {hours} h', { hours })} </span>
                    <b>{euros(ice)}</b>
                  </span>
                  <span>
                    <span>{t('Šatňa a úprava ľadu')}</span>
                    <b className="is-green">{t('v cene')}</b>
                  </span>
                  {settings.showersEnabled ? (
                    <span>
                      <span>{t('Sprchy')}</span>
                      <b>{showers ? euros(extra) : t('bez spŕch')}</b>
                    </span>
                  ) : null}
                </div>
                <div className="rz2__total">
                  <span>
                    <b>{t('Spolu')}</b>
                    <small>{t('vrátane DPH')}</small>
                  </span>
                  <span className="disp">{euros(ice + extra)}</span>
                </div>
                <Link href={`/rezervacia?datum=${iso}&cas=${startHour}&sprchy=${sp1}${presun ? `&presun=${presun}` : ''}`} className="rz2__change">
                  {t('Zmeniť termín alebo sprchy')}
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
