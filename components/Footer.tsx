import Link from 'next/link';
import { Logo } from './Logo';
import { orTbd } from '@/lib/site';
import { getSite } from '@/lib/siteSettings';

export async function Footer() {
  const site = await getSite();
  const c = site.company;
  return (
    <footer className="footer">
      <div className="wrap footer__in">
        <div className="footer__cols">
          <div className="footer__col footer__col--brand">
            <Logo />
            <p>{site.tagline}. Ľad si rezervuješ online.</p>
          </div>
          <div className="footer__col">
            <h2>Hokejová hala</h2>
            <span>
              {orTbd(site.hall.street)}, {site.hall.city}
            </span>
            {site.hall.mapUrl ? (
              <a href={site.hall.mapUrl} className="link-red" target="_blank" rel="noopener noreferrer">
                Navigovať
              </a>
            ) : (
              <Link href="/kontakt" className="link-red">
                Ako sa k nám dostanete
              </Link>
            )}
          </div>
          <div className="footer__col">
            <h2>Kontakt</h2>
            <span>{orTbd(site.phone)}</span>
            <span>{orTbd(site.email)}</span>
          </div>
          <div className="footer__col">
            <h2>Prevádzkovateľ</h2>
            <span style={{ fontWeight: 600 }}>{c.name}</span>
            <span>
              {c.street}, {c.city}
            </span>
            <span className="muted">
              IČO: {orTbd(c.ico)} · DIČ: {orTbd(c.dic)}
            </span>
          </div>
          <nav className="footer__col" aria-label="Odkazy v päte">
            <h2>Stránky</h2>
            <Link href="/rezervacia">Rezervácia ľadu</Link>
            <Link href="/cennik">Cenník</Link>
            <Link href="/pre-kluby">Pre kluby</Link>
          </nav>
        </div>
        <div className="outline-word footer__word" aria-hidden="true">
          {site.brand}
        </div>
        <div className="footer__bottom">
          <span>
            © {new Date().getFullYear()} {c.name}
          </span>
          <span className="footer__legal">
            <Link href="/obchodne-podmienky">Obchodné podmienky</Link>
            <Link href="/ochrana-osobnych-udajov">Ochrana osobných údajov</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
