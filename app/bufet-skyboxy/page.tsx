import type { Metadata } from 'next';
import Link from 'next/link';
import { PartGallery, PartPage, PartPhoto } from '@/components/PartPage';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Bufet a skyboxy'), description: t('Bufet a skyboxy nad ľadovou plochou v I-SPORT COMPLEX Košice.') };
}

export default async function BufetSkyboxyPage() {
  const t = await getT();
  return (
    <PartPage
      zone="sky"
      crumb={t('Bufet a skyboxy')}
      title={
        <>
          {t('Bufet')}
          <br />{t('a skyboxy')}
        </>
      }
      lead={t('Presklené skyboxy nad ľadovou plochou pre rodiny hráčov a návštevníkov a bufet priamo v hale.')}
    >
      <section className="pp-dark">
        <div className="wrap pp__pair pp__pair--big">
          <div>
            <PartPhoto label={t('Foto: skybox')} slot="skyboxy" />
            <h2 className="cond pp__h2">{t('Skyboxy')}</h2>
            <p className="pp__p">{t('Sledujte tréningy a zápasy v teple, s výhľadom na celú plochu. O možnostiach využitia sa informujte na recepcii.')}</p>
            <Link href="/kontakt" className="ulink">
              {t('Napísať nám')}
            </Link>
          </div>
          <div>
            <PartPhoto label={t('Foto: bufet')} slot="bufet" />
            <h2 className="cond pp__h2">{t('Bufet')}</h2>
            <p className="pp__p">{t('Občerstvenie po tréningu aj počas zápasu, priamo v komplexe – pre hráčov, rodičov aj fanúšikov.')}</p>
          </div>
        </div>
        <div className="wrap">
          <PartGallery skip={1} slot="skyboxy" title={t('Skyboxy')} />
          <PartGallery skip={1} slot="bufet" title={t('Bufet')} />
        </div>
      </section>
    </PartPage>
  );
}
