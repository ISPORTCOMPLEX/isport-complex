import type { Metadata } from 'next';
import { PartGallery, PartPage, PartPhoto } from '@/components/PartPage';
import { InquiryForm } from '@/components/InquiryForm';
import { createFormStamp } from '@/lib/formGuard';
import { getSite } from '@/lib/siteSettings';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Futbalové ihrisko'), description: t('Menšie vonkajšie futbalové ihrisko pri I-SPORT COMPLEX v Košiciach.') };
}

export default async function IhriskoPage() {
  const t = await getT();
  const site = await getSite();
  return (
    <PartPage
      zone="pitch"
      crumb="Ihrisko"
      title={
        <>
          {t('Futbalové')}
          <br />
          {t('ihrisko')}
        </>
      }
      lead={t('Menšie vonkajšie ihrisko hneď pri komplexe. Prenájom a voľné termíny dohodneš na recepcii alebo cez formulár.')}
    >
      <section className="pp-dark">
        <div className="wrap pp__grid">
          <div className="pp__copy">
            <PartPhoto label={t('Foto: ihrisko')} slot="ihrisko" />
            <PartGallery skip={1} slot="ihrisko" />
            <p className="pp__p">
              {t('Na ihrisko si môžeš dohodnúť pravidelný termín pre tím aj jednorazový zápas.')}
              {site.phone ? (
                <>
                  {' '}{t('Zavolaj na')}{' '}
                  <a href={`tel:${site.phone.replace(/\s/g, '')}`}>{site.phone}</a>.
                </>
              ) : null}
            </p>
          </div>
          <div className="pp__form dk2">
            <InquiryForm type="CONTACT" stamp={createFormStamp()} />
          </div>
        </div>
      </section>
    </PartPage>
  );
}
