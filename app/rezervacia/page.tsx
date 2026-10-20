import type { Metadata } from 'next';
import Link from 'next/link';
import { BookingPicker } from '@/components/booking/BookingPicker';
import { RzBand } from '@/components/booking/RzBand';
import { getBookingSettings } from '@/lib/booking/settings';
import { dayAvailability, dayWindow } from '@/lib/booking/availability';
import { isIsoDate } from '@/lib/booking/time';
import { nextDays } from '@/lib/dates';

export const metadata: Metadata = { title: 'Rezervácia ľadu' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');

export default async function RezervaciaPage({ searchParams }: Props) {
  const sp = await searchParams;
  const settings = await getBookingSettings();
  const { first, last } = dayWindow(settings);
  const wanted = one(sp.datum);
  const iso = isIsoDate(wanted) && wanted >= first && wanted <= last ? wanted : first;
  const cas = Number.parseInt(one(sp.cas), 10);
  const sprchy = one(sp.sprchy) === '1';
  const presun = /^ISP-[A-Z0-9]{6}$/.test(one(sp.presun)) ? one(sp.presun) : null;
  const slots = await dayAvailability(settings, iso);

  return (
    <>
      <RzBand
        crumbs={[{ href: '/', label: 'Domov' }, { href: '/ladova-plocha', label: 'Ľadová plocha' }, { label: 'Rezervácia' }]}
        step="Krok 1 z 2 · termín"
        title={
          <>
            Rezervácia
            <br />
            ľadu
          </>
        }
        lead={
          <>
            <p>Prenajíma sa celá ľadová plocha. Vyber deň a čas, pridaj sprchy a pokračuj na údaje.</p>
            {settings.temporary ? <p className="rz-temp">Ceny sú zatiaľ orientačné.</p> : null}
          </>
        }
      />
      <section className="ice rz-ice">
        <div className="wrap">
          {presun ? (
            <p className="rz-move">
              Presúvaš rezerváciu <strong>{presun}</strong>. Vyber nový termín, pôvodný sa po potvrdení uvoľní.{' '}
              <Link href={`/rezervacia/${presun}`}>Zrušiť presun</Link>
            </p>
          ) : null}
          <BookingPicker
            key={iso}
            days={nextDays(settings.maxDaysAhead)}
            iso={iso}
            slots={slots}
            initialHour={Number.isInteger(cas) ? cas : null}
            initialShowers={sprchy}
            maxHours={settings.maxHours}
            showersEnabled={settings.showersEnabled}
            showerPrice={settings.showerPrice}
            presun={presun}
          />
        </div>
      </section>
    </>
  );
}
