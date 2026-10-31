import Link from 'next/link';
import { QuickBook } from '@/components/home/QuickBook';
import { NewsSection } from '@/components/home/NewsSection';
import { ComplexExplorer, type ZoneInfo } from '@/components/home/ComplexExplorer';
import { LocationSection } from '@/components/location/LocationSection';
import { longDayLabel, nextDays } from '@/lib/dates';
import { getSite } from '@/lib/siteSettings';
import { getBookingSettings } from '@/lib/booking/settings';
import { dayAvailability } from '@/lib/booking/availability';
import { iceToday } from '@/lib/booking/iceToday';
import { photosBySlot, toWebPhoto, type WebPhoto } from '@/lib/media';
import { homeArticles } from '@/lib/articles/queries';

const eur = (v: number) => `${v.toLocaleString('sk-SK')} €`;
const pad = (h: number) => `${String(h).padStart(2, '0')}:00`;
const h2 = (h: number) => String(h).padStart(2, '0');

function Arrow({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke={color} strokeWidth="3" />
    </svg>
  );
}

export default async function HomePage() {
  const [site, settings, news, ice, photoMap] = await Promise.all([
    getSite(),
    getBookingSettings(),
    homeArticles(),
    iceToday(),
    photosBySlot().catch(() => ({}) as Awaited<ReturnType<typeof photosBySlot>>),
  ]);
  const days = nextDays(5);
  const avail = await Promise.all(days.map((d) => dayAvailability(settings, d.iso)));
  const qbDays = days.map((d, i) => ({
    ...d,
    long: longDayLabel(d.iso),
    slots: avail[i].map((s) => ({ hour: s.hour, ok: s.free && s.bookable, past: !s.bookable, price: s.price })),
  }));
  // fotky interiéru pre interaktívny rez komplexom
  const photos = (slot: string): WebPhoto[] => (photoMap[slot] ?? []).map((p) => toWebPhoto(p, '4:3')).filter((p): p is WebPhoto => p !== null);
  const zones: ZoneInfo[] = [
    { zone: 'ice', name: 'Ľadová plocha', hall: 'Hala 1', text: 'Celá plocha s mantinelmi, šatňa v cene a úprava ľadu pred každým blokom. Hodinu si rezervuješ online, kluby aj na celú sezónu.', href: '/rezervacia', cta: 'Rezervovať ľad', photos: photos('ladova-plocha') },
    { zone: 'sky', name: 'Skyboxy', hall: 'Hala 1 · poschodie', text: 'Presklené boxy nad ľadom. Rodičia a hostia sledujú tréning v teple, s výhľadom na celú plochu.', href: '/bufet-skyboxy', cta: 'Skyboxy a bufet', photos: photos('skyboxy') },
    { zone: 'food', name: 'Bufet', hall: 'Hala 1 · prízemie', text: 'Teplé nápoje a občerstvenie priamo v hale – pred tréningom, cez prestávku aj po zápase.', href: '/bufet-skyboxy', cta: 'Ponuka bufetu', photos: photos('bufet') },
    { zone: 'pitch', name: 'Ihrisko', hall: 'Medzi halami', text: 'Vonkajšie futbalové ihrisko medzi halou 1 a halou 2 – na tréningy aj zápasy.', href: '/ihrisko', cta: 'Ihrisko', photos: photos('ihrisko') },
    { zone: 'gym', name: 'Posilňovňa', hall: 'Hala 2 · poschodie', text: 'Samostatná hala 2 na druhej strane ihriska. Posilňovňu pre hráčov aj verejnosť pripravujeme – otvorenie oznámime v novinkách.', href: '/fitness-wellness', cta: 'Viac o hale 2', soon: true, photos: photos('posilnovna') },
    { zone: 'well', name: 'Wellness', hall: 'Hala 2 · prízemie', text: 'Regenerácia po tréningu v hale 2. Wellness pripravujeme spolu s posilňovňou.', href: '/fitness-wellness', cta: 'Viac o hale 2', soon: true, photos: photos('wellness') },
  ];

  // Tabuľa „Ľad dnes“: najbližšia voľná hodina a ďalších 6 hodín dňa.
  const firstFree = ice.slots.find((s) => s.ok) ?? null;
  const chips = firstFree ? ice.slots.filter((s) => s.hour > firstFree.hour).slice(0, 6) : [];
  // na mobile len prvé 4 voľné hodiny
  const mobileChips = new Set(chips.filter((s) => s.ok).slice(0, 4).map((s) => s.hour));
  const priceHour = `${ice.priceLabel} / hod`;
  const ticker = [
    `Ľad · ${priceHour}`,
    'Šatňa v cene',
    settings.showersEnabled ? `Sprchy ${eur(settings.showerPrice)} pre tím` : null,
    `Storno zdarma ${settings.cancelFreeHours} h`,
    'QR potvrdenie v mobile',
    'Skyboxy nad ľadom',
  ].filter((t): t is string => t !== null);
  const tickerRow = (hidden: boolean) => (
    <div className="tk__row" aria-hidden={hidden || undefined}>
      {ticker.map((t) => (
        <span key={t} className="u-contents">
          <span>{t}</span>
          <span aria-hidden="true">✕</span>
        </span>
      ))}
    </div>
  );

  return (
    <>
      {/* HERO – textúra ľadu, „Tvoj ľad. Tvoj čas.“ a tabuľa „Ľad dnes“ */}
      <section className="hx2">
        <span className="hx2__shade" aria-hidden="true" />
        <span className="wide-display hx2__word" aria-hidden="true">
          Košice
        </span>
        <div className="wrap hx2__in">
          <div className="hx2__copy">
            <h1 className="disp hx2__title">
              Tvoj ľad.
              <br />
              <span className="is-red">Tvoj čas.</span>
            </h1>
            <p className="hx2__lead">Tréningová hala v Košiciach na Juhu. Celá ľadová plocha pre kluby, školy, firmy aj partie – vyber hodinu online a potvrdenie s QR kódom máš hneď v telefóne.</p>
            <div className="hx2__btns">
              <Link href="/rezervacia" className="sbtn">
                Rezervovať ľad
                <Arrow />
              </Link>
              <Link href="/pre-kluby" className="sbtn sbtn--ghost">
                Sezónny prenájom
              </Link>
            </div>
          </div>

          <aside className="board" aria-label={ice.day === 'zajtra' ? 'Ľad zajtra' : 'Ľad dnes'}>
            <div className="board__bar">
              <span className="wide-display">{ice.day === 'zajtra' ? 'Ľad zajtra' : 'Ľad dnes'}</span>
              <span className="board__live">
                <i aria-hidden="true" />
                Naživo
              </span>
            </div>
            <div className="board__body">
              <div className="board__top">
                <span className="board__next">
                  <span className="board__lbl">Najbližšie voľné</span>
                  <span className="disp board__time">{firstFree ? pad(firstFree.hour) : '—'}</span>
                </span>
                <span className="board__cnt">
                  <span>{ice.dayLabel}</span>
                  <span className="disp">{ice.hours.length ? `${ice.hours.length} ${ice.hours.length === 1 ? 'voľná' : ice.hours.length <= 4 ? 'voľné' : 'voľných'}` : 'Plno'}</span>
                </span>
              </div>
              {chips.length ? (
                <div className="board__chips">
                  {chips.map((s) =>
                    s.ok ? (
                      <Link key={s.hour} href={`/rezervacia?datum=${ice.iso}&cas=${s.hour}`} className={`chip2${mobileChips.has(s.hour) ? '' : ' m-hide'}`} aria-label={`${pad(s.hour)}, voľné, ${eur(s.price)}`}>
                        <span className="disp">{pad(s.hour)}</span>
                        <span>{eur(s.price)}</span>
                      </Link>
                    ) : (
                      <span key={s.hour} className="chip2 is-off m-hide">
                        <span className="disp">{pad(s.hour)}</span>
                        <span>obsadené</span>
                      </span>
                    ),
                  )}
                </div>
              ) : (
                <p className="board__empty">Najbližšie voľné časy nájdeš v rezervácii.</p>
              )}
              <Link href={ice.iso ? `/rezervacia?datum=${ice.iso}` : '/rezervacia'} className="board__all">
                Celý deň a ďalšie termíny
                <Arrow color="#E30613" />
              </Link>
            </div>
          </aside>
        </div>

        <div className="tk">
          <div className="wide-display tk__track">
            {tickerRow(false)}
          </div>
        </div>
      </section>

      {/* NOVINKY – vždy prvé */}
      <NewsSection items={news} />

      {/* RÝCHLA REZERVÁCIA – svetlá ľadová sekcia */}
      <section className="ice2">
        <div className="wrap ice2__in">
          <QuickBook days={qbDays} showersEnabled={settings.showersEnabled} showerPrice={settings.showerPrice} />
        </div>
      </section>

      {/* PÁS ČÍSEL */}
      <section className="stats" aria-label="Ľad v číslach">
        <div className="wrap stats__in">
          <div>
            <span className="wide-display">{ice.priceLabel}</span>
            <span>za hodinu, celá plocha</span>
          </div>
          <div>
            <span className="wide-display">
              {h2(settings.openHour)}–{h2(settings.closeHour)}
            </span>
            <span>časy na ľade každý deň</span>
          </div>
          <div>
            <span className="wide-display">{settings.cancelFreeHours} h</span>
            <span>zrušenie bez poplatku</span>
          </div>
          <div>
            <span className="wide-display">0 €</span>
            <span>za šatňu a úpravu ľadu</span>
          </div>
        </div>
      </section>

      {/* KOMPLEX – interaktívny rez: klik priblíži časť a ukáže fotky */}
      <section className="wrap cx2" aria-labelledby="cx2-t">
        <div className="sec-head">
          <div className="sec-head__l">
            <h2 id="cx2-t" className="disp sec-title">
              Jeden komplex.
              <br />
              <span className="is-outline">Všetko na mieste.</span>
            </h2>
          </div>
          <p className="sec-head__p">V hale 1 ľad, skyboxy a bufet, medzi halami ihrisko, v hale 2 posilňovňa a wellness. Klikni na miesto a pozri sa dnu.</p>
        </div>
        <ComplexExplorer zones={zones} />
      </section>

      {/* PRE KOHO */}
      <section className="wrap who" aria-label="Pre koho">
        <h2 className="disp who__mtitle">Pre koho</h2>
        <div className="who__grid">
          {[
            { href: '/pre-kluby', l: 'K', eb: 'Kluby a školy', t: 'Pevné hodiny na celú sezónu', p: 'Jedna zmluva, mesačná faktúra. Ponuku s voľnými časmi pošleme do 2 pracovných dní.', m: 'Sezónny prenájom, mesačná faktúra', go: 'Poslať dopyt' },
            { href: '/kontakt', l: 'F', eb: 'Firmy a partie', t: 'Firemný hokej s bufetom', p: 'Ľad pre tím, skybox s výhľadom pre hostí a občerstvenie po zápase.', m: 'Firemný hokej s bufetom', go: 'Napísať nám' },
            { href: '/bufet-skyboxy', l: 'R', eb: 'Rodičia a fanúšikovia', t: 'Tréning v teple skyboxu', p: 'Výhľad na celú plochu, bufet o poschodie nižšie.', m: 'Skyboxy s výhľadom na plochu', go: 'Skyboxy' },
          ].map((c) => (
            <Link key={c.l} href={c.href} className="who__card">
              <span className="wide-display who__letter" aria-hidden="true">
                {c.l}
              </span>
              <span className="eb eb--red">{c.eb}</span>
              <span className="disp who__t">{c.t}</span>
              <span className="who__p">{c.p}</span>
              <span className="who__m">{c.m}</span>
              <span className="who__go">
                {c.go}
                <Arrow size={18} color="#E30613" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* KONTAKT / MAPA */}
      <LocationSection site={site} />

      {/* Mobil: prilepená lišta s cenou a rezerváciou */}
      <div className="mbar">
        <span className="mbar__p">
          <small>Celá plocha</small>
          <span className="disp">{priceHour}</span>
        </span>
        <Link href="/rezervacia" className="sbtn sbtn--md">
          Rezervovať
        </Link>
      </div>
    </>
  );
}
