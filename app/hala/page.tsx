import type { Metadata } from 'next';
import Link from 'next/link';
import { RinkPlan } from '@/components/Rink';
import { lowestPrice, orTbd, site } from '@/lib/site';

export const metadata: Metadata = { title: 'Hokejová hala' };

const EQUIPMENT = [
  ['Šatne so sprchami', 'Šatňa je súčasťou každej rezervácie'],
  ['Brúsenie korčúľ', 'Na počkanie počas otváracích hodín'],
  ['Tréningové pomôcky', 'Kužele, prekážky a puky na požiadanie'],
  ['Oddychová zóna', 'Pre rodičov a trénerov'],
  ['Parkovanie', 'Priamo pri vstupe do haly'],
];

const BEFORE = [
  'Príď najneskôr 30 minút pred začiatkom, šatňa je pripravená.',
  'Na recepcii ukáž QR kód z potvrdenia alebo z aplikácie.',
  'Na ľad vstupuješ až po úprave ľadu, presne v čase rezervácie.',
  'Šatňu uvoľni do 30 minút po skončení tréningu.',
];

export default function HalaPage() {
  const p = site.prices;
  return (
    <>
      <section className="page-head">
        <div className="wrap page-head__in">
          <nav aria-label="Omrvinky" className="crumbs">
            <Link href="/">Domov</Link>
            <span>/</span>
            Hokejová hala
          </nav>
          <div className="section__head">
            <h1 className="display h1">Hokejová hala</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 420 }}>
              <p className="muted" style={{ margin: 0 }}>
                Tréningová ľadová plocha v Košiciach pre kluby, hokejové školy aj amatérske tímy.
              </p>
              <Link href="/rezervacia" className="btn" style={{ alignSelf: 'flex-start' }}>
                Rezervovať ľad
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--deep">
        <div className="wrap section__in" style={{ gap: 40 }}>
          <h2 className="display h2">Hala v skratke</h2>
          <dl className="dl-rows" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', columnGap: 24 }}>
            <div style={{ flexDirection: 'column' }}>
              <dt className="muted">Adresa</dt>
              <dd style={{ textAlign: 'left' }}>
                {orTbd(site.hall.street)}, {site.hall.city}
              </dd>
            </div>
            <div style={{ flexDirection: 'column' }}>
              <dt className="muted">Rezervácia</dt>
              <dd style={{ textAlign: 'left' }}>Od 60 minút</dd>
            </div>
            <div style={{ flexDirection: 'column' }}>
              <dt className="muted">Plocha</dt>
              <dd style={{ textAlign: 'left' }}>Celá alebo polovica</dd>
            </div>
            <div style={{ flexDirection: 'column' }}>
              <dt className="muted">Otvorené</dt>
              <dd style={{ textAlign: 'left' }}>{orTbd(site.hours[0]?.time)} (Po – Pi)</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="section">
        <div className="wrap section__in">
          <div className="section__head">
            <h2 className="display h2" style={{ maxWidth: 640 }}>
              Celá plocha alebo polovica
            </h2>
            <p className="muted">Polovicu si môžeš rezervovať samostatne. Druhú polovicu môže v rovnakom čase využívať iný tím.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 3 }}>
            <div className="price-tile" style={{ gap: 22, padding: 36 }}>
              <RinkPlan highlight="full" />
              <div className="section__head" style={{ gap: 12 }}>
                <div>
                  <h3 className="display h3">Celá plocha</h3>
                  <p className="muted" style={{ margin: '6px 0 0', fontSize: 16 }}>
                    Tímový tréning, prípravný zápas, kemp
                  </p>
                </div>
                <Link href="/cennik" className="link-red">
                  {lowestPrice([p.full.offPeak, p.full.peak, p.full.weekend])} / hod
                </Link>
              </div>
            </div>
            <div className="price-tile" style={{ gap: 22, padding: 36 }}>
              <RinkPlan highlight="half" />
              <div className="section__head" style={{ gap: 12 }}>
                <div>
                  <h3 className="display h3">Polovica plochy</h3>
                  <p className="muted" style={{ margin: '6px 0 0', fontSize: 16 }}>
                    Individuálny tréning, brankári, technika
                  </p>
                </div>
                <Link href="/cennik" className="link-red">
                  {lowestPrice([p.half.offPeak, p.half.peak, p.half.weekend])} / hod
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--deep">
        <div className="wrap section__in" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 64 }}>
          <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: 28 }}>
            <h2 className="display h2">Vybavenie</h2>
            <dl className="dl-rows">
              {EQUIPMENT.map(([name, note]) => (
                <div key={name} style={{ flexDirection: 'column', gap: 2 }}>
                  <dt style={{ fontWeight: 600 }}>{name}</dt>
                  <dd className="muted" style={{ textAlign: 'left', fontWeight: 400, fontSize: 15 }}>
                    {note}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: 28 }}>
            <h2 className="display h2">Pred príchodom</h2>
            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {BEFORE.map((t, i) => (
                <li key={t} style={{ background: 'var(--surface)', padding: '22px 24px', display: 'flex', gap: 18 }}>
                  <span className="display" style={{ fontSize: 36, color: 'var(--red)', minWidth: 22 }}>
                    {i + 1}
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap section__in" style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', paddingTop: 96, paddingBottom: 96 }}>
          <h2 className="display h2" style={{ maxWidth: 700 }}>
            Voľný ľad nájdeš v kalendári
          </h2>
          <Link href="/rezervacia" className="btn btn--lg">
            Rezervovať ľad
          </Link>
        </div>
      </section>
    </>
  );
}
