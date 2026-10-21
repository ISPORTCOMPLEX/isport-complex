import Link from 'next/link';
import { LogoLockup } from './Logo';
import { orTbd } from '@/lib/site';
import { getSite } from '@/lib/siteSettings';

export async function Footer() {
  const site = await getSite();
  const c = site.company;
  return (
    <footer className="ft">
      <div className="wrap ft__in">
        <div className="ft__cols">
          <div className="ft__brand">
            <LogoLockup height={58} />
            <p>
              {c.name}
              <br />
              {c.street}, {c.city}
            </p>
            {c.ico ? <p className="ft__muted">IČO {c.ico}{c.dic ? ` · DIČ ${c.dic}` : ''}</p> : null}
          </div>
          <nav className="ft__col" aria-label="Komplex">
            <h2>Komplex</h2>
            <Link href="/aktuality">Aktuality</Link>
            <Link href="/ladova-plocha">Ľadová plocha</Link>
            <Link href="/bufet-skyboxy">Bufet a skyboxy</Link>
            <Link href="/ihrisko">Futbalové ihrisko</Link>
            <Link href="/fitness-wellness">Fitness a wellness</Link>
          </nav>
          <nav className="ft__col" aria-label="Ľad">
            <h2>Ľad</h2>
            <Link href="/rezervacia">Rezervácia</Link>
            <Link href="/cennik">Cenník</Link>
            <Link href="/pre-kluby">Pre kluby</Link>
            <Link href="/ucet">Môj účet</Link>
          </nav>
          <div className="ft__col">
            <h2>Kontakt</h2>
            {site.phone ? <a href={`tel:${site.phone.replace(/\s/g, '')}`}>{site.phone}</a> : <span>{orTbd('')}</span>}
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
        {/* nápis sa vždy roztiahne presne na šírku päty – nikdy sa neoreže */}
        <div className="ft__word" aria-hidden="true">
          <svg viewBox="0 0 1000 136" focusable="false">
            <text x="2" y="128" textLength="996" lengthAdjust="spacingAndGlyphs">
              I-SPORT COMPLEX
            </text>
          </svg>
        </div>
        <div className="ft__bottom">
          <span>
            © {new Date().getFullYear()} {c.name}
          </span>
          <span className="ft__legal">
            <Link href="/obchodne-podmienky">Obchodné podmienky</Link>
            <Link href="/ochrana-osobnych-udajov">Ochrana osobných údajov</Link>
            <Link href="/vyhlasenie-o-pristupnosti">Prístupnosť</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
