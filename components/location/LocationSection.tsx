import type { SiteFull } from '@/lib/siteSettings';
import { mapLinks } from '@/lib/maps';
import { LocationActions } from './LocationActions';
import { LocationMap } from './LocationMap';
import { OpenNow } from '@/components/OpenNow';
import { getT } from '@/lib/i18n/server';

// „Kde nás nájdeš“: info vľavo, štylizovaná tmavá mapa s červeným pinom vpravo. Google mapa sa načíta až po kliknutí.
// Chýbajúce údaje (telefón, e-mail, hodiny) sa nezobrazujú.
export async function LocationSection({ site, id = 'mapa', title }: { site: SiteFull; id?: string; title?: string; lead?: string }) {
  const t = await getT();
  const map = mapLinks(site.hall);
  const rows = [
    site.phone ? { k: t('Recepcia'), v: <a href={`tel:${site.phone.replace(/\s/g, '')}`}>{site.phone}</a> } : null,
    site.email ? { k: t('E-mail'), v: <a href={`mailto:${site.email}`}>{site.email}</a> } : null,
    ...site.hours.filter((h) => h.time.trim()).map((h) => ({ k: t(h.days), v: <>{h.time}</> })),
  ].filter((r) => r !== null);
  return (
    <section id={id} className="lite loc3" aria-labelledby={`${id}-t`}>
      <div className="wrap loc2">
      <div className="shd">
        <h2 id={`${id}-t`} className="disp shd__t">
          {title ?? t('Príď na Juh')}
        </h2>
        <span className="shd__line" aria-hidden="true" />
      </div>
      <div className="loc2__box">
        <div className="loc2__info">
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
          <OpenNow hours={site.hours} className="loc2__open" />
          <LocationActions links={map} address={map.address} phone={site.phone} />
        </div>
        <LocationMap embed={map.embed} address={map.address} />
      </div>
      </div>
    </section>
  );
}
