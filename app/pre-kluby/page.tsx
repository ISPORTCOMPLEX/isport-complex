import type { Metadata } from 'next';
import Link from 'next/link';
import { orTbd, site } from '@/lib/site';

export const metadata: Metadata = { title: 'Pre kluby' };

const BENEFITS = [
  ['Pevný čas celú sezónu', 'Tvoje hodiny sú v kalendári zablokované dopredu, nikto ti ich nevezme.'],
  ['Jedna faktúra mesačne', 'Na klub alebo školu, so splatnosťou. Žiadne platby za každú hodinu.'],
  ['Rozpis pre celý tím', 'Tréneri a hráči vidia tréningy v aplikácii a dostanú pripomienku.'],
];

export default function PreKlubyPage() {
  return (
    <>
      <section className="page-head" style={{ position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, right: '8%', width: 260, background: 'var(--red)', transform: 'skewX(-18deg)', opacity: 0.9 }} />
        <div className="wrap page-head__in" style={{ position: 'relative', paddingBottom: 100 }}>
          <nav aria-label="Omrvinky" className="crumbs">
            <Link href="/">Domov</Link>
            <span>/</span>
            Pre kluby
          </nav>
          <h1 className="display h1" style={{ maxWidth: 860 }}>
            Ľad pre kluby a hokejové školy
          </h1>
          <p className="lead">
            Pevné hodiny na celú sezónu, bloky na kempy a turnaje. Jedna zmluva, mesačná faktúra a rozpis tréningov pre celý tím.
          </p>
          <a href="#dopyt" className="btn btn--lg" style={{ alignSelf: 'flex-start' }}>
            Poslať dopyt
          </a>
        </div>
      </section>

      <section className="section section--deep">
        <div className="wrap section__in" style={{ paddingTop: 96, paddingBottom: 96 }}>
          <div className="grid-auto">
            {BENEFITS.map(([title, text]) => (
              <div key={title} className="price-tile" style={{ padding: '34px 30px', gap: 12 }}>
                <h2 className="display h3">{title}</h2>
                <p className="muted" style={{ margin: 0, fontSize: 16 }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="dopyt" className="section">
        <div className="wrap section__in" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 64, alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 className="display h2">Dopyt na prenájom</h2>
            <p className="muted" style={{ margin: 0 }}>
              Napíš nám názov klubu, preferované dni a časy a od kedy chceš ľad. Do 24 hodín ti pošleme ponuku s voľnými časmi a cenou.
            </p>
            <p className="muted" style={{ margin: 0, fontSize: 15 }}>
              Online formulár s ochranou proti spamu spustíme spolu s účtami v ďalšej fáze.
            </p>
          </div>
          <div className="price-tile price-tile--accent" style={{ flex: '1 1 420px', gap: 18, padding: 36 }}>
            <span className="muted" style={{ fontSize: 14 }}>
              Kontakt pre kluby
            </span>
            <dl className="dl-rows" style={{ borderTop: 'none' }}>
              <div>
                <dt className="muted">Telefón</dt>
                <dd>{site.phone ? <a href={`tel:${site.phone.replace(/\s/g, '')}`}>{site.phone}</a> : orTbd('')}</dd>
              </div>
              <div>
                <dt className="muted">E-mail</dt>
                <dd>{site.email ? <a href={`mailto:${site.email}?subject=Dopyt%20na%20sez%C3%B3nny%20pren%C3%A1jom`}>{site.email}</a> : orTbd('')}</dd>
              </div>
            </dl>
            {site.email && (
              <a className="btn" href={`mailto:${site.email}?subject=Dopyt%20na%20sez%C3%B3nny%20pren%C3%A1jom`} style={{ alignSelf: 'flex-start' }}>
                Napísať e-mail
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
