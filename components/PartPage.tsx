import Link from 'next/link';
import { RzBand } from '@/components/booking/RzBand';

// Spoločné rozloženie stránok jednotlivých častí komplexu.
export function PartPage({
  crumb,
  title,
  lead,
  soon = false,
  children,
}: {
  crumb: string;
  title: React.ReactNode;
  lead: string;
  soon?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <RzBand
        crumbs={[{ href: '/', label: 'Komplex' }, { label: crumb }]}
        title={title}
        lead={
          <>
            {soon ? <p className="pp__soon">Pripravujeme</p> : null}
            <p>{lead}</p>
          </>
        }
      />
      {children}
    </>
  );
}

export function PartPhoto({ label }: { label: string }) {
  return <div className="pp__photo">{label}</div>;
}

export function PartCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="qb__cta" style={{ alignSelf: 'flex-start' }}>
      {children}
      <span aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 14 14">
          <path d="M2 7h10M8 3l4 4-4 4" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </svg>
      </span>
    </Link>
  );
}
