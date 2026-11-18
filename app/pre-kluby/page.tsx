import type { Metadata } from 'next';
import { getSite } from '@/lib/siteSettings';
import { InquiryForm } from '@/components/InquiryForm';
import { createFormStamp } from '@/lib/formGuard';
import { RzBand } from '@/components/booking/RzBand';
import { AreaArt } from '@/components/home/AreaArt';
import { Faq } from '@/components/Faq';
import { getT } from '@/lib/i18n/server';
import { msg } from '@/lib/i18n/translate';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Pre kluby'), description: t('Sezónny prenájom ľadu pre hokejové kluby, školy a firmy v I-SPORT COMPLEX Košice.') };
}

const BENEFITS = [
  [msg('Pevný čas'), msg('Tvoje hodiny sú v kalendári zablokované na celú sezónu, nikto ti ich nevezme.')],
  [msg('Jedna faktúra'), msg('Mesačne na klub alebo školu, so splatnosťou. Žiadne platby za každú hodinu.')],
  [msg('Celý komplex'), msg('Šatne v cene, sprchy, bufet a skyboxy pre rodičov a fanúšikov.')],
];

export default async function PreKlubyPage() {
  const t = await getT();
  const site = await getSite();
  return (
    <>
      <RzBand
        art={<AreaArt zone="ice" />}
        crumbs={[{ href: '/', label: t('Komplex') }, { label: t('Pre kluby') }]}
        title={
          <>
            {t('Ľad pre')}
            <br />
            {t('kluby')}
          </>
        }
        lead={<p>{t('Pevné hodiny na celú sezónu, bloky na kempy a turnaje. Jedna zmluva a mesačná faktúra.')}</p>}
      />
      <section className="pp-dark">
        <div className="wrap">
          <div className="fx__grid">
            {BENEFITS.map(([title, text]) => (
              <div key={title}>
                <h2 className="cond">{t(title)}</h2>
                <p>{t(text)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section id="dopyt" className="dk2 rz-dk">
        <div className="wrap v3-split">
          <div className="v3-col">
            <h2 className="cond pp__h">
              {t('Dopyt na')}
              <br />
              {t('prenájom')}
            </h2>
            <p className="pp__p">
              {t('Napíš nám názov klubu, preferované dni a časy a od kedy chceš ľad. Najneskôr do 2 pracovných dní ti pošleme ponuku s voľnými časmi a cenou.')}
            </p>
            {site.phone || site.email ? (
              <dl className="vx__hours">
                {site.phone ? (
                  <div>
                    <dt>{t('Telefón')}</dt>
                    <dd>
                      <a href={`tel:${site.phone.replace(/\s/g, '')}`}>{site.phone}</a>
                    </dd>
                  </div>
                ) : null}
                {site.email ? (
                  <div>
                    <dt>{t('E-mail')}</dt>
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
      <Faq
        items={[
          [t('Ako rýchlo dostanem ponuku?'), t('Najneskôr do 2 pracovných dní ti pošleme ponuku s voľnými časmi a cenou.')],
          [t('Ako sa platí sezónny prenájom?'), t('Jednou mesačnou faktúrou na klub, školu alebo firmu, so splatnosťou. Žiadne platby za každú hodinu.')],
          [t('Dajú sa prenajať aj bloky na kemp alebo turnaj?'), t('Áno. Do dopytu napíš termíny a rozsah – pripravíme ponuku aj na jednorazové bloky.')],
          [t('Čo je v cene?'), t('Celá ľadová plocha, šatne a úprava ľadu pred každým blokom. Rodičia a fanúšikovia môžu sledovať tréning zo skyboxov, bufet je priamo v hale.')],
        ]}
      />
    </>
  );
}
