import type { Metadata } from 'next';
import { PartGallery, PartPage, PartPhoto } from '@/components/PartPage';
import { InquiryForm } from '@/components/InquiryForm';
import { createFormStamp } from '@/lib/formGuard';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Fitness a wellness'), description: t('Posilňovňa a wellness v I-SPORT COMPLEX Košice – pripravujeme.') };
}

export default async function FitnessWellnessPage() {
  const t = await getT();
  return (
    <PartPage
      zone="gym"
      crumb={t('Fitness a wellness')}
      soon
      title={
        <>
          {t('Fitness')}
          <br />{t('a wellness')}
        </>
      }
      lead={t('Posilňovňa na kondičnú prípravu a wellness na regeneráciu po tréningu. Obe časti komplexu pripravujeme, otvorenie oznámime tu.')}
    >
      <section className="pp-dark">
        <div className="wrap pp__grid">
          <div className="pp__copy">
            <div className="pp__pair">
              <div>
                <PartPhoto label={t('Vizualizácia: posilňovňa')} slot="posilnovna" />
                <h2 className="cond pp__h2">{t('Posilňovňa')}</h2>
                <p className="pp__p">{t('Kondičná príprava pre hráčov aj verejnosť.')}</p>
              </div>
              <div>
                <PartPhoto label={t('Vizualizácia: wellness')} slot="wellness" />
                <h2 className="cond pp__h2">{t('Wellness')}</h2>
                <p className="pp__p">{t('Regenerácia po tréningu pod jednou strechou s ľadom.')}</p>
              </div>
            </div>
          </div>
          <div className="pp__form dk2">
            <InquiryForm type="CONTACT" stamp={createFormStamp()} />
          </div>
        </div>
        <div className="wrap">
          <PartGallery skip={1} slot="posilnovna" title={t('Posilňovňa')} />
          <PartGallery skip={1} slot="wellness" title={t('Wellness')} />
        </div>
      </section>
    </PartPage>
  );
}
