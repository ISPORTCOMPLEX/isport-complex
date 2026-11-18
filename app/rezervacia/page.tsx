import type { Metadata } from 'next';
import Link from 'next/link';
import { BookingPicker } from '@/components/booking/BookingPicker';
import { RzBand } from '@/components/booking/RzBand';
import { getBookingSettings } from '@/lib/booking/settings';
import { dayAvailability, dayWindow } from '@/lib/booking/availability';
import { isIsoDate } from '@/lib/booking/time';
import { longDayLabel, monthLabel, nextDays } from '@/lib/dates';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Rezervácia ľadu') };
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');
// 0 = pondelok … 6 = nedeľa (pre mriežku kalendára)
const dow = (iso: string) => (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7;

export default async function RezervaciaPage({ searchParams }: Props) {
  const t = await getT();
  const sp = await searchParams;
  const settings = await getBookingSettings();
  const { first, last } = dayWindow(settings);
  const wanted = one(sp.datum);
  const iso = isIsoDate(wanted) && wanted >= first && wanted <= last ? wanted : first;
  const cas = Number.parseInt(one(sp.cas), 10);
  const sprchy = one(sp.sprchy) === '1';
  const presun = /^ISP-[A-Z0-9]{6}$/.test(one(sp.presun)) ? one(sp.presun) : null;

  // Týždeň (7 dní od dnes, po týždňoch) s počtom voľných hodín v každom dni.
  const days = nextDays(settings.maxDaysAhead, t);
  const idx = Math.max(0, days.findIndex((d) => d.iso === iso));
  const w0 = Math.floor(idx / 7) * 7;
  const week = days.slice(w0, w0 + 7);
  const weekAvail = await Promise.all(week.map((d) => dayAvailability(settings, d.iso)));
  const slots = weekAvail[idx - w0];
  const tail = `${sprchy ? '&sprchy=1' : ''}${presun ? `&presun=${presun}` : ''}`;

  return (
    <>
      <RzBand
        crumbs={[{ href: '/', label: t('Domov') }, { href: '/ladova-plocha', label: t('Ľadová plocha') }, { label: t('Rezervácia') }]}
        title={
          <>
            {t('Rezervácia')}{' '}<span className="is-red">{t('ľadu')}</span>
          </>
        }
        checks={[t('Celá plocha, 60 min'), t('Šatňa a úprava ľadu v cene'), t('Storno zdarma do {cancelFreeHours} h', { cancelFreeHours: settings.cancelFreeHours })]}
        lead={settings.temporary ? <p className="rz-note">{t('Ceny sú s DPH. Pre tvoju rezerváciu platí cena v potvrdení.')}</p> : undefined}
      />
      <div className="wrap rz2">
        {presun ? (
          <p className="rz2__move">
            {t('Presúvaš rezerváciu')}{' '}<strong>{presun}</strong>{t('. Vyber nový termín, pôvodný sa po potvrdení uvoľní.')}{' '}<Link href={`/rezervacia/${presun}`}>{t('Zrušiť presun')}</Link>
          </p>
        ) : null}
        <BookingPicker
          key={iso}
          week={week.map((d, i) => ({ ...d, free: weekAvail[i].filter((s) => s.free && s.bookable).length }))}
          prevWeek={w0 > 0 ? `/rezervacia?datum=${days[w0 - 7].iso}${tail}` : null}
          nextWeek={w0 + 7 < days.length ? `/rezervacia?datum=${days[w0 + 7].iso}${tail}` : null}
          month={monthLabel(iso, t)}
          calendar={days.map((d) => ({ iso: d.iso, num: d.num, dow: dow(d.iso), month: monthLabel(d.iso, t) }))}
          iso={iso}
          isToday={iso === first}
          dayLong={longDayLabel(iso, t)}
          dayLongYear={longDayLabel(iso, t, true)}
          slots={slots}
          initialHour={Number.isInteger(cas) ? cas : null}
          initialShowers={sprchy}
          maxHours={settings.maxHours}
          showersEnabled={settings.showersEnabled}
          showerPrice={settings.showerPrice}
          cancelFreeHours={settings.cancelFreeHours}
          presun={presun}
        />
      </div>
    </>
  );
}
