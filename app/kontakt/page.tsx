import type { Metadata } from 'next';
import { orTbd } from '@/lib/site';
import { getSite } from '@/lib/siteSettings';
import { InquiryForm } from '@/components/InquiryForm';
import { createFormStamp } from '@/lib/formGuard';
import { RzBand } from '@/components/booking/RzBand';
import { LocationSection } from '@/components/location/LocationSection';
import { Icon } from '@/components/Icon';

export const metadata: Metadata = { title: 'Kontakt', description: 'Kontakt, adresa a otváracie hodiny I-SPORT COMPLEX, Jarmočná 2627/10, Košice – Juh.' };

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
      <section className="dk2 rz-dk">
        <div className="wrap v3-split">
          <div className="v3-col">
            {site.phone || site.email ? (
              <div className="vx__two">
                {site.phone ? (
                  <div className="vx__item">
                    <span>
                      <Icon name="telefon" size={18} />
                      Telefón
                    </span>
                    <a href={`tel:${site.phone.replace(/\s/g, '')}`}>{site.phone}</a>
                  </div>
                ) : null}
                {site.email ? (
                  <div className="vx__item">
                    <span>
                      <Icon name="email" size={18} />
                      E-mail
                    </span>
                    <a href={`mailto:${site.email}`}>{site.email}</a>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="vx__item">
              <span>
                <Icon name="adresa" size={18} />
                Adresa
              </span>
              <strong>
                {orTbd(site.hall.street)}, {site.hall.city}
              </strong>
              <a href="#mapa" className="ulink u-mt8-15">
                Ukázať na mape
              </a>
            </div>
            {site.hours.some((h) => h.time.trim()) ? (
              <div>
                <h2 className="v3-label">Otváracie hodiny</h2>
                <dl className="vx__hours">
                  {site.hours
                    .filter((h) => h.time.trim())
                    .map((h) => (
                      <div key={h.days}>
                        <dt>{h.days}</dt>
                        <dd>{h.time}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            ) : null}
            <div>
              <h2 className="v3-label">Prevádzkovateľ</h2>
              <dl className="vx__hours">
                <div>
                  <dt>{c.name}</dt>
                  <dd>
                    {c.street}, {c.city}
                  </dd>
                </div>
                {c.ico ? (
                  <div>
                    <dt>IČO</dt>
                    <dd>{c.ico}</dd>
                  </div>
                ) : null}
                {c.dic ? (
                  <div>
                    <dt>DIČ</dt>
                    <dd>{c.dic}</dd>
                  </div>
                ) : null}
                {c.icDph ? (
                  <div>
                    <dt>IČ DPH</dt>
                    <dd>{c.icDph}</dd>
                  </div>
                ) : null}
              </dl>
              {c.register ? <p className="v3-small">{c.register}</p> : null}
            </div>
          </div>
          <div className="rz-card">
            <InquiryForm type="CONTACT" stamp={createFormStamp()} />
          </div>
        </div>
      </section>
      <LocationSection site={site} title="Ako sa k nám dostanete" lead="" />
    </>
  );
}
