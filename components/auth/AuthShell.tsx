import Link from 'next/link';
import { LogoLockup } from '@/components/Logo';
import { getSite } from '@/lib/siteSettings';

const POINTS: [string, string][] = [
  ['Rezervácia na pár klikov', 'Tvoje údaje sú predvyplnené.'],
  ['Všetky rezervácie a QR kódy', 'Presun, zrušenie a história na jednom mieste.'],
  ['Chránený účet', 'Šifrované spojenie a dvojstupňové overenie.'],
];

// Prihlásenie, registrácia, obnova hesla, 2FA: vľavo ľad s nadpisom a výhodami, vpravo formulár.
export async function AuthShell({
  kicker,
  title,
  word = 'Vitaj',
  children,
  aside,
}: {
  kicker: string;
  title: React.ReactNode;
  word?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  const site = await getSite();
  return (
    <section className="au2">
      <div className="au2__side">
        <span className="wide-display au2__word" aria-hidden="true">
          {word}
        </span>
        <Link href="/" className="au2__logo" aria-label="I-SPORT COMPLEX, domov">
          <LogoLockup height={44} title="I-SPORT COMPLEX" />
        </Link>
        <div className="au2__mid">
          <h1 className="disp au2__title">{title}</h1>
          {aside ? (
            <div className="au2__aside">{aside}</div>
          ) : (
            <ol className="au2__points">
              {POINTS.map(([t, d]) => (
                <li key={t}>
                  <span>
                    <b>{t}</b>
                    <span>{d}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <span className="au2__addr">
          {site.hall.street} · {site.hall.city.replace(/^\d{3}\s?\d{2}\s*/, '')}
        </span>
      </div>
      <div className="au2__main dk2">
        <div className="au2__form">
          <span className="wide-display au2__kick">{kicker}</span>
          {children}
        </div>
      </div>
    </section>
  );
}

export function AuthFoot({ children }: { children: React.ReactNode }) {
  return <p className="auth__foot">{children}</p>;
}
