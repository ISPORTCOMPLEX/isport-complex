import type { SiteFull } from '@/lib/siteSettings';
import { mapLinks } from '@/lib/maps';
import { LocationActions } from './LocationActions';
import { LocationMap } from './LocationMap';

// „Kde nás nájdeš“: info vľavo, štylizovaná tmavá mapa s červeným pinom vpravo. Google mapa sa načíta až po kliknutí.
// Chýbajúce údaje (telefón, e-mail, hodiny) sa nezobrazujú.
export function LocationSection({ site, id = 'mapa', title = 'Príď na Juh' }: { site: SiteFull; id?: string; title?: string; lead?: string }) {
  const map = mapLinks(site.hall);
  const rows = [
    site.phone ? { k: 'Recepcia', v: <a href={`tel:${site.phone.replace(/\s/g, '')}`}>{site.phone}</a> } : null,
    site.email ? { k: 'E-mail', v: <a href={`mailto:${site.email}`}>{site.email}</a> } : null,
    ...site.hours.filter((h) => h.time.trim()).map((h) => ({ k: h.days, v: <>{h.time}</> })),
  ].filter((r) => r !== null);
  return (
    <section id={id} className="wrap loc2" aria-labelledby={`${id}-t`}>
      <div className="loc2__box">
        <div className="loc2__info">
          <span className="eb eb--muted">Kde nás nájdeš</span>
          <h2 id={`${id}-t`} className="disp loc2__title">
            {title}
          </h2>
          <p className="loc2__addr">
            {site.hall.street}
            <br />
            {site.hall.city}
          </p>
          {rows.length ? (
            <dl className="loc2__rows">
              {rows.map((r) => (
                <div key={r.k}>
                  <dt>{r.k}</dt>
                  <dd>{r.v}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <LocationActions links={map} address={map.address} phone={site.phone} />
        </div>
        <LocationMap embed={map.embed} address={map.address} />
      </div>
    </section>
  );
}
