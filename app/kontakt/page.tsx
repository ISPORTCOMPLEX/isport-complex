import type { Metadata } from 'next';
import Link from 'next/link';
import { orTbd, site } from '@/lib/site';

export const metadata: Metadata = { title: 'Kontakt' };

export default function KontaktPage() {
  const c = site.company;
  return (
    <section className="page-head">
      <div className="wrap page-head__in" style={{ paddingBottom: 110 }}>
        <nav aria-label="Omrvinky" className="crumbs">
          <Link href="/">Domov</Link>
          <span>/</span>
          Kontakt
        </nav>
        <h1 className="display h1">Kontakt</h1>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <div className="price-tile" style={{ flex: '1 1 400px', minWidth: 0, padding: 40, gap: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="muted" style={{ fontSize: 14 }}>
                Hokejová hala
              </span>
              <span style={{ fontSize: 22, fontWeight: 600 }}>{orTbd(site.hall.street)}</span>
              <span style={{ fontSize: 22, fontWeight: 600 }}>{site.hall.city}</span>
              {site.hall.mapUrl && (
                <a href={site.hall.mapUrl} className="link-red" rel="noopener noreferrer" target="_blank">
                  Navigovať
                </a>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="muted" style={{ fontSize: 14 }}>
                  Telefón
                </span>
                {site.phone ? (
                  <a href={`tel:${site.phone.replace(/\s/g, '')}`} style={{ fontWeight: 600, fontSize: 19 }}>
                    {site.phone}
                  </a>
                ) : (
                  <span className="tbd">Doplníme</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="muted" style={{ fontSize: 14 }}>
                  E-mail
                </span>
                {site.email ? (
                  <a href={`mailto:${site.email}`} style={{ fontWeight: 600, fontSize: 19 }}>
                    {site.email}
                  </a>
                ) : (
                  <span className="tbd">Doplníme</span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="muted" style={{ fontSize: 14 }}>
                Otváracie hodiny
              </span>
              <dl className="dl-rows">
                {site.hours.map((h) => (
                  <div key={h.days}>
                    <dt>{h.days}</dt>
                    <dd>{orTbd(h.time)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div className="price-tile" style={{ flex: '1 1 400px', minWidth: 0, padding: 40, gap: 8, background: 'var(--surface-2)' }}>
            <span className="muted" style={{ fontSize: 14 }}>
              Prevádzkovateľ a fakturačné údaje
            </span>
            <strong style={{ fontSize: 20, fontWeight: 600 }}>{c.name}</strong>
            <span>{c.street}</span>
            <span>{c.city}</span>
            <dl className="dl-rows" style={{ marginTop: 16 }}>
              <div>
                <dt className="muted">IČO</dt>
                <dd>{orTbd(c.ico)}</dd>
              </div>
              <div>
                <dt className="muted">DIČ</dt>
                <dd>{orTbd(c.dic)}</dd>
              </div>
              <div>
                <dt className="muted">IČ DPH</dt>
                <dd>{orTbd(c.icDph)}</dd>
              </div>
            </dl>
            {c.register && (
              <p className="muted" style={{ margin: '12px 0 0', fontSize: 14 }}>
                {c.register}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
