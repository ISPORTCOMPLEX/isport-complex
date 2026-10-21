import Link from 'next/link';
import { ComplexSection } from '@/components/home/ComplexSection';
import { QuickBook } from '@/components/home/QuickBook';
import { nextDays } from '@/lib/dates';
import { getSite } from '@/lib/siteSettings';
import { orTbd } from '@/lib/site';
import { getBookingSettings } from '@/lib/booking/settings';
import { dayAvailability } from '@/lib/booking/availability';
import { photosBySlot, slotPhotos, toWebPhoto, type SlotKey } from '@/lib/media';
import { CloudImage } from '@/components/CloudImage';
import { LocationSection } from '@/components/location/LocationSection';
import { LiveStrip, NewsSection } from '@/components/home/NewsSection';
import { homeArticles } from '@/lib/articles/queries';
import { iceToday } from '@/lib/booking/iceToday';

const eur = (v: number) => `${v.toLocaleString('sk-SK')} €`;

const PARTS = [
  { slot: 'skyboxy' as SlotKey, href: '/bufet-skyboxy', name: 'Skyboxy', text: 'Presklené boxy nad ľadovou plochou. Rodiny hráčov a hostia sledujú tréning v teple.', photo: 'Foto: skybox' },
  { slot: 'bufet' as SlotKey, href: '/bufet-skyboxy', name: 'Bufet', text: 'Občerstvenie po tréningu aj počas zápasu, priamo v hale.', photo: 'Foto: bufet' },
  { slot: 'ihrisko' as SlotKey, href: '/ihrisko', name: 'Futbalové ihrisko', text: 'Menšie vonkajšie ihrisko pri komplexe. Prenájom dohodneš na recepcii.', photo: 'Foto: ihrisko' },
  { slot: 'posilnovna' as SlotKey, href: '/fitness-wellness', name: 'Posilňovňa', text: 'Kondičná príprava pre hráčov aj verejnosť. Otvorenie oznámime tu.', photo: 'Vizualizácia', soon: true },
  { slot: 'wellness' as SlotKey, href: '/fitness-wellness', name: 'Wellness', text: 'Regenerácia po tréningu pod jednou strechou s ľadom.', photo: 'Vizualizácia', soon: true },
];

const HK_LINKS = [
  { href: '/ladova-plocha', name: 'Ľadová plocha' },
  { href: '/bufet-skyboxy', name: 'Skyboxy' },
  { href: '/bufet-skyboxy', name: 'Bufet' },
  { href: '/ihrisko', name: 'Ihrisko' },
  { href: '/fitness-wellness', name: 'Posilňovňa', soon: true },
  { href: '/fitness-wellness', name: 'Wellness', soon: true },
];

export default async function HomePage() {
  const [site, settings, news, ice, photoMap] = await Promise.all([getSite(), getBookingSettings(), homeArticles(), iceToday(), photosBySlot().catch(() => ({}) as Awaited<ReturnType<typeof photosBySlot>>)]);
  const pick = (slot: string, i = 0) => {
    const p = photoMap[slot]?.[i] ?? photoMap[slot]?.[0];
    return p ? toWebPhoto(p, '4:3') : null;
  };
  const fallbackPhotos = { lad: pick('ladova-plocha') ?? pick('komplex'), cennik: pick('ladova-plocha', 1), kluby: pick('ladova-plocha', 2), skyboxy: pick('skyboxy') };
  const days = nextDays(5);
  const avail = await Promise.all(days.map((d) => dayAvailability(settings, d.iso)));
  const qbDays = days.map((d, i) => ({ ...d, slots: avail[i].map((s) => ({ hour: s.hour, ok: s.free && s.bookable, price: s.price })) }));

  const p = settings.prices.full;
  const rowPhotos = await Promise.all(PARTS.map((r) => slotPhotos(r.slot, '2:1')));

  return (
    <>
      {/* NOVINKY vždy navrchu (ako spravodajský web), pod nimi rýchla rezervácia a rez komplexom */}
      <div className="hn-top">
        <h1 className="sr-only">I-SPORT COMPLEX – športový komplex v Košiciach</h1>
        <LiveStrip ice={ice} />
        <NewsSection items={news} fallback={{ ice, photos: fallbackPhotos }} />
      </div>

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

      {/* KOMPLEX – animovaný rez budovou */}
      <section className="hk" aria-labelledby="hk-t">
        <div className="wrap hk__head">
          <h2 id="hk-t" className="cond hk__title">
            Komplex
          </h2>
          <p>Ľad je srdcom komplexu. Prejdi myšou po budove – hráči sa rozkorčuľujú, v posilňovni dvíhajú činky, v bufete sa je.</p>
        </div>
        <ComplexSection />
        <nav className="wrap hk__links" aria-label="Časti komplexu">
          {HK_LINKS.map((l) => (
            <Link key={l.name} href={l.href}>
              {l.name}
              {l.soon ? <em>pripravujeme</em> : <span aria-hidden="true">→</span>}
            </Link>
          ))}
        </nav>
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
      <LocationSection site={site} />
    </>
  );
}
