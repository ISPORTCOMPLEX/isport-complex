import { orTbd } from '@/lib/site';
import type { SiteFull } from '@/lib/siteSettings';
import { mapLinks } from '@/lib/maps';
import { LocationActions } from './LocationActions';
import { LocationMap } from './LocationMap';

// Sekcia „Kde nás nájdete“: karta s adresou, kontaktom, hodinami a navigáciou vľavo, mapa vpravo.
// Žiadne tlačidlo neleží na mape. Na úvode aj na stránke Kontakt.
export function LocationSection({ site, id = 'mapa', title = 'Príď na Juh', lead = 'Hokejová hala je pri Jarmočnej ulici v Košiciach – Juh, pár minút od centra.' }: { site: SiteFull; id?: string; title?: string; lead?: string }) {
  const map = mapLinks(site.hall);
  return (
    <section id={id} className="loc" aria-labelledby={`${id}-t`}>
      <div className="loc__wrap">
        <div className="loc__head">
          <div>
            <p className="loc__kick">Kde nás nájdete</p>
            <h2 id={`${id}-t`} className="cond loc__title">
              {title}
            </h2>
          </div>
          {lead ? <p className="loc__lead">{lead}</p> : null}
        </div>
        <div className="loc__grid">
          <div className="loc__card">
            <div>
              <p className="loc__lbl">Adresa haly</p>
              <p className="loc__addr">{orTbd(site.hall.street)}</p>
              <p className="loc__city">{site.hall.city}</p>
            </div>
            <dl className="loc__rows">
              <div>
                <dt>Recepcia</dt>
                <dd>{site.phone ? <a href={`tel:${site.phone.replace(/\s/g, '')}`}>{site.phone}</a> : 'Doplníme'}</dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>{site.email ? <a href={`mailto:${site.email}`}>{site.email}</a> : 'Doplníme'}</dd>
              </div>
              {site.hours.map((h) => (
                <div key={h.days}>
                  <dt>{h.days}</dt>
                  <dd>{orTbd(h.time)}</dd>
                </div>
              ))}
            </dl>
            <LocationActions links={map} address={map.address} />
          </div>
          <LocationMap embed={map.embed} address={map.address} />
        </div>
      </div>
    </section>
  );
}
