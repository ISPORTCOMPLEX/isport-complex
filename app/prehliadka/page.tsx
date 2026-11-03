import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RzBand } from '@/components/booking/RzBand';
import { PanoViewer } from '@/components/tour/PanoViewer';
import { panoramas } from '@/lib/media';

export const metadata: Metadata = { title: 'Prehliadka 360°', description: 'Virtuálna 360° prehliadka I-SPORT COMPLEX Košice – rozhliadni sa po hale ešte pred tréningom.' };

// Stránka existuje, až keď sú v administrácii nahraté panorámy (Fotky → Prehliadka 360°).
export default async function PrehliadkaPage() {
  const scenes = await panoramas();
  if (!scenes.length) notFound();
  return (
    <>
      <RzBand crumbs={[{ href: '/', label: 'Komplex' }, { label: 'Prehliadka 360°' }]} title="Prehliadka 360°" lead="Rozhliadni sa po hale ešte predtým, než prídeš. Ťahaním sa otočíš, kolieskom alebo prstami priblížiš." />
      <section className="dk2 rz-dk">
        <div className="wrap">
          <PanoViewer scenes={scenes} />
          <p className="pv360__after">
            Páči sa ti? <Link href="/rezervacia">Rezervuj si ľad</Link> alebo si pozri <Link href="/fotky">fotky</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
