import type { Metadata } from 'next';
import Link from 'next/link';
import { PartCta, PartGallery, PartPage } from '@/components/PartPage';
import { RinkPlan } from '@/components/Rink';
import { getBookingSettings } from '@/lib/booking/settings';

export const metadata: Metadata = { title: 'Ľadová plocha', description: 'Prenájom celej tréningovej ľadovej plochy v I-SPORT COMPLEX Košice. Rezervácia online, šatňa v cene, sprchy za príplatok.' };

const eur = (v: number) => `${v.toLocaleString('sk-SK')} €`;

const STEPS = [
  ['Rezervuj online', 'Vyber deň, čas a či chceš sprchy. Potvrdenie s QR kódom máš hneď v telefóne.'],
  ['Príď 30 minút vopred', 'Na recepcii ukáž QR kód, šatňa je pripravená.'],
  ['Na ľad po úprave', 'Na plochu vstupuješ presne v čase rezervácie.'],
  ['Uvoľni šatňu', 'Najneskôr 30 minút po skončení tréningu.'],
];

export default async function LadovaPlochaPage() {
  const s = await getBookingSettings();
  const p = s.prices.full;
  const peak = `${String(s.peakFromHour).padStart(2, '0')}:00`;
  return (
    <PartPage
      crumb="Ľadová plocha"
      title={
        <>
          Ľadová
          <br />
          plocha
        </>
      }
      lead="Tréningová hokejová plocha na prenájom pre kluby, školy, firmy aj partie. Prenajíma sa celá plocha, šatňa je v cene, sprchy za príplatok."
    >
      <section className="ice ix pp-ice">
        <div className="ix__lines" aria-hidden="true">
          <i className="ix__blue" />
        </div>
        <div className="wrap pp__grid">
          <div className="pp__copy">
            <h2 className="cond pp__h">Cenník</h2>
            <dl className="ix__prices">
              <div>
                <dt>Po – Pi do {peak}</dt>
                <dd className="cond">{eur(p.offPeak)}</dd>
                <dd>za hodinu</dd>
              </div>
              <div>
                <dt>Po – Pi od {peak}</dt>
                <dd className="cond">{eur(p.peak)}</dd>
                <dd>za hodinu</dd>
              </div>
              <div>
                <dt>Víkend</dt>
                <dd className="cond">{eur(p.weekend)}</dd>
                <dd>za hodinu</dd>
              </div>
            </dl>
            {s.showersEnabled ? (
              <p className="pp__p">
                <strong>Sprchy:</strong> {eur(s.showerPrice)} jednorazovo pre celý tím. Šatňa a úprava ľadu sú v cene.
              </p>
            ) : (
              <p className="pp__p">Úprava ľadu je v cene.</p>
            )}
            <div className="pp__links">
              <PartCta href="/rezervacia">Rezervovať ľad</PartCta>
              <Link href="/cennik" className="ulink">
                Cenník a storno podmienky
              </Link>
              <Link href="/pre-kluby" className="ulink">
                Sezónny prenájom pre kluby
              </Link>
            </div>
          </div>
          <div className="pp__rink">
            <RinkPlan highlight="full" />
          </div>
        </div>
        <div className="wrap">
          <PartGallery slot="ladova-plocha" />
        </div>
      </section>

      <section className="bx">
        <div className="wrap">
          <div className="bx__head">
            <h2 className="cond bx__title">
              Ako to
              <br />
              prebieha
            </h2>
            <p>Od rezervácie po ľad v štyroch krokoch. Bezplatne zrušíš najneskôr {s.cancelFreeHours} hodín vopred.</p>
          </div>
          <ol className="pp__steps">
            {STEPS.map(([t, d], i) => (
              <li key={t}>
                <span className="cond">{i + 1}</span>
                <strong>{t}</strong>
                <p>{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </PartPage>
  );
}
