import Link from 'next/link';
import QRCode from 'qrcode';
import { getSite } from '@/lib/siteSettings';
import { appUrl } from '@/lib/requestInfo';
import { StoreBadge } from '@/components/StoreBadge';
import { OpenNow } from '@/components/OpenNow';
import { mapLinks } from '@/lib/maps';
import { ACTIVE_LOCALES, getLocale } from '@/lib/i18n/server';
import { LOCALE_NAMES } from '@/lib/i18n/config';
import { getT } from '@/lib/i18n/server';
import { msg } from '@/lib/i18n/translate';

const LAD: [string, string][] = [
  ['/rezervacia', msg('Rezervácia')],
  ['/cennik', msg('Cenník a storno')],
  ['/pre-kluby', msg('Pre kluby')],
  ['/ucet', msg('Môj účet')],
];
const KOMPLEX: [string, string][] = [
  ['/aktuality', 'Novinky'],
  ['/bufet-skyboxy', msg('Bufet a skyboxy')],
  ['/ihrisko', msg('Futbalové ihrisko')],
  ['/fitness-wellness', msg('Fitness a wellness')],
  ['/fotky', 'Fotky'],
];

// Päta: logo so sloganom, odkazy, kontakt s otváracími hodinami a právne odkazy.
// Na mobile je kontakt hore ako karta (Zavolať, Navigovať, hodiny) a odkazy v rozbaľovacích skupinách.
// Chýbajúce údaje (telefón, e-mail, IČO) sa nezobrazujú.
export async function Footer() {
  const tr = await getT();
  const [site, locale] = await Promise.all([getSite(), getLocale()]);
  const c = site.company;
  const { ios, android } = site.apps;
  // blok s aplikáciou len ak je aspoň jeden odkaz do obchodu
  const hours = site.hours.filter((h) => h.time.trim());
  const links = mapLinks(site.hall);
  const social =
    site.social.facebook || site.social.instagram ? (
      <>
        {site.social.facebook ? (
          <a href={site.social.facebook} target="_blank" rel="noopener noreferrer">
            {tr('Facebook')}<span className="sr-only"> {' '}{tr('(otvorí sa v novom okne)')}</span>
          </a>
        ) : null}
        {site.social.instagram ? (
          <a href={site.social.instagram} target="_blank" rel="noopener noreferrer">
            {tr('Instagram')}<span className="sr-only"> {' '}{tr('(otvorí sa v novom okne)')}</span>
          </a>
        ) : null}
      </>
    ) : null;
  const appQr = ios || android ? await QRCode.toDataURL(`${appUrl() ?? ''}/aplikacia`, { margin: 1, width: 220, color: { dark: '#0A0E14', light: '#F4F6F8' } }).catch(() => null) : null;
  return (
    <footer className="ft2">
      <div className="ft2__line" aria-hidden="true" />
      <div className="wrap ft2__in">
        <div className="ft2__top">
          <Link href="/" className="ft2__logo" aria-label={tr('I-SPORT COMPLEX, domov')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-slogan-na-tmave.svg" alt={tr('I-SPORT COMPLEX – šport, zábava, komunita')} width={260} height={196} />
          </Link>
          <div className="ft2__cols">
            <nav aria-label={tr('Ľad')} className="ft2__col">
              <h2 className="wide-display">{tr('Ľad')}</h2>
              {LAD.map(([h, t]) => (
                <Link key={h} href={h}>
                  {tr(t)}
                </Link>
              ))}
            </nav>
            <nav aria-label={tr('Komplex')} className="ft2__col">
              <h2 className="wide-display">{tr('Komplex')}</h2>
              {KOMPLEX.map(([h, t]) => (
                <Link key={h} href={h}>
                  {tr(t)}
                </Link>
              ))}
            </nav>
            <div className="ft2__col ft2__contact">
              <h2 className="wide-display">{tr('Kontakt')}</h2>
              <span className="ft2__addr">
                {site.hall.street}
                <br />
                {site.hall.city}
              </span>
              {site.phone ? <a href={`tel:${site.phone.replace(/\s/g, '')}`}>{site.phone}</a> : null}
              {site.email ? <a href={`mailto:${site.email}`}>{site.email}</a> : null}
              {hours.length ? (
                <dl className="ft2__hours">
                  {hours.map((h) => (
                    <div key={h.days}>
                      <dt>{tr(h.days)}</dt>
                      <dd>{h.time}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              <OpenNow hours={site.hours} />
              <Link href="/kontakt">{tr('Napísať nám')}</Link>
              {social}
            </div>
          </div>
        </div>
        {/* mobil: kontakt hore ako karta, odkazy v rozbaľovacích skupinách */}
        <div className="ft2__m">
          <div className="ft2__card">
            <h2 className="wide-display">{tr('Kontakt')}</h2>
            <p className="ft2__maddr">
              {site.hall.street}
              <br />
              {site.hall.city}
            </p>
            <div className="ft2__mbtns">
              {site.phone ? (
                <a href={`tel:${site.phone.replace(/\s/g, '')}`} className="sbtn sbtn--md">
                  {tr('Zavolať')}
                </a>
              ) : null}
              <a href={links.directions} target="_blank" rel="noopener noreferrer" className={`sbtn sbtn--md${site.phone ? ' sbtn--ghost' : ''}`}>
                {tr('Navigovať')}<span className="sr-only"> {' '}{tr('(otvorí sa v novom okne)')}</span>
              </a>
            </div>
            {site.email ? (
              <a href={`mailto:${site.email}`} className="ft2__mail">
                {site.email}
              </a>
            ) : null}
            {hours.length ? (
              <dl className="ft2__hours">
                {hours.map((h) => (
                  <div key={h.days}>
                    <dt>{tr(h.days)}</dt>
                    <dd>{h.time}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <OpenNow hours={site.hours} />
          </div>
          <details className="ft2__acc">
            <summary>{tr('Ľad')}</summary>
            {LAD.map(([h, t]) => (
              <Link key={h} href={h}>
                {tr(t)}
              </Link>
            ))}
          </details>
          <details className="ft2__acc">
            <summary>{tr('Komplex')}</summary>
            {KOMPLEX.map(([h, t]) => (
              <Link key={h} href={h}>
                {tr(t)}
              </Link>
            ))}
          </details>
          <details className="ft2__acc">
            <summary>{tr('Kontakt a správa')}</summary>
            <Link href="/kontakt">{tr('Napísať nám')}</Link>
            <Link href="/ucet">{tr('Môj účet')}</Link>
          </details>
          {social ? <div className="ft2__soc">{social}</div> : null}
        </div>
        {ios || android ? (
          <section className="app2" aria-labelledby="app2-t">
            <div className="app2__ph" aria-hidden="true">
              <div className="app2__dev">
                <div className="app2__scr">
                  <span className="app2__bar">I-SPORT</span>
                  <span className="app2__t">{tr('Tvoj ľad')}</span>
                  <span className="app2__r">{tr('vstupenka v mobile')}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {appQr ? <img src={appQr} alt="" width={110} height={110} className="app2__q" /> : null}
                </div>
              </div>
            </div>
            <div className="app2__tx">
              <h2 id="app2-t" className="app2__h">
                {tr('I-SPORT v mobile')}
              </h2>
              <p>{tr('Rezervácia ľadu na pár ťuknutí, vstupenka s QR kódom aj bez signálu a upozornenie pred tréningom.')}</p>
            </div>
            <div className="app2__side">
              <div className="app2__badges">
                {ios ? <StoreBadge kind="ios" href={ios} /> : null}
                {android ? <StoreBadge kind="android" href={android} /> : null}
              </div>
              {appQr ? (
                <div className="app2__qr">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={appQr} alt={tr('QR kód na stiahnutie aplikácie')} width={96} height={96} />
                  <span>
                    {tr('Naskenuj')}
                    <br />
                    {tr('mobilom')}
                  </span>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
        <div className="ft2__kick" aria-hidden="true" />
        <div className="ft2__bottom">
          <span>
            © {new Date().getFullYear()} {c.name}
            {c.street ? ` · ${c.street}, ${c.city.replace(/\s*–.*$/, '')}` : ''}
            {c.ico ? ` · ${tr('IČO')} ${c.ico}` : ''}
            {c.dic ? ` · ${tr('DIČ')} ${c.dic}` : ''}
          </span>
          <span className="ft2__legal">
            <Link href="/obchodne-podmienky">{tr('Obchodné podmienky')}</Link>
            <Link href="/ochrana-osobnych-udajov">{tr('Ochrana osobných údajov')}</Link>
            <Link href="/vyhlasenie-o-pristupnosti">{tr('Prístupnosť')}</Link>
          </span>
{ACTIVE_LOCALES.length > 1 ? (
          <nav className="ft2__lang" aria-label={tr('Jazyk webu')}>
            {ACTIVE_LOCALES.map((l) => (
              <a key={l} href={`?lang=${l}`} hrefLang={l} lang={l} rel="nofollow" aria-current={l === locale ? 'true' : undefined}>
                {LOCALE_NAMES[l]}
              </a>
            ))}
          </nav>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
