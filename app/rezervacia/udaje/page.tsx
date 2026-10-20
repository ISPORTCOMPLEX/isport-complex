import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { getBookingSettings } from '@/lib/booking/settings';
import { dayAvailability } from '@/lib/booking/availability';
import { validateSlot } from '@/lib/booking/create';
import { totalCents } from '@/lib/booking/pricing';
import { euros, fmtDayLong, hallTime, isIsoDate, pad2 } from '@/lib/booking/time';
import { BookingForm } from '@/components/booking/BookingForm';

export const metadata: Metadata = { title: 'Údaje k rezervácii', robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');

export default async function UdajePage({ searchParams }: Props) {
  const sp = await searchParams;
  const iso = one(sp.datum);
  const startHour = Number.parseInt(one(sp.od), 10);
  const hours = Number.parseInt(one(sp.hodiny), 10);
  const area = one(sp.plocha) === 'polovica' ? 'polovica' : 'cela';
  const self = `/rezervacia/udaje?datum=${iso}&od=${startHour}&hodiny=${hours}&plocha=${area}`;
  const user = await requireUser(self);
  const settings = await getBookingSettings();

  let problem = isIsoDate(iso) ? validateSlot(settings, iso, startHour, hours) : 'Neplatný dátum.';
  if (!problem) {
    const slots = await dayAvailability(settings, iso);
    const wanted = slots.filter((s) => s.hour >= startHour && s.hour < startHour + hours);
    const ok =
      wanted.length === hours &&
      (area === 'cela' ? wanted.every((s) => s.freeA && s.freeB) : wanted.every((s) => s.freeA) || wanted.every((s) => s.freeB));
    if (!ok) problem = 'Vybraný čas už nie je voľný.';
  }

  if (problem) {
    return (
      <section className="soon">
        <div className="wrap soon__in">
          <span className="kicker">Rezervácia</span>
          <h1 className="display h2">Termín nie je dostupný</h1>
          <p className="lead">{problem}</p>
          <Link href={isIsoDate(iso) ? `/rezervacia?datum=${iso}&plocha=${area}` : '/rezervacia'} className="btn" style={{ alignSelf: 'flex-start' }}>
            Vybrať iný čas
          </Link>
        </div>
      </section>
    );
  }

  const start = hallTime(iso, startHour);
  const cents = totalCents(settings, area, iso, startHour, hours);
  const last = await prisma.booking.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { teamName: true, contactPhone: true, contactName: true },
  });

  return (
    <>
      <section className="page-head page-head--tight">
        <div className="wrap page-head__in">
          <nav aria-label="Omrvinky" className="crumbs">
            <Link href="/rezervacia">Rezervácia</Link>
            <span>/</span>
            Údaje
          </nav>
          <h1 className="display h2">Dokončenie rezervácie</h1>
        </div>
      </section>
      <section className="section section--tight">
        <div className="wrap rez">
          <div className="rez__main">
            <div className="card rez__panel">
              <BookingForm
                hidden={{ datum: iso, od: String(startHour), hodiny: String(hours), plocha: area }}
                defaults={{
                  contactName: last?.contactName ?? `${user.firstName} ${user.lastName}`,
                  contactPhone: last?.contactPhone ?? user.phone ?? '',
                  teamName: last?.teamName ?? '',
                }}
                cancelFreeHours={settings.cancelFreeHours}
              />
            </div>
          </div>
          <aside className="rez__side">
            <div className="booker-frame rez__summary-frame">
              <div className="booker glass rez__summary">
                <h2 className="rez__label">Súhrn</h2>
                <dl className="rez__dl">
                  <div>
                    <dt>Plocha</dt>
                    <dd>{area === 'cela' ? 'Celá plocha' : 'Polovica plochy'}</dd>
                  </div>
                  <div>
                    <dt>Deň</dt>
                    <dd>{fmtDayLong(start)}</dd>
                  </div>
                  <div>
                    <dt>Čas</dt>
                    <dd>
                      {pad2(startHour)} – {pad2(startHour + hours)}
                    </dd>
                  </div>
                  <div>
                    <dt>Šatňa</dt>
                    <dd>V cene</dd>
                  </div>
                </dl>
                <div className="rez__total">
                  <small>Spolu s DPH</small>
                  <strong className="num">{euros(cents)}</strong>
                </div>
                <Link href={`/rezervacia?datum=${iso}&plocha=${area}&cas=${startHour}`} className="link-red rez__change">
                  ← Zmeniť termín
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
