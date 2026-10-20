import Link from 'next/link';
import { BookingWidget } from '@/components/BookingWidget';
import { ArrowUpRight, IconCard, IconQr, IconUndo } from '@/components/Icons';
import { RinkPerspective, RinkPlan } from '@/components/Rink';
import { nextDays } from '@/lib/dates';
import { lowestPrice } from '@/lib/site';
import { getSite } from '@/lib/siteSettings';
import { getBookingSettings } from '@/lib/booking/settings';

const faq = (cancelFreeHours: number) => [
  {
    q: 'Môžem rezerváciu zrušiť alebo presunúť?',
    a: `Áno. Najneskôr ${cancelFreeHours} hodín pred začiatkom ju zrušíš alebo presunieš bez poplatku v časti Moje rezervácie.`,
  },
  { q: 'Je v cene aj šatňa?', a: 'Áno, šatňa je súčasťou každej rezervácie. Číslo šatne nájdeš v potvrdení.' },
  { q: 'Môžem si rezervovať len polovicu plochy?', a: 'Áno. Polovica je ideálna na individuálny tréning, brankárov alebo korčuliarsku techniku.' },
  { q: 'Vystavíte faktúru na firmu alebo klub?', a: 'Áno. Kluby a firmy môžu platiť prevodom. Faktúru vystaví recepcia – stačí nám napísať fakturačné údaje.' },
];

