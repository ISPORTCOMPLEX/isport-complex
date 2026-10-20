import type { Metadata } from 'next';
import { orTbd } from '@/lib/site';
import { getSite } from '@/lib/siteSettings';
import { InquiryForm } from '@/components/InquiryForm';
import { createFormStamp } from '@/lib/formGuard';
import { RzBand } from '@/components/booking/RzBand';

export const metadata: Metadata = { title: 'Kontakt', description: 'Kontakt, adresa a otváracie hodiny I-SPORT COMPLEX, Fejova 1527/2, Košice.' };

export default async function KontaktPage() {
  const site = await getSite();
  const c = site.company;
  return (
    <>
      <RzBand
        crumbs={[{ href: '/', label: 'Komplex' }, { label: 'Kontakt' }]}
        title="Kontakt"
        lead={
          <p>
            {orTbd(site.hall.street)}, {site.hall.city}. Napíš nám, zavolaj alebo sa zastav na recepcii.
          </p>
        }
      />
      <section className="ice rz-ice">
        <div className="wrap v3-split">
          <div className="v3-col">
            <div className="vx__two">
              <div className="vx__item">
                <span>Telefón</span>
                {site.phone ? <a href={`tel:${site.phone.replace(/\s/g, '')}`}>{site.phone}</a> : <strong className="tbd">Doplníme</strong>}
              </div>
              <div className="vx__item">
                <span>E-mail</span>
                {site.email ? <a href={`mailto:${site.email}`}>{site.email}</a> : <strong className="tbd">Doplníme</strong>}
              </div>
            </div>
            <div className="vx__item">
              <span>Adresa</span>
              <strong>
                {orTbd(site.hall.street)}, {site.hall.city}
              </strong>
              {site.hall.mapUrl ? (
                <a href={site.hall.mapUrl} className="ulink u-mt8-15" rel="noopener noreferrer" target="_blank">
                  Navigovať<span className="sr-only"> (otvorí sa v novom okne)</span>
                </a>
              ) : null}
            </div>
            <div>
              <h2 className="v3-label">Otváracie hodiny</h2>
              <dl className="vx__hours">
                {site.hours.map((h) => (
                  <div key={h.days}>
                    <dt>{h.days}</dt>
                    <dd>{orTbd(h.time)}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <h2 className="v3-label">Prevádzkovateľ</h2>
              <dl className="vx__hours">
                <div>
                  <dt>{c.name}</dt>
                  <dd>
                    {c.street}, {c.city}
                  </dd>
                </div>
                <div>
                  <dt>IČO</dt>
                  <dd>{orTbd(c.ico)}</dd>
                </div>
                <div>
                  <dt>DIČ</dt>
                  <dd>{orTbd(c.dic)}</dd>
                </div>
                <div>
                  <dt>IČ DPH</dt>
                  <dd>{orTbd(c.icDph)}</dd>
                </div>
              </dl>
              {c.register ? <p className="v3-small">{c.register}</p> : null}
            </div>
          </div>
          <div className="rz-card">
            <InquiryForm type="CONTACT" stamp={createFormStamp()} />
          </div>
        </div>
      </section>
    </>
  );
}
