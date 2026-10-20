import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { getBookingSettings } from '@/lib/booking/settings';
import { dayAvailability } from '@/lib/booking/availability';
import { validateSlot } from '@/lib/booking/create';
import { iceCents, lockerCents } from '@/lib/booking/pricing';
import { euros, fmtDayLong, hallTime, isIsoDate, pad2 } from '@/lib/booking/time';
import { BookingForm } from '@/components/booking/BookingForm';
import { RzBand } from '@/components/booking/RzBand';

export const metadata: Metadata = { title: 'Údaje k rezervácii', robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');

export default async function UdajePage({ searchParams }: Props) {
  const sp = await searchParams;
  const iso = one(sp.datum);
  const startHour = Number.parseInt(one(sp.od), 10);
  const hours = Number.parseInt(one(sp.hodiny), 10);
  const presun = /^ISP-[A-Z0-9]{6}$/.test(one(sp.presun)) ? one(sp.presun) : null;
  const settings = await getBookingSettings();
  const rooms = Math.max(0, Math.min(settings.lockerRooms, Number.parseInt(one(sp.satne), 10) || 0));
  const self = `/rezervacia/udaje?datum=${iso}&od=${startHour}&hodiny=${hours}&satne=${rooms}${presun ? `&presun=${presun}` : ''}`;
  const user = await requireUser(self);

  let problem = isIsoDate(iso) ? validateSlot(settings, iso, startHour, hours) : 'Neplatný dátum.';
  const old = presun ? await prisma.booking.findUnique({ where: { code: presun } }) : null;
  if (presun && (!old || old.userId !== user.id || old.status !== 'CONFIRMED' || old.paymentStatus === 'PAID' || old.startsAt.getTime() - Date.now() < settings.cancelFreeHours * 3600000)) {
    problem = 'Túto rezerváciu už nie je možné presunúť online. Kontaktuj recepciu.';
  }
  if (!problem) {
    const slots = await dayAvailability(settings, iso);
    const wanted = slots.filter((s) => s.hour >= startHour && s.hour < startHour + hours);
    if (wanted.length !== hours || !wanted.every((s) => s.free)) problem = 'Vybraný čas už nie je voľný.';
  }

  if (problem) {
    return (
      <>
        <RzBand crumbs={[{ href: '/', label: 'Domov' }, { href: '/rezervacia', label: 'Rezervácia' }]} title="Termín nie je dostupný" />
        <section className="ice rz-ice">
          <div className="wrap rz-narrow">
            <p className="rz-lead">{problem}</p>
            <Link href={isIsoDate(iso) ? `/rezervacia?datum=${iso}&satne=${rooms}` : '/rezervacia'} className="btn" style={{ alignSelf: 'flex-start' }}>
              Vybrať iný čas
            </Link>
          </div>
        </section>
      </>
    );
  }

  const start = hallTime(iso, startHour);
  const ice = iceCents(settings, iso, startHour, hours);
  const lockers = lockerCents(settings, rooms);
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
        crumbs={[{ href: '/', label: 'Domov' }, { href: `/rezervacia?datum=${iso}&cas=${startHour}&satne=${rooms}`, label: 'Rezervácia' }, { label: 'Údaje' }]}
        step="Krok 2 z 2 · údaje"
        title={old ? `Presun ${old.code}` : 'Dokončenie'}
      />
      <section className="ice rz-ice">
        <div className="wrap rz-grid">
          <div className="rz-main">
            <div className="rz-card">
              <BookingForm
                hidden={{ datum: iso, od: String(startHour), hodiny: String(hours), satne: String(rooms), ...(old ? { presun: old.code } : {}) }}
                moving={old ? old.code : null}
                defaults={{
                  contactName: last?.contactName ?? `${user.firstName} ${user.lastName}`,
                  contactPhone: last?.contactPhone ?? user.phone ?? '',
                  teamName: last?.teamName ?? '',
                }}
                cancelFreeHours={settings.cancelFreeHours}
              />
            </div>
          </div>
          <aside className="rz-sum">
            <h2 className="rz-sum__title">Súhrn</h2>
            <dl className="rz-rows">
              <div>
                <dt>Plocha</dt>
                <dd>Celá ľadová plocha</dd>
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
                <dt>Ľad</dt>
                <dd>{euros(ice)}</dd>
              </div>
              <div>
                <dt>Šatne{rooms ? `, ${rooms} ×` : ''}</dt>
                <dd>{rooms ? euros(lockers) : 'bez šatne'}</dd>
              </div>
            </dl>
            <div className="rz-total">
              <span>Spolu s DPH</span>
              <strong>{euros(ice + lockers)}</strong>
            </div>
            <Link href={`/rezervacia?datum=${iso}&cas=${startHour}&satne=${rooms}${presun ? `&presun=${presun}` : ''}`} className="rz-back">
              Zmeniť termín alebo šatne
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}
