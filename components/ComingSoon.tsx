import Link from 'next/link';
import { orTbd } from '@/lib/site';
import { getSite } from '@/lib/siteSettings';

export async function ComingSoon({ title, text }: { title: string; text: string }) {
  const site = await getSite();
  return (
    <section className="soon">
      <div className="wrap soon__in">
        <span className="kicker">Pripravujeme</span>
        <h1 className="display h2">{title}</h1>
        <p className="lead">{text}</p>
        <p className="muted" style={{ margin: 0 }}>
          Dovtedy nás kontaktuj telefonicky na {orTbd(site.phone)} alebo e-mailom na {orTbd(site.email)}.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <Link href="/kontakt" className="btn">
            Kontakt
          </Link>
          <Link href="/" className="btn btn--ghost">
            Späť na úvod
          </Link>
        </div>
      </div>
    </section>
  );
}
