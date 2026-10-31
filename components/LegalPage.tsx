import { getSite } from '@/lib/siteSettings';
import { RzBand } from '@/components/booking/RzBand';

// Rozloženie právnych textov. Znenie je pracovný návrh – pred ostrým spustením ho má skontrolovať právnik.
export async function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  const site = await getSite();
  const c = site.company;
  return (
    <>
      <RzBand crumbs={[{ href: '/', label: 'Komplex' }, { label: title }]} title={title} lead={<p>Účinné od {updated}.</p>} />
      <section className="dk2 rz-dk">
        <div className="wrap">
          <div className="legal__in">
            <p className="legal__op">
              Prevádzkovateľ: {c.name}, {c.street}, {c.city}
              {c.ico ? `, IČO ${c.ico}` : ''}
              {c.register ? `, ${c.register}` : ''}.{site.email || site.phone ? ` Kontakt: ${[site.email, site.phone].filter(Boolean).join(', ')}.` : ''}
            </p>
            <div className="legal__body">{children}</div>
          </div>
        </div>
      </section>
    </>
  );
}