export default async function HomePage() {
  const site = await getSite();
  const settings = await getBookingSettings();
  const p = settings.prices;
  const hours: number[] = [];
  for (let h = settings.openHour; h < settings.closeHour; h++) hours.push(h);
  const peakFromHour = settings.peakFromHour;
  const FAQ = faq(settings.cancelFreeHours);

  return (
    <>
      {/* ÚVOD */}
      <section className="hero">
        <span className="outline-word hero__word" aria-hidden="true">
          Ľad
        </span>
        <div className="hero__rink" aria-hidden="true">
          <div className="hero__rink-in">
            <RinkPerspective />
          </div>
        </div>
        <div className="hero__fade" aria-hidden="true" />

        <div className="wrap hero__grid">
          <div className="hero__copy">
            <span className="pill pill--start">
              <span className="live-dot" />
              {site.tagline}
            </span>
            <h1 className="display h1">
              Ľad, keď ho
              <br />
              potrebuješ
            </h1>
            <p className="lead">Vyber hodinu, zaplať online a potvrdenie s QR vstupom máš hneď v mobile.</p>
            <div className="hero__actions">
              <Link href="/rezervacia" className="btn btn--icon">
                Rezervovať ľad
                <span className="btn__ic">
                  <ArrowUpRight />
                </span>
              </Link>
              <Link href="/hala" className="btn btn--ghost">
                Pozrieť halu
              </Link>
            </div>
            <div className="hero__facts">
              <div>
                <div className="num">60</div>
                <small>minút najkratšia rezervácia</small>
              </div>
              <div className="sep" />
              <div>
                <div className="num">½</div>
                <small>aj polovica plochy</small>
              </div>
              <div className="sep" />
              <div>
                <div className="num">QR</div>
                <small>vstup do haly</small>
              </div>
            </div>
          </div>

          <BookingWidget days={nextDays(5)} hours={hours} prices={p} peakFromHour={peakFromHour} />
        </div>
      </section>

      {/* BENTO */}
      <section className="section">
        <div className="wrap section__in">
          <div className="section__head">
            <h2 className="display h2">
              Všetko pre
              <br />
              tvoj tréning
            </h2>
            <p className="muted">Jedna hala, ľad od 60 minút, šatne v cene. Rezervuješ online, na recepcii ukážeš QR.</p>
          </div>

          <div className="bento">
            <Link href="/hala" className="card b-7x2" style={{ background: 'radial-gradient(ellipse 80% 70% at 70% 30%, rgba(190,215,235,.12), rgba(190,215,235,0) 70%), linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.015))' }}>
              <span className="pill pill--start">Hokejová hala</span>
              <div style={{ width: '82%', alignSelf: 'center' }}>
                <RinkPlan />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
                <div>
                  <h3 className="display h3" style={{ fontSize: 54 }}>
                    Tréningový ľad
                  </h3>
                  <p>Šatne, brúsenie korčúľ, parkovanie</p>
                </div>
                <span className="round-arrow">
                  <ArrowUpRight size={20} />
                </span>
              </div>
            </Link>

            <Link href="/rezervacia?plocha=polovica" className="card b-5" style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
              <div style={{ width: '46%', flexShrink: 0 }}>
                <RinkPlan highlight="half" muted />
              </div>
              <div>
                <h3 className="display h3">Polovica plochy</h3>
                <p>Individuál, brankári, technika</p>
                <div style={{ marginTop: 10, fontWeight: 700 }}>{lowestPrice([p.half.offPeak, p.half.peak, p.half.weekend])} / hod</div>
              </div>
            </Link>

            <Link href="/pre-kluby" className="card card--red b-5">
              <span className="pill pill--start" style={{ position: 'relative', zIndex: 1 }}>
                Pre kluby
              </span>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <h3 className="display h3" style={{ fontSize: 46 }}>
                  Ľad na celú sezónu
                </h3>
                <p style={{ color: 'rgba(255,255,255,.85)' }}>Pevné časy, mesačná faktúra</p>
              </div>
            </Link>

            <div className="card b-4">
              <span className="icon-tile">
                <IconQr />
              </span>
              <div>
                <h3>QR vstup</h3>
                <p>Vstupenka v mobile, recepcia ju naskenuje.</p>
              </div>
            </div>
            <div className="card b-4">
              <span className="icon-tile">
                <IconCard />
              </span>
              <div>
                <h3>Platba online</h3>
                <p>Karta, Apple Pay, Google Pay alebo faktúra.</p>
              </div>
            </div>
            <div className="card b-4">
              <span className="icon-tile">
                <IconUndo />
              </span>
              <div>
                <h3>Zrušenie zadarmo</h3>
                <p>Do {settings.cancelFreeHours} hodín pred tréningom.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KROKY */}
      <section className="section section--tight">
        <div className="wrap section__in">
          <h2 className="display h2">
            Na ľade
            <br />
            za minútu
          </h2>
          <ol className="steps">
            <li>
              <span className="steps__n">1</span>
              <h3>Vyber hodinu</h3>
              <p>V kalendári vidíš voľný ľad na celý týždeň.</p>
            </li>
            <li>
              <span className="steps__n">2</span>
              <h3>Zaplať online</h3>
              <p>Termín ti podržíme 10 minút, kým dokončíš platbu.</p>
            </li>
            <li>
              <span className="steps__n">3</span>
              <h3>Ukáž QR a hraj</h3>
              <p>Šatňa je pripravená 30 minút pred začiatkom.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="section section--tight">
        <div className="wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: 56 }}>
          <h2 className="display h2" style={{ flex: '1 1 320px' }}>
            Časté
            <br />
            otázky
          </h2>
          <div className="faq" style={{ flex: '2 1 560px', minWidth: 0 }}>
            {FAQ.map((f, i) => (
              <details key={f.q} open={i === 0}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-band">
        <span className="outline-word cta-band__word" aria-hidden="true">
          Sezóna
        </span>
        <div className="wrap cta-band__in">
          <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 className="display h2" style={{ color: '#fff' }}>
              Pevný ľad
              <br />
              pre tvoj klub
            </h2>
            <p>Pošli dopyt a do 24 hodín máš ponuku s voľnými časmi a cenou.</p>
          </div>
          <Link href="/pre-kluby" className="btn btn--dark btn--icon">
            Poslať dopyt
            <span className="btn__ic">
              <ArrowUpRight />
            </span>
          </Link>
        </div>
      </section>
    </>
  );
}
