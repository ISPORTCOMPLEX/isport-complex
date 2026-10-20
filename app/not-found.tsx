import Link from 'next/link';
import { BigMessage } from '@/components/BigMessage';

export default function NotFound() {
  return (
    <BigMessage kicker="Chyba 404" title="Mimo ihriska" text="Táto stránka neexistuje. Odkaz je nesprávny alebo stránka bola presunutá.">
      <div className="nf__actions">
        <Link href="/" className="qb__cta">
          Späť na úvod
        </Link>
        <Link href="/rezervacia" className="ulink">
          Rezervovať ľad
        </Link>
      </div>
    </BigMessage>
  );
}
