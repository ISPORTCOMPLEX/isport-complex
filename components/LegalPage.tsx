import Link from 'next/link';
import { site } from '@/lib/site';

// Šablóna pre právne texty. Samotné znenie dodá prevádzkovateľ (ideálne s právnikom).
export function LegalPage({ title }: { title: string }) {
  const c = site.company;
  return (
    <section className="page-head">
      <div className="wrap page-head__in" style={{ maxWidth: 860, marginLeft: 'auto', marginRight: 'auto' }}>
        <nav aria-label="Omrvinky" className="crumbs">
          <Link href="/">Domov</Link>
          <span>/</span>
          {title}
        </nav>
        <h1 className="display h2">{title}</h1>
        <p className="muted" style={{ margin: 0 }}>
          Prevádzkovateľ: {c.name}, {c.street}, {c.city}.
        </p>
        <p className="tbd" style={{ margin: 0 }}>
          Znenie dokumentu doplníme pred spustením rezervácií.
        </p>
      </div>
    </section>
  );
}
