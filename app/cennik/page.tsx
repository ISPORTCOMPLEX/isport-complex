import type { Metadata } from 'next';
import Link from 'next/link';
import { price } from '@/lib/site';
import { getBookingSettings } from '@/lib/booking/settings';
import { RzBand } from '@/components/booking/RzBand';
import { PartCta } from '@/components/PartPage';

export const metadata: Metadata = { title: 'Cenník', description: 'Cenník prenájmu ľadovej plochy v I-SPORT COMPLEX Košice. Šatňa v cene, sprchy za príplatok.' };

export default async function CennikPage() {
  const settings = await getBookingSettings();
  const p = settings.prices.full;
  const peak = `${String(settings.peakFromHour).padStart(2, '0')}:00`;
  return (
    <>
      <RzBand
        crumbs={[{ href: '/', label: 'Komplex' }, { label: 'Cenník' }]}
        title="Cenník"
        lead={
          <>
            <p>Ceny sú vrátane DPH. Prenajíma sa celá ľadová plocha, šatňa aj úprava ľadu sú v cene.</p>
            {settings.temporary ? <p className="rz-temp">Ceny sú zatiaľ orientačné.</p> : null}
          </>
        }
      />
      <section className="ice rz-ice">
        <div className="wrap u-col40">
          <div className="pt" role="table" aria-label="Ceny ľadovej plochy za hodinu">
            <div className="pt__row pt__row--head" role="row">
              <span role="columnheader">Ľadová plocha · 60 minút</span>
              <span role="columnheader">
                <strong>Mimo špičky</strong>
                <small>Po – Pi do {peak}</small>
              </span>
              <span role="columnheader">
                <strong>Špička</strong>
                <small>Po – Pi od {peak}</small>
              </span>
              <span role="columnheader">
                <strong>Víkend</strong>
                <small>So – Ne celý deň</small>
              </span>
            </div>
            <div className="pt__row" role="row">
              <span role="rowheader">
                <strong>Celá plocha</strong>
                <small>Úprava ľadu a šatňa v cene</small>
              </span>
              <span role="cell" className="cond">{price(p.offPeak)}</span>
              <span role="cell" className="cond pt__red">{price(p.peak)}</span>
              <span role="cell" className="cond pt__red">{price(p.weekend)}</span>
            </div>
          </div>

          <div className="pt-extras">
            <div>
              <span>Šatňa</span>
              <strong className="cond">v cene</strong>
              <small>ku každému prenájmu</small>
            </div>
            {settings.showersEnabled ? (
              <div>
                <span>Sprchy po tréningu</span>
                <strong className="cond">{price(settings.showerPrice)}</strong>
                <small>jednorazovo pre celý tím</small>
              </div>
            ) : null}
            <div>
              <span>Sezónny prenájom</span>
              <strong className="cond">ponuka</strong>
              <Link href="/pre-kluby" className="ulink u-fs14">
                Pre kluby
              </Link>
            </div>
          </div>
          <PartCta href="/rezervacia">Rezervovať ľad</PartCta>
        </div>
      </section>
      <section className="pp-dark">
        <div className="wrap pp__pair pp__pair--big">
          <div>
            <h2 className="cond pp__h2 u-mt0">
              Zrušenie
            </h2>
            <dl className="v3-rows">
              <div>
                <dt>Viac ako {settings.cancelFreeHours} hodín pred začiatkom</dt>
                <dd className="v3-ok">bez poplatku, online</dd>
              </div>
              <div>
                <dt>Neskôr</dt>
                <dd>len cez recepciu</dd>
              </div>
              <div>
                <dt>Presun na iný termín</dt>
                <dd>online, kým nie je zaplatené</dd>
              </div>
            </dl>
          </div>
          <div>
            <h2 className="cond pp__h2 u-mt0">
              Platba
            </h2>
            <dl className="v3-rows">
              <div>
                <dt>Na recepcii</dt>
                <dd>hotovosť alebo karta</dd>
              </div>
              <div>
                <dt>Bankový prevod</dt>
                <dd>údaje dostaneš v potvrdení</dd>
              </div>
              <div>
                <dt>Kluby</dt>
                <dd>mesačná faktúra</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}
