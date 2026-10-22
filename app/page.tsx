import Link from 'next/link';
import { QuickBook } from '@/components/home/QuickBook';
import { NewsSection } from '@/components/home/NewsSection';
import { CloudImage } from '@/components/CloudImage';
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

// Foto dlaždica komplexu – fotka zo slotu, inak tmavá šrafa (bez „Foto: …“ nápisov).
function Tile({ href, photo, n, name, text, big = false, sizes }: { href: string; photo: WebPhoto | null; n: string; name: string; text: string; big?: boolean; sizes: string }) {
  return (
    <Link href={href} className={`cx2__tile${big ? ' cx2__tile--big' : ''}`}>
      {photo ? <CloudImage photo={{ ...photo, alt: '' }} sizes={sizes} className="cx2__img" /> : null}
      <span className="cx2__ov" aria-hidden="true" />
      <span className="wide-display cx2__n" aria-hidden="true">
        {n}
      </span>
      <span className="cx2__tx">
        <span className="disp cx2__name">{name}</span>
        {big ? (
          <span className="cx2__go">
            {text}
            <Arrow color="#E30613" />
          </span>
        ) : (
          <span className="cx2__sub">{text}</span>
        )}
      </span>
    </Link>
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
  const photo = (slot: string) => {
    const p = photoMap[slot]?.[0];
    return p ? toWebPhoto(p, '4:3') : null;
  };

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
            <span className="eb">Tréningová hala · Košice – Juh</span>
            <h1 className="disp hx2__title">
              Tvoj ľad.
              <br />
              <span className="is-red">Tvoj čas.</span>
            </h1>
            <p className="hx2__lead">Celá tréningová plocha pre kluby, školy, firmy aj partie. Vyber hodinu online, potvrdenie s QR kódom máš hneď v telefóne.</p>
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
            {tickerRow(true)}
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

      {/* KOMPLEX – foto dlaždice */}
      <section className="wrap cx2" aria-labelledby="cx2-t">
        <div className="sec-head">
          <div className="sec-head__l">
            <span className="eb eb--muted">Šport · zábava · komunita</span>
            <h2 id="cx2-t" className="disp sec-title">
              Jeden komplex.
              <br />
              <span className="is-outline">Všetko na mieste.</span>
            </h2>
          </div>
          <p className="sec-head__p">Ľad je srdcom haly. Okolo neho skyboxy pre rodičov, bufet, vonkajšie ihrisko a čoskoro posilňovňa s wellness.</p>
        </div>
        <div className="cx2__grid">
          <Tile href="/ladova-plocha" photo={photo('ladova-plocha') ?? photo('komplex')} n="01" name="Ľadová plocha" text="Prenájom celej plochy · online" big sizes="(max-width: 820px) 100vw, 650px" />
          <Tile href="/bufet-skyboxy" photo={photo('skyboxy')} n="02" name="Skyboxy" text="Presklené boxy nad ľadom" sizes="(max-width: 820px) 50vw, 320px" />
          <Tile href="/bufet-skyboxy" photo={photo('bufet')} n="03" name="Bufet" text="Občerstvenie priamo v hale" sizes="(max-width: 820px) 50vw, 320px" />
          <Tile href="/ihrisko" photo={photo('ihrisko')} n="04" name="Ihrisko" text="Vonkajšie futbalové ihrisko" sizes="(max-width: 820px) 50vw, 320px" />
          <Link href="/fitness-wellness" className="cx2__soon">
            <span className="wide-display">Pripravujeme</span>
            <span>
              <span className="disp cx2__name">
                Posilňovňa
                <br />a wellness
              </span>
              <span className="cx2__sub">Otvorenie oznámime v novinkách</span>
            </span>
          </Link>
        </div>
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
