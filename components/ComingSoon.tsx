import Link from 'next/link';
import { orTbd } from '@/lib/site';
import { getSite } from '@/lib/siteSettings';
import { BigMessage } from '@/components/BigMessage';

export async function ComingSoon({ title, text }: { title: string; text: string }) {
  const site = await getSite();
  return (
    <BigMessage kicker="Pripravujeme" title={title} text={text}>
      <p className="v3-small">
        Dovtedy nás kontaktuj telefonicky na {orTbd(site.phone)} alebo e-mailom na {orTbd(site.email)}.
      </p>
      <div className="nf__actions">
        <Link href="/kontakt" className="qb__cta">
          Kontakt
        </Link>
        <Link href="/" className="ulink">
          Späť na úvod
        </Link>
      </div>
    </BigMessage>
  );
}
