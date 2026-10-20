import Link from 'next/link';

// Tmavý pás s veľkým nadpisom nad svetlou „ľadovou“ časťou rezervácie.
export function RzBand({ crumbs, title, lead, step }: { crumbs: { href?: string; label: string }[]; title: React.ReactNode; lead?: React.ReactNode; step?: string }) {
  return (
    <section className="rz-band">
      <div className="wrap rz-band__in">
        <div className="rz-band__top">
          <nav aria-label="Omrvinky" className="crumbs">
            {crumbs.map((c, i) => (
              <span key={c.label} style={{ display: 'contents' }}>
                {i > 0 ? <span aria-hidden="true">/</span> : null}
                {c.href ? <Link href={c.href}>{c.label}</Link> : <span aria-current={i === crumbs.length - 1 ? 'page' : undefined}>{c.label}</span>}
              </span>
            ))}
          </nav>
          {step ? <span className="rz-band__step">{step}</span> : null}
        </div>
        <div className="rz-band__row">
          <h1 className="cond rz-band__title">{title}</h1>
          {lead ? <div className="rz-band__lead">{lead}</div> : null}
        </div>
      </div>
    </section>
  );
}
