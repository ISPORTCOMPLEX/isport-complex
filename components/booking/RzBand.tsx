import Link from 'next/link';

// Hero pás podstránok: textúra ľadu pod tmavým gradientom, omrvinky, veľký nadpis ISport Display
// a voliteľne výhody s fajkami (rezervácia) alebo krátky úvod.
export function RzBand({ crumbs, title, lead, step, checks }: { crumbs: { href?: string; label: string }[]; title: React.ReactNode; lead?: React.ReactNode; step?: string; checks?: string[] }) {
  return (
    <section className="band2">
      <span className="band2__shade" aria-hidden="true" />
      <div className="wrap band2__in">
        <nav aria-label="Navigačná cesta" className="band2__crumbs">
          {crumbs.map((c, i) => (
            <span className="u-contents" key={c.label}>
              {i > 0 ? <span aria-hidden="true">/</span> : null}
              {c.href ? <Link href={c.href}>{c.label}</Link> : <span aria-current={i === crumbs.length - 1 ? 'page' : undefined}>{c.label}</span>}
            </span>
          ))}
        </nav>
        <h1 className="disp band2__title">{title}</h1>
        {step ? <span className="band2__step">{step}</span> : null}
        {checks?.length ? (
          <ul className="band2__checks">
            {checks.map((c) => (
              <li key={c}>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12l5 5 9-10" fill="none" stroke="#E30613" strokeWidth="2.6" />
                </svg>
                {c}
              </li>
            ))}
          </ul>
        ) : null}
        {lead ? <div className="band2__lead">{lead}</div> : null}
      </div>
    </section>
  );
}
