import type { Metadata } from 'next';
import Link from 'next/link';
import { PartCta, PartGallery, PartPage, PartPhoto } from '@/components/PartPage';
import { getBookingSettings } from '@/lib/booking/settings';
import { getT } from '@/lib/i18n/server';
import { msg } from '@/lib/i18n/translate';

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr('Ľadová plocha'), description: tr('Prenájom celej tréningovej ľadovej plochy v I-SPORT COMPLEX Košice. Rezervácia online, šatňa v cene, sprchy za príplatok.') };
}

const eur = (v: number) => `${v.toLocaleString('sk-SK')} €`;

const STEPS = [
  [msg('Rezervuj online'), msg('Vyber deň, čas a či chceš sprchy. Potvrdenie s QR kódom máš hneď v telefóne.')],
  [msg('Príď 30 minút vopred'), msg('Na recepcii ukáž QR kód, šatňa je pripravená.')],
  [msg('Na ľad po úprave'), msg('Na plochu vstupuješ presne v čase rezervácie.')],
  [msg('Uvoľni šatňu'), msg('Najneskôr 30 minút po skončení tréningu.')],
];

export default async function LadovaPlochaPage() {
  const tr = await getT();
  const s = await getBookingSettings();
  const p = s.prices.full;
  const peak = `${String(s.peakFromHour).padStart(2, '0')}:00`;
  return (
    <PartPage
      zone="ice"
      crumb={tr('Ľadová plocha')}
      title={
        <>
          {tr('Ľadová')}
          <br />
          {tr('plocha')}
        </>
      }
      lead={tr('Tréningová hokejová plocha na prenájom pre kluby, školy, firmy aj partie. Prenajíma sa celá plocha, šatňa je v cene, sprchy za príplatok.')}
    >
      <section className="pp-dark pp-ice2">
        <div className="wrap pp__grid">
          <div className="pp__copy">
            <h2 className="cond pp__h">{tr('Cenník')}</h2>
            <dl className="ix__prices">
              <div>
                <dt>{tr('Po – Pi do {peak}', { peak })}</dt>
                <dd className="cond">{eur(p.offPeak)}</dd>
                <dd>{tr('za hodinu')}</dd>
              </div>
              <div>
                <dt>{tr('Po – Pi od {peak}', { peak })}</dt>
                <dd className="cond">{eur(p.peak)}</dd>
                <dd>{tr('za hodinu')}</dd>
              </div>
              <div>
                <dt>{tr('Víkend')}</dt>
                <dd className="cond">{eur(p.weekend)}</dd>
                <dd>{tr('za hodinu')}</dd>
              </div>
            </dl>
            {s.showersEnabled ? (
              <p className="pp__p">
                <strong>{tr('Sprchy:')}</strong> {' '}{tr('{eur} jednorazovo pre celý tím. Šatňa a úprava ľadu sú v cene.', { eur: eur(s.showerPrice) })} 
              </p>
            ) : (
              <p className="pp__p">{tr('Úprava ľadu je v cene.')}</p>
            )}
            <div className="pp__links">
              <PartCta href="/rezervacia">{tr('Rezervovať ľad')}</PartCta>
              <Link href="/cennik" className="ulink">
                {tr('Cenník a storno podmienky')}
              </Link>
              <Link href="/pre-kluby" className="ulink">
                {tr('Sezónny prenájom pre kluby')}
              </Link>
            </div>
          </div>
          <div className="pp__side">
            <PartPhoto label={tr('Ľadová plocha I-SPORT COMPLEX')} slot="ladova-plocha" />
            <ul className="pp__incl" aria-label={tr('V cene prenájmu')}>
              <li>{tr('Celá plocha len pre tvoj tím')}</li>
              <li>{tr('Šatňa v cene')}</li>
              <li>{tr('Úprava ľadu pred každým blokom')}</li>
              <li>{tr('Potvrdenie s QR kódom v mobile')}</li>
            </ul>
          </div>
        </div>
        <div className="wrap">
          <PartGallery skip={1} slot="ladova-plocha" />
        </div>
      </section>

      <section className="bx">
        <div className="wrap">
          <div className="bx__head">
            <h2 className="cond bx__title">
              {tr('Ako to')}
              <br />
              {tr('prebieha')}
            </h2>
            <p>{tr('Od rezervácie po ľad v štyroch krokoch. Bezplatne zrušíš najneskôr {cancelFreeHours} hodín vopred.', { cancelFreeHours: s.cancelFreeHours })} </p>
          </div>
          <ol className="pp__steps">
            {STEPS.map(([t, d], i) => (
              <li key={t}>
                <span className="wide-display">{String(i + 1).padStart(2, '0')}</span>
                <strong>{tr(t)}</strong>
                <p>{tr(d)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </PartPage>
  );
}
