import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RzBand } from '@/components/booking/RzBand';
import { PanoViewer } from '@/components/tour/PanoViewer';
import { panoramas } from '@/lib/media';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Prehliadka 360°'), description: t('Virtuálna 360° prehliadka I-SPORT COMPLEX Košice – rozhliadni sa po hale ešte pred tréningom.') };
}

// Stránka existuje, až keď sú v administrácii nahraté panorámy (Fotky → Prehliadka 360°).
export default async function PrehliadkaPage() {
  const t = await getT();
  const scenes = await panoramas();
  if (!scenes.length) notFound();
  return (
    <>
      <RzBand crumbs={[{ href: '/', label: t('Komplex') }, { label: t('Prehliadka 360°') }]} title={t('Prehliadka 360°')} lead={t('Rozhliadni sa po hale ešte predtým, než prídeš. Ťahaním sa otočíš, kolieskom alebo prstami priblížiš.')} />
      <section className="dk2 rz-dk">
        <div className="wrap">
          <PanoViewer scenes={scenes} />
          <p className="pv360__after">
            {t('Páči sa ti?')}{' '}<Link href="/rezervacia">{t('Rezervuj si ľad')}</Link> {' '}{t('alebo si pozri')}{' '}<Link href="/fotky">{t('fotky')}</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
