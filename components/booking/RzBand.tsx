import Link from 'next/link';
import { Icon, type IconName } from '@/components/Icon';

// ikona k výhode podľa textu (inak fajka)
const checkIcon = (t: string): IconName | null => (/šatň/i.test(t) ? 'satna' : /storno|zruš/i.test(t) ? 'storno' : /plocha|ľad/i.test(t) ? 'hokej' : /QR/.test(t) ? 'qr' : /sprch/i.test(t) ? 'sprchy' : null);

// Hero pás podstránok: textúra ľadu pod tmavým gradientom, omrvinky, veľký nadpis ISport Display
// a voliteľne výhody s fajkami (rezervácia) alebo krátky úvod.
// S `art` dostane vpravo ilustráciu areálu (podstránky častí komplexu).
export function RzBand({ crumbs, title, lead, step, checks, art }: { crumbs: { href?: string; label: string }[]; title: React.ReactNode; lead?: React.ReactNode; step?: string; checks?: string[]; art?: React.ReactNode }) {
  return (
    <section className={`band2${art ? ' band2--art' : ''}`}>
      {art}
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
                {checkIcon(c) ? (
                  <Icon name={checkIcon(c)!} size={22} />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12l5 5 9-10" fill="none" stroke="#E30613" strokeWidth="2.6" />
                  </svg>
                )}
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
