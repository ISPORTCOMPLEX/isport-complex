import type { Metadata } from 'next';
import { getSite } from '@/lib/siteSettings';
import { InquiryForm } from '@/components/InquiryForm';
import { createFormStamp } from '@/lib/formGuard';
import { RzBand } from '@/components/booking/RzBand';

export const metadata: Metadata = { title: 'Pre kluby', description: 'Sezónny prenájom ľadu pre hokejové kluby, školy a firmy v I-SPORT COMPLEX Košice.' };

const BENEFITS = [
  ['Pevný čas', 'Tvoje hodiny sú v kalendári zablokované na celú sezónu, nikto ti ich nevezme.'],
  ['Jedna faktúra', 'Mesačne na klub alebo školu, so splatnosťou. Žiadne platby za každú hodinu.'],
  ['Celý komplex', 'Šatne v cene, sprchy, bufet a skyboxy pre rodičov a fanúšikov.'],
];

export default async function PreKlubyPage() {
  const site = await getSite();
  return (
    <>
      <RzBand
        crumbs={[{ href: '/', label: 'Komplex' }, { label: 'Pre kluby' }]}
        title={
          <>
            Ľad pre
            <br />
            kluby
          </>
        }
        lead={<p>Pevné hodiny na celú sezónu, bloky na kempy a turnaje. Jedna zmluva a mesačná faktúra.</p>}
      />
      <section className="pp-dark">
        <div className="wrap">
          <div className="fx__grid">
            {BENEFITS.map(([title, text]) => (
              <div key={title}>
                <h2 className="cond">{title}</h2>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section id="dopyt" className="dk2 rz-dk">
        <div className="wrap v3-split">
          <div className="v3-col">
            <h2 className="cond pp__h">
              Dopyt na
              <br />
              prenájom
            </h2>
            <p className="pp__p">
              Napíš nám názov klubu, preferované dni a časy a od kedy chceš ľad. Najneskôr do 2 pracovných dní ti pošleme ponuku s voľnými časmi a cenou.
            </p>
            {site.phone || site.email ? (
              <dl className="vx__hours">
                {site.phone ? (
                  <div>
                    <dt>Telefón</dt>
                    <dd>
                      <a href={`tel:${site.phone.replace(/\s/g, '')}`}>{site.phone}</a>
                    </dd>
                  </div>
                ) : null}
                {site.email ? (
                  <div>
                    <dt>E-mail</dt>
                    <dd>
                      <a href={`mailto:${site.email}`}>{site.email}</a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </div>
          <div className="rz-card">
            <InquiryForm type="CLUB" stamp={createFormStamp()} />
          </div>
        </div>
      </section>
    </>
  );
}
