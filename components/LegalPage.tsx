import Link from 'next/link';
import { orTbd } from '@/lib/site';
import { getSite } from '@/lib/siteSettings';

// Rozloženie právnych textov. Znenie je pracovný návrh – pred ostrým spustením ho má skontrolovať právnik.
export async function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  const site = await getSite();
  const c = site.company;
  return (
    <section className="page-head legal">
      <div className="wrap page-head__in legal__in">
        <nav aria-label="Omrvinky" className="crumbs">
          <Link href="/">Domov</Link>
          <span>/</span>
          {title}
        </nav>
        <h1 className="display h2">{title}</h1>
        <p className="muted" style={{ margin: 0 }}>
          Prevádzkovateľ: {c.name}, {c.street}, {c.city}, IČO {orTbd(c.ico)}
          {c.register ? `, ${c.register}` : ''}. Kontakt: {orTbd(site.email)}, {orTbd(site.phone)}. Účinné od {updated}.
        </p>
        <div className="legal__body">{children}</div>
      </div>
    </section>
  );
}
