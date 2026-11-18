import type { Metadata } from 'next';
import Link from 'next/link';
import { price } from '@/lib/site';
import { getBookingSettings } from '@/lib/booking/settings';
import { RzBand } from '@/components/booking/RzBand';
import { PartCta } from '@/components/PartPage';
import { AreaArt } from '@/components/home/AreaArt';
import { Faq } from '@/components/Faq';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Cenník'), description: t('Cenník prenájmu ľadovej plochy v I-SPORT COMPLEX Košice. Šatňa v cene, sprchy za príplatok.') };
}

export default async function CennikPage() {
  const t = await getT();
  const settings = await getBookingSettings();
  const p = settings.prices.full;
  const peak = `${String(settings.peakFromHour).padStart(2, '0')}:00`;
  return (
    <>
      <RzBand
        art={<AreaArt zone="ice" />}
        crumbs={[{ href: '/', label: t('Komplex') }, { label: t('Cenník') }]}
        title={t('Cenník')}
        lead={
          <>
            <p>{t('Ceny sú vrátane DPH. Prenajíma sa celá ľadová plocha, šatňa aj úprava ľadu sú v cene.')}</p>
            {settings.temporary ? <p className="rz-note">{t('Pre tvoju rezerváciu vždy platí cena uvedená v potvrdení.')}</p> : null}
          </>
        }
      />
      <section className="dk2 rz-dk">
        <div className="wrap u-col40">
          <div className="pt" role="table" aria-label={t('Ceny ľadovej plochy za hodinu')}>
            <div className="pt__row pt__row--head" role="row">
              <span role="columnheader">{t('Ľadová plocha · 60 minút')}</span>
              <span role="columnheader">
                <strong>{t('Mimo špičky')}</strong>
                <small>{t('Po – Pi do {peak}', { peak })}</small>
              </span>
              <span role="columnheader">
                <strong>{t('Špička')}</strong>
                <small>{t('Po – Pi od {peak}', { peak })}</small>
              </span>
              <span role="columnheader">
                <strong>{t('Víkend')}</strong>
                <small>{t('So – Ne celý deň')}</small>
              </span>
            </div>
            <div className="pt__row" role="row">
              <span role="rowheader">
                <strong>{t('Celá plocha')}</strong>
                <small>{t('Úprava ľadu a šatňa v cene')}</small>
              </span>
              <span role="cell" className="cond">{price(p.offPeak)}</span>
              <span role="cell" className="cond pt__red">{price(p.peak)}</span>
              <span role="cell" className="cond pt__red">{price(p.weekend)}</span>
            </div>
          </div>

          <div className="pt-extras">
            <div>
              <span>{t('Šatňa')}</span>
              <strong className="cond">{t('v cene')}</strong>
              <small>{t('ku každému prenájmu')}</small>
            </div>
            {settings.showersEnabled ? (
              <div>
                <span>{t('Sprchy po tréningu')}</span>
                <strong className="cond">{price(settings.showerPrice)}</strong>
                <small>{t('jednorazovo pre celý tím')}</small>
              </div>
            ) : null}
            <div>
              <span>{t('Sezónny prenájom')}</span>
              <strong className="cond">{t('ponuka')}</strong>
              <Link href="/pre-kluby" className="ulink u-fs14">
                {t('Pre kluby')}
              </Link>
            </div>
          </div>
          <PartCta href="/rezervacia">{t('Rezervovať ľad')}</PartCta>
        </div>
      </section>
      <section className="pp-dark">
        <div className="wrap pp__pair pp__pair--big">
          <div>
            <h2 className="cond pp__h2 u-mt0">
              {t('Zrušenie')}
            </h2>
            <dl className="v3-rows">
              <div>
                <dt>{t('Viac ako {cancelFreeHours} hodín pred začiatkom', { cancelFreeHours: settings.cancelFreeHours })} </dt>
                <dd className="v3-ok">{t('bez poplatku, online')}</dd>
              </div>
              <div>
                <dt>{t('Neskôr')}</dt>
                <dd>{t('len cez recepciu')}</dd>
              </div>
              <div>
                <dt>{t('Presun na iný termín')}</dt>
                <dd>{t('online, kým nie je zaplatené')}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h2 className="cond pp__h2 u-mt0">
              {t('Platba')}
            </h2>
            <dl className="v3-rows">
              <div>
                <dt>{t('Na recepcii')}</dt>
                <dd>{t('hotovosť alebo karta')}</dd>
              </div>
              <div>
                <dt>{t('Bankový prevod')}</dt>
                <dd>{t('údaje dostaneš v potvrdení')}</dd>
              </div>
              <div>
                <dt>{t('Kluby')}</dt>
                <dd>{t('mesačná faktúra')}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
      <Faq
        items={[
          [t('Dokedy môžem rezerváciu zrušiť zadarmo?'), t('Online a bez poplatku najneskôr {cancelFreeHours} hodín pred začiatkom. Neskôr už len cez recepciu.', { cancelFreeHours: settings.cancelFreeHours })],
          [t('Ako zaplatím?'), t('Na recepcii v hotovosti alebo kartou, prípadne bankovým prevodom – údaje dostaneš v potvrdení. Kluby platia mesačnou faktúrou.')],
          [t('Je šatňa v cene?'), t('Áno. Šatňa aj úprava ľadu sú v cene každého prenájmu.')],
          ...(settings.showersEnabled ? ([[t('Koľko stoja sprchy?'), t('{showerPrice} € jednorazovo pre celý tím – zaškrtneš ich pri rezervácii.', { showerPrice: settings.showerPrice })]] as [string, string][]) : []),
          [t('Kedy mám prísť?'), t('30 minút pred začiatkom. Na recepcii ukážeš QR kód z potvrdenia a šatňa je pripravená. Uvoľniť ju treba do 30 minút po tréningu.')],
          [t('Platí cena z webu?'), t('Áno, pre tvoju rezerváciu vždy platí cena uvedená v potvrdení, ktoré dostaneš e-mailom aj v účte.')],
        ]}
      />
    </>
  );
}
