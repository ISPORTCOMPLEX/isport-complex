import type { Metadata } from 'next';
import Link from 'next/link';
import { BookingPicker } from '@/components/booking/BookingPicker';
import { getBookingSettings } from '@/lib/booking/settings';
import { dayAvailability, dayWindow } from '@/lib/booking/availability';
import { isIsoDate } from '@/lib/booking/time';
import { nextDays } from '@/lib/dates';

export const metadata: Metadata = { title: 'Rezervácia ľadu' };

type Props = { searchParams: Promise<{ datum?: string | string[]; cas?: string | string[]; plocha?: string | string[]; presun?: string | string[] }> };
const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');

export default async function RezervaciaPage({ searchParams }: Props) {
  const sp = await searchParams;
  const settings = await getBookingSettings();
  const { first, last } = dayWindow(settings);
  const wanted = one(sp.datum);
  const iso = isIsoDate(wanted) && wanted >= first && wanted <= last ? wanted : first;
  const area = one(sp.plocha) === 'polovica' ? 'polovica' : 'cela';
  const cas = Number.parseInt(one(sp.cas), 10);
  const slots = await dayAvailability(settings, iso);
  const presun = /^ISP-[A-Z0-9]{6}$/.test(one(sp.presun)) ? one(sp.presun) : null;

  return (
    <>
      <section className="page-head page-head--tight">
        <div className="wrap page-head__in">
          <nav aria-label="Omrvinky" className="crumbs">
            <Link href="/">Domov</Link>
            <span>/</span>
            Rezervácia
          </nav>
          <div className="section__head">
            <h1 className="display h2">Rezervácia ľadu</h1>
            <p className="muted">
              Vyber plochu, deň a začiatok. Rezervovať môžeš až {settings.maxDaysAhead} dní dopredu, najviac {settings.maxHours} hodiny naraz.
            </p>
          </div>
          {settings.temporary ? <p className="rez__temp">Ceny a otváracie hodiny sú zatiaľ orientačné.</p> : null}
          {presun ? (
            <p className="rez__move">
              Presúvaš rezerváciu <strong>{presun}</strong>. Vyber nový termín, pôvodný sa po potvrdení uvoľní.{' '}
              <Link href={`/rezervacia/${presun}`} className="link-red">
                Zrušiť presun
              </Link>
            </p>
          ) : null}
        </div>
      </section>
      <section className="section section--tight">
        <div className="wrap">
          <BookingPicker key={iso} days={nextDays(settings.maxDaysAhead)} iso={iso} slots={slots} initialArea={area} initialHour={Number.isInteger(cas) ? cas : null} maxHours={settings.maxHours} presun={presun} />
        </div>
      </section>
    </>
  );
}
