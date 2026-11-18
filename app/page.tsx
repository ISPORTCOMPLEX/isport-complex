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
import { iceNow } from '@/components/home/LiveIce';
import { kosiceWeather } from '@/lib/weather';
import { HeroVideo } from '@/components/home/HeroVideo';
import { CloudImage } from '@/components/CloudImage';
import { ZoneHero } from '@/components/home/ZoneHero';
import { JsonLd } from '@/components/JsonLd';
import { appUrl } from '@/lib/requestInfo';

const eur = (v: number) => `${v.toLocaleString('sk-SK')} €`;
const pad = (h: number) => `${String(h).padStart(2, '0')}:00`;
const h2 = (h: number) => String(h).padStart(2, '0');

// údaje o hale pre Google (Mapy, vyhľadávanie) – len to, čo je naozaj vyplnené
function businessLd(site: Awaited<ReturnType<typeof getSite>>) {
  const base = appUrl() ?? '';
  const days = [['Mo', 'Tu', 'We', 'Th', 'Fr'], ['Sa'], ['Su']];
  const hours = site.hours
    .map((h, i) => {
      const m = /(\d{1,2})[:.](\d{2})\s*[–-]\s*(\d{1,2})[:.](\d{2})/.exec(h.time);
      return m ? { '@type': 'OpeningHoursSpecification', dayOfWeek: days[i]?.map((d) => `https://schema.org/${{ Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday', Fr: 'Friday', Sa: 'Saturday', Su: 'Sunday' }[d]}`), opens: `${m[1].padStart(2, '0')}:${m[2]}`, closes: `${m[3].padStart(2, '0')}:${m[4]}` } : null;
    })
    .filter(Boolean);
  const [zip, ...rest] = site.hall.city.split(' ');
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: 'I-SPORT COMPLEX',
    description: 'Tréningová hokejová hala v Košiciach na Juhu – prenájom ľadu online, skyboxy, bufet a futbalové ihrisko.',
    url: base || undefined,
    image: base ? `${base}/brand/logo-slogan-na-tmave.svg` : undefined,
    telephone: site.phone || undefined,
    email: site.email || undefined,
    address: { '@type': 'PostalAddress', streetAddress: site.hall.street, postalCode: /^\d/.test(zip) ? `${zip} ${rest[0] ?? ''}`.trim() : undefined, addressLocality: 'Košice', addressCountry: 'SK' },
    geo: site.hall.lat && site.hall.lng ? { '@type': 'GeoCoordinates', latitude: Number(site.hall.lat), longitude: Number(site.hall.lng) } : undefined,
    openingHoursSpecification: hours.length ? hours : undefined,
    sameAs: [site.social.facebook, site.social.instagram].filter(Boolean),
  };
}

