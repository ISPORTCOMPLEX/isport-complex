import Link from 'next/link';
import { ComplexSection } from '@/components/home/ComplexSection';
import { QuickBook } from '@/components/home/QuickBook';
import { nextDays } from '@/lib/dates';
import { getSite } from '@/lib/siteSettings';
import { orTbd } from '@/lib/site';
import { getBookingSettings } from '@/lib/booking/settings';
import { dayAvailability } from '@/lib/booking/availability';
import { slotPhotos, type SlotKey } from '@/lib/media';
import { CloudImage } from '@/components/CloudImage';

const eur = (v: number) => `${v.toLocaleString('sk-SK')} €`;

const PARTS = [
  { slot: 'skyboxy' as SlotKey, href: '/bufet-skyboxy', name: 'Skyboxy', text: 'Presklené boxy nad ľadovou plochou. Rodiny hráčov a hostia sledujú tréning v teple.', photo: 'Foto: skybox' },
  { slot: 'bufet' as SlotKey, href: '/bufet-skyboxy', name: 'Bufet', text: 'Občerstvenie po tréningu aj počas zápasu, priamo v hale.', photo: 'Foto: bufet' },
  { slot: 'ihrisko' as SlotKey, href: '/ihrisko', name: 'Futbalové ihrisko', text: 'Menšie vonkajšie ihrisko pri komplexe. Prenájom dohodneš na recepcii.', photo: 'Foto: ihrisko' },
  { slot: 'posilnovna' as SlotKey, href: '/fitness-wellness', name: 'Posilňovňa', text: 'Kondičná príprava pre hráčov aj verejnosť. Otvorenie oznámime tu.', photo: 'Vizualizácia', soon: true },
  { slot: 'wellness' as SlotKey, href: '/fitness-wellness', name: 'Wellness', text: 'Regenerácia po tréningu pod jednou strechou s ľadom.', photo: 'Vizualizácia', soon: true },
];

