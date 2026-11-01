import Link from 'next/link';
import QRCode from 'qrcode';
import { getSite } from '@/lib/siteSettings';
import { appUrl } from '@/lib/requestInfo';
import { StoreBadge } from '@/components/StoreBadge';

// Päta: logo so sloganom, tri stĺpce odkazov, obrovský obrysový nápis a právne odkazy.
// Chýbajúce údaje (telefón, e-mail, IČO) sa nezobrazujú.
export async function Footer() {
  const site = await getSite();
  const c = site.company;
  const { ios, android } = site.apps;
  // blok s aplikáciou len ak je aspoň jeden odkaz do obchodu
  const appQr = ios || android ? await QRCode.toDataURL(`${appUrl() ?? ''}/aplikacia`, { margin: 1, width: 220, color: { dark: '#0A0E14', light: '#F4F6F8' } }).catch(() => null) : null;
  return (
    <footer className="ft2">
      <div className="ft2__line" aria-hidden="true" />
      <div className="wrap ft2__in">
        <div className="ft2__top">
          <Link href="/" className="ft2__logo" aria-label="I-SPORT COMPLEX, domov">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-slogan-na-tmave.svg" alt="I-SPORT COMPLEX – šport, zábava, komunita" width={260} height={196} />
          </Link>
          <div className="ft2__cols">
            <nav aria-label="Ľad" className="ft2__col">
              <h2 className="wide-display">Ľad</h2>
              <Link href="/rezervacia">Rezervácia</Link>
              <Link href="/cennik">Cenník a storno</Link>
              <Link href="/pre-kluby">Pre kluby</Link>
              <Link href="/ucet">Môj účet</Link>
            </nav>
            <nav aria-label="Komplex" className="ft2__col">
              <h2 className="wide-display">Komplex</h2>
              <Link href="/aktuality">Novinky</Link>
              <Link href="/bufet-skyboxy">Bufet a skyboxy</Link>
              <Link href="/ihrisko">Futbalové ihrisko</Link>
              <Link href="/fitness-wellness">Fitness a wellness</Link>
            </nav>
            <div className="ft2__col">
              <h2 className="wide-display">Kontakt</h2>
              <span className="ft2__addr">
                {site.hall.street}
                <br />
                {site.hall.city}
              </span>
              {site.phone ? <a href={`tel:${site.phone.replace(/\s/g, '')}`}>{site.phone}</a> : null}
              {site.email ? <a href={`mailto:${site.email}`}>{site.email}</a> : null}
              <Link href="/kontakt">Napísať nám</Link>
              {site.social.facebook ? (
                <a href={site.social.facebook} target="_blank" rel="noopener noreferrer">
                  Facebook<span className="sr-only"> (otvorí sa v novom okne)</span>
                </a>
              ) : null}
              {site.social.instagram ? (
                <a href={site.social.instagram} target="_blank" rel="noopener noreferrer">
                  Instagram<span className="sr-only"> (otvorí sa v novom okne)</span>
                </a>
              ) : null}
            </div>
          </div>
        </div>
        {ios || android ? (
          <section className="app2" aria-labelledby="app2-t">
            <div className="app2__ph" aria-hidden="true">
              <div className="app2__dev">
                <div className="app2__scr">
                  <span className="app2__bar">I-SPORT</span>
                  <span className="app2__t">Tvoj ľad</span>
                  <span className="app2__r">vstupenka v mobile</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {appQr ? <img src={appQr} alt="" width={110} height={110} className="app2__q" /> : null}
                </div>
              </div>
            </div>
            <div className="app2__tx">
              <h2 id="app2-t" className="app2__h">
                I-SPORT v mobile
              </h2>
              <p>Rezervácia ľadu na pár ťuknutí, vstupenka s QR kódom aj bez signálu a upozornenie pred tréningom.</p>
            </div>
            <div className="app2__side">
              <div className="app2__badges">
                {ios ? <StoreBadge kind="ios" href={ios} /> : null}
                {android ? <StoreBadge kind="android" href={android} /> : null}
              </div>
              {appQr ? (
                <div className="app2__qr">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={appQr} alt="QR kód na stiahnutie aplikácie" width={96} height={96} />
                  <span>
                    Naskenuj
                    <br />
                    mobilom
                  </span>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
        {/* nápis sa vždy roztiahne presne na šírku päty – nikdy sa neoreže */}
        <div className="ft2__word" aria-hidden="true">
          <svg viewBox="0 0 1000 120" focusable="false">
            <text x="4" y="108" textLength="992" lengthAdjust="spacingAndGlyphs">
              I-SPORT COMPLEX
            </text>
          </svg>
        </div>
        <div className="ft2__bottom">
          <span>
            © {new Date().getFullYear()} {c.name}
            {c.street ? ` · ${c.street}, ${c.city.replace(/\s*–.*$/, '')}` : ''}
            {c.ico ? ` · IČO ${c.ico}` : ''}
            {c.dic ? ` · DIČ ${c.dic}` : ''}
          </span>
          <span className="ft2__legal">
            <Link href="/obchodne-podmienky">Obchodné podmienky</Link>
            <Link href="/ochrana-osobnych-udajov">Ochrana osobných údajov</Link>
            <Link href="/vyhlasenie-o-pristupnosti">Prístupnosť</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