export default async function HomePage() {
  const [site, settings, news, ice, photoMap, weather] = await Promise.all([
    getSite(),
    getBookingSettings(),
    homeArticles(),
    iceToday(),
    photosBySlot().catch(() => ({}) as Awaited<ReturnType<typeof photosBySlot>>),
    kosiceWeather(),
  ]);
  const renderedAt = Date.now();
  // aktuálna hodina v Košiciach (pre „Práve teraz“)
  const nowHour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Europe/Bratislava' }).format(renderedAt)) % 24;
  const week = nextDays(7);
  const weekAvail = await Promise.all(week.map((d) => dayAvailability(settings, d.iso).catch(() => [])));
  const qbDays = week.map((d, i) => ({
    iso: d.iso,
    short: d.short,
    num: d.num,
    long: longDayLabel(d.iso),
    name: i === 0 ? 'Dnes' : longDayLabel(d.iso).split(' ')[0].replace(/^./, (c: string) => c.toUpperCase()),
    date: d.label.replace(/^\S+\s/, ''),
    slots: weekAvail[i].map((s) => ({ hour: s.hour, ok: s.free && s.bookable, past: !s.bookable, price: s.price })),
  }));
  // „práve teraz“ do tabule v úvode
  const now = iceNow(
    (weekAvail[0] ?? []).map((x) => ({ hour: x.hour, free: x.free, bookable: x.bookable })),
    nowHour,
    settings.openHour,
    settings.closeHour,
  );
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

  // Karta „Najbližší voľný ľad“: prvá voľná hodina dňa, za ňou ďalšie 4 voľné hodiny.
  const firstFree = ice.slots.find((s) => s.ok) ?? null;
  const nextFree = firstFree ? ice.slots.filter((s) => s.ok && s.hour > firstFree.hour).slice(0, 4) : [];
  // o koľko minút začína (len dnes a len do 12 hodín – inak stačí čas)
  const nowMin = nowHour * 60 + Number(new Intl.DateTimeFormat('en-GB', { minute: '2-digit', timeZone: 'Europe/Bratislava' }).format(renderedAt));
  const inMin = firstFree && ice.day === 'dnes' ? firstFree.hour * 60 - nowMin : null;
  const inLabel = inMin !== null && inMin > 0 && inMin < 720 ? (inMin < 60 ? `o ${inMin} minút` : `o ${Math.floor(inMin / 60)} h ${inMin % 60 ? `${inMin % 60} min` : ''}`.trim()) : null;
  const heroPhoto = photos('ladova-plocha')[0] ?? photos('komplex')[0] ?? null;
  // fotky na karty „Pre koho“ (bez fotky sa ukáže ilustrácia časti areálu)
  const whoPhoto = (...slots: string[]) => slots.map((x) => photos(x)[0]).find(Boolean) ?? null;

  return (
    <>
      {/* HERO – fotka haly, „Tvoj ľad. Tvoj čas.“ a karta najbližšieho voľného ľadu */}
      <section className={`hx3${site.heroVideo ? ' hx3--video' : ''}${heroPhoto ? ' hx3--photo' : ''}`}>
        {site.heroVideo ? <HeroVideo src={site.heroVideo} poster={site.heroVideo.replace(/\.mp4$/, '.jpg')} /> : heroPhoto ? <CloudImage photo={{ ...heroPhoto, alt: '' }} sizes="100vw" className="hx3__img" priority /> : null}
        <span className="hx3__shade" aria-hidden="true" />
        <div className="wrap hx3__in">
          <div className="hx3__copy">
            <p className="hx3__eb">
              <i aria-hidden="true" />
              Tréningová hokejová hala, Košice – Juh
            </p>
            <h1 className="disp hx3__title">
              Tvoj ľad.
              <br />
              Tvoj čas.
            </h1>
            <p className="hx3__lead">Celá plocha len pre tvoj tím. Hodinu vyberieš online a potvrdenie s QR kódom máš hneď v telefóne.</p>
            <div className="hx3__btns">
              <Link href="/rezervacia" className="sbtn" data-magnet="">
                Rezervovať ľad
              </Link>
              <Link href="/pre-kluby" className="sbtn sbtn--ghost">
                Sezónny prenájom pre kluby
              </Link>
              <a href="#komplex" className="hx3__play">
                <span aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path d="M7 4l13 8-13 8z" fill="currentColor" />
                  </svg>
                </span>
                Prejdi si areál v 3D
              </a>
            </div>
          </div>

          <aside className="nxf" aria-label="Najbližší voľný ľad">
            <div className="nxf__bar">
              <span>Najbližší voľný ľad</span>
              {now ? (
                <span className={`nxf__now is-${now.tone}`}>
                  <i aria-hidden="true" />
                  {now.text}
                </span>
              ) : null}
            </div>
            <div className="nxf__body">
              {firstFree ? (
                <>
                  <span className="nxf__day">{ice.day === 'dnes' ? `Dnes, ${ice.dayLabel}` : `Zajtra, ${ice.dayLabel}`}</span>
                  <div className="nxf__main">
                    <span className="disp nxf__time">{pad(firstFree.hour)}</span>
                    <span className="nxf__meta">
                      <b className="disp">{eur(firstFree.price)}</b>
                      {inLabel ? <span>{inLabel}</span> : null}
                    </span>
                  </div>
                  <Link href={`/rezervacia?datum=${ice.iso}&cas=${firstFree.hour}`} className="sbtn sbtn--block">
                    Rezervovať {pad(firstFree.hour)}
                  </Link>
                  {nextFree.length ? (
                    <div className="nxf__chips">
                      {nextFree.map((x) => (
                        <Link key={x.hour} href={`/rezervacia?datum=${ice.iso}&cas=${x.hour}`} aria-label={`${pad(x.hour)}, voľné, ${eur(x.price)}`}>
                          <b className="disp">{pad(x.hour)}</b>
                          <span>{eur(x.price)}</span>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="nxf__empty">Dnes a zajtra je ľad obsadený. Voľné časy na ďalšie dni nájdeš v rozpise.</p>
                  <Link href="/rezervacia" className="sbtn sbtn--block">
                    Otvoriť rozpis ľadu
                  </Link>
                </>
              )}
            </div>
          </aside>
        </div>
      </section>

      {/* PÁS ČÍSEL */}
      <section className="st3" aria-label="Ľad v číslach">
        <div className="wrap st3__in">
          <div>
            <b className="disp">{ice.priceLabel}</b>
            <span>za hodinu, celá plocha</span>
          </div>
          <div>
            <b className="disp">Šatňa v cene</b>
            <span>aj úprava ľadu pred každým blokom</span>
          </div>
          <div>
            <b className="disp">{settings.cancelFreeHours} hodín</b>
            <span>dovtedy zrušíš rezerváciu zadarmo</span>
          </div>
          <div>
            <b className="disp">
              {h2(settings.openHour)} – {h2(settings.closeHour)}
            </b>
            <span>časy na ľade každý deň</span>
          </div>
        </div>
      </section>

      {/* REZERVÁCIA – deň aj celý týždeň v jednej sekcii */}
      <section className="ice2 lite" id="rezervacia">
        <div className="wrap ice2__in">
          <QuickBook days={qbDays} showersEnabled={settings.showersEnabled} showerPrice={settings.showerPrice} maxHours={settings.maxHours} />
        </div>
      </section>

      {/* AREÁL – tmavý pás medzi modrými čiarami: 3D maketa / ilustrácia, klik priblíži časť a ukáže fotky */}
      <section id="komplex" className="cx3" aria-labelledby="cx2-t">
        <div className="wrap cx2">
          <div className="shd">
            <h2 id="cx2-t" className="disp shd__t">
              Jeden areál, všetko na mieste
            </h2>
            <span className="shd__line" aria-hidden="true" />
            {(photoMap.prehliadka ?? []).length ? (
              <Link href="/prehliadka" className="shd__more">
                Prehliadka 360°
              </Link>
            ) : null}
          </div>
          <p className="shd__p">V hale 1 ľad, skyboxy a bufet, medzi halami ihrisko, v hale 2 posilňovňa a wellness. Klikni na miesto a pozri sa dnu.</p>
          <ComplexExplorer zones={zones} now={renderedAt} weather={weather} />
        </div>
      </section>

      {/* NOVINKY */}
      <NewsSection items={news} />

      {/* PRE KOHO – fotky z haly, bez fotky ilustrácia časti areálu */}
      <section className="lite who3" aria-labelledby="who3-t">
        <div className="wrap">
          <div className="shd">
            <h2 id="who3-t" className="disp shd__t">
              Pre koho je ľad
            </h2>
            <span className="shd__line" aria-hidden="true" />
          </div>
          <div className="who3__grid">
            {[
              { href: '/pre-kluby', t: 'Kluby a školy', p: 'Pevné hodiny na celú sezónu, jedna zmluva a mesačná faktúra.', go: 'Poslať dopyt', photo: whoPhoto('ladova-plocha', 'komplex'), zone: 'ice' as const },
              { href: '/rezervacia', t: 'Firmy a partie', p: 'Ľad pre tím, skybox pre hostí a občerstvenie po zápase.', go: 'Rezervovať hodinu', photo: whoPhoto('bufet', 'komplex'), zone: 'food' as const },
              { href: '/bufet-skyboxy', t: 'Rodičia a fanúšikovia', p: 'Tréning sleduješ v teple skyboxu, bufet je o poschodie nižšie.', go: 'Skyboxy a bufet', photo: whoPhoto('skyboxy'), zone: 'sky' as const },
            ].map((c) => (
              <Link key={c.href} href={c.href} className="who3__card">
                {c.photo ? <CloudImage photo={{ ...c.photo, alt: '' }} sizes="(max-width: 900px) 100vw, 33vw" className="who3__img" /> : <span className="who3__art" aria-hidden="true"><ZoneHero zone={c.zone} now={renderedAt} weather={weather} bare /></span>}
                <span className="who3__ov" aria-hidden="true" />
                <span className="who3__tx">
                  <span className="disp who3__t">{c.t}</span>
                  <span className="who3__p">{c.p}</span>
                  <span className="who3__go">{c.go}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* KONTAKT / MAPA */}
      <LocationSection site={site} />
      <JsonLd data={businessLd(site)} />

    </>
  );
}
