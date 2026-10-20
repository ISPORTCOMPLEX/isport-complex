import { orTbd } from '@/lib/site';
import { getSite } from '@/lib/siteSettings';
import { RzBand } from '@/components/booking/RzBand';

// Rozloženie právnych textov. Znenie je pracovný návrh – pred ostrým spustením ho má skontrolovať právnik.
export async function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  const site = await getSite();
  const c = site.company;
  return (
    <>
      <RzBand crumbs={[{ href: '/', label: 'Komplex' }, { label: title }]} title={title} lead={<p>Účinné od {updated}.</p>} />
      <section className="ice rz-ice">
        <div className="wrap">
          <div className="legal__in">
            <p className="legal__op">
              Prevádzkovateľ: {c.name}, {c.street}, {c.city}, IČO {orTbd(c.ico)}
              {c.register ? `, ${c.register}` : ''}. Kontakt: {orTbd(site.email)}, {orTbd(site.phone)}.
            </p>
            <div className="legal__body">{children}</div>
          </div>
        </div>
      </section>
    </>
  );
}