export default async function HomePage() {
  const [site, settings] = await Promise.all([getSite(), getBookingSettings()]);
  const days = nextDays(5);
  const avail = await Promise.all(days.map((d) => dayAvailability(settings, d.iso)));
  const qbDays = days.map((d, i) => ({ ...d, slots: avail[i].map((s) => ({ hour: s.hour, ok: s.free && s.bookable, price: s.price })) }));

  // Stav ľadu naživo: najbližšie voľné hodiny dnes, inak zajtra.
  const freeToday = qbDays[0].slots.filter((s) => s.ok).map((s) => `${s.hour}:00`);
  const freeTomorrow = qbDays[1]?.slots.filter((s) => s.ok).map((s) => `${s.hour}:00`) ?? [];
  const live =
    freeToday.length > 0
      ? `Ľad dnes: voľné ${freeToday.slice(0, 3).join(', ')}${freeToday.length > 3 ? ' a ďalšie' : ''}`
      : freeTomorrow.length > 0
        ? `Dnes plno. Zajtra voľné ${freeTomorrow.slice(0, 3).join(', ')}`
        : 'Najbližšie voľné časy nájdeš v rezervácii';
  const p = settings.prices.full;
  const rowPhotos = await Promise.all(PARTS.map((r) => slotPhotos(r.slot, '2:1')));

  return (
    <>
      {/* ÚVOD – rez komplexom */}
      <section className="hx">
        <div className="wrap hx__top">
          <h1 className="cond hx__title">
            I-Sport
            <br />
            Complex
          </h1>
          <div className="hx__side">
            <p>Športový komplex v Košiciach na Juhu. Tréningový ľad, skyboxy, bufet a ihrisko vonku. Posilňovňa a wellness pribudnú.</p>
            <Link href="/rezervacia" className="hx__live">
              <i aria-hidden="true" />
              {live}
            </Link>
          </div>
        </div>
        <ComplexSection />
      </section>

      {/* ĽAD – svetlá sekcia */}
      <section className="ice ix">
        <div className="ix__lines" aria-hidden="true">
          <i className="ix__blue" />
          <i className="ix__red" />
          <i className="ix__circle" />
        </div>
        <div className="wrap ix__in">
          <div className="ix__copy">
            <h2 className="cond ix__title">
              Ľad na
              <br />
              prenájom
            </h2>
            <p className="ix__lead">Celá tréningová plocha pre kluby, školy, firmy aj partie. Voľné hodiny vidíš hneď a potvrdenie s QR kódom máš v telefóne.</p>
            <dl className="ix__prices">
              <div>
                <dt>Mimo špičky</dt>
                <dd className="cond">{eur(p.offPeak)}</dd>
                <dd>za hodinu</dd>
              </div>
              <div>
                <dt>Špička a víkend</dt>
                <dd className="cond">{eur(Math.max(p.peak, p.weekend))}</dd>
                <dd>za hodinu</dd>
              </div>
              {settings.showersEnabled ? (
                <div>
                  <dt>Sprchy</dt>
                  <dd className="cond ix__red-txt">{eur(settings.showerPrice)}</dd>
                  <dd>pre celý tím</dd>
                </div>
              ) : null}
            </dl>
            <Link href="/cennik" className="ulink">
              Celý cenník a pravidlá
            </Link>
          </div>
          <QuickBook days={qbDays} showersEnabled={settings.showersEnabled} showerPrice={settings.showerPrice} />
        </div>
      </section>

      {/* CELÝ KOMPLEX – tabuľa */}
      <section className="bx">
        <div className="wrap">
          <div className="bx__head">
            <h2 className="cond bx__title">
              Celý
              <br />
              komplex
            </h2>
            <p>Ľad je srdcom komplexu, ale nie všetkým. Tu je, čo ešte nájdeš pod jednou strechou a hneď vedľa.</p>
          </div>
          <ul className="bx__rows">
            {PARTS.map((r, i) => (
              <li key={r.name} className={r.soon ? 'is-soon' : undefined}>
                <Link href={r.href} className="bx__row">
                  <span className="bx__name">
                    <strong className="cond">{r.name}</strong>
                    {r.soon ? <span className="bx__soon">Pripravujeme</span> : null}
                  </span>
                  <span className="bx__text">{r.text}</span>
                  {rowPhotos[i][0] ? <CloudImage photo={rowPhotos[i][0]} sizes="220px" className="bx__img" /> : <span className="bx__photo">{r.photo}</span>}
                  <span className="bx__go" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 14 14">
                      <path d="M3 11L11 3M5 3h6v6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                    </svg>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* PRE KOHO */}
      <section className="fx">
        <div className="wrap fx__grid">
          <div>
            <h3 className="cond">
              Kluby
              <br />a školy
            </h3>
            <p>Sezónny prenájom s pevnými časmi a mesačnou fakturáciou.</p>
            <Link href="/pre-kluby" className="ulink">
              Poslať dopyt
            </Link>
          </div>
          <div>
            <h3 className="cond">
              Firmy
              <br />a partie
            </h3>
            <p>Firemný hokej s bufetom a skyboxom pre hostí.</p>
            <Link href="/kontakt" className="ulink">
              Napísať nám
            </Link>
          </div>
          <div>
            <h3 className="cond">
              Rodičia
              <br />a fanúšikovia
            </h3>
            <p>Skyboxy s výhľadom na celú plochu a bufet o poschodie nižšie.</p>
            <Link href="/bufet-skyboxy" className="ulink">
              Skyboxy
            </Link>
          </div>
        </div>
      </section>

      {/* NÁVŠTEVA */}
      <section className="ice vx">
        <div className="vx__in">
          <div className="vx__copy">
            <h2 className="cond vx__title">
              Príď
              <br />
              na Juh
            </h2>
            <div className="vx__item">
              <span>Adresa</span>
              <strong>
                {orTbd(site.hall.street)}, {site.hall.city}
              </strong>
            </div>
            <div className="vx__two">
              <div className="vx__item">
                <span>Recepcia</span>
                {site.phone ? <a href={`tel:${site.phone.replace(/\s/g, '')}`}>{site.phone}</a> : <strong className="tbd">Doplníme</strong>}
              </div>
              <div className="vx__item">
                <span>E-mail</span>
                {site.email ? <a href={`mailto:${site.email}`}>{site.email}</a> : <strong className="tbd">Doplníme</strong>}
              </div>
            </div>
            <dl className="vx__hours">
              {site.hours.map((h) => (
                <div key={h.days}>
                  <dt>{h.days}</dt>
                  <dd>{orTbd(h.time)}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="vx__map">
            <svg viewBox="0 0 700 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              <g stroke="#FFFFFF" strokeWidth="16" fill="none">
                <path d="M-20 120L720 60" />
                <path d="M140 -20L260 600" />
                <path d="M-20 420L720 380" />
                <path d="M520 -20L470 600" />
              </g>
              <g stroke="#FFFFFF" strokeWidth="6" fill="none" opacity=".8">
                <path d="M-20 260L720 230" />
                <path d="M360 -20L380 600" />
              </g>
              <rect x="300" y="250" width="140" height="90" rx="6" fill="#0B0F14" />
              <g transform="translate(348 190) scale(.44)">
                <path d="M14 0H86L100 14V64C100 88 76 104 50 116C24 104 0 88 0 64V14Z" fill="#E3121B" />
                <path d="M18 8H82L92 18V63C92 83 72 97 50 107C28 97 8 83 8 63V18Z" fill="#08080A" />
                <path d="M44 46H62L53 94H35Z" fill="#FFFFFF" />
              </g>
            </svg>
            {site.hall.mapUrl ? (
              <a href={site.hall.mapUrl} target="_blank" rel="noopener noreferrer" className="vx__nav">
                Navigovať v Mapách
              </a>
            ) : null}
            <span className="vx__note">Ilustračná mapa</span>
          </div>
        </div>
      </section>
    </>
  );
}
