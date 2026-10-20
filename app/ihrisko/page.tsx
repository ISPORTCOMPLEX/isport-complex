import type { Metadata } from 'next';
import { PartPage, PartPhoto } from '@/components/PartPage';
import { InquiryForm } from '@/components/InquiryForm';
import { createFormStamp } from '@/lib/formGuard';
import { getSite } from '@/lib/siteSettings';

export const metadata: Metadata = { title: 'Futbalové ihrisko', description: 'Menšie vonkajšie futbalové ihrisko pri I-SPORT COMPLEX v Košiciach.' };

export default async function IhriskoPage() {
  const site = await getSite();
  return (
    <PartPage
      crumb="Ihrisko"
      title={
        <>
          Futbalové
          <br />
          ihrisko
        </>
      }
      lead="Menšie vonkajšie ihrisko hneď pri komplexe. Prenájom a voľné termíny dohodneš na recepcii alebo cez formulár."
    >
      <section className="pp-dark">
        <div className="wrap pp__grid">
          <div className="pp__copy">
            <PartPhoto label="Foto: ihrisko" />
            <p className="pp__p">
              Na ihrisko si môžeš dohodnúť pravidelný termín pre tím aj jednorazový zápas.
              {site.phone ? (
                <>
                  {' '}
                  Zavolaj na <a href={`tel:${site.phone.replace(/\s/g, '')}`}>{site.phone}</a>.
                </>
              ) : null}
            </p>
          </div>
          <div className="pp__form ice">
            <InquiryForm type="CONTACT" stamp={createFormStamp()} />
          </div>
        </div>
      </section>
    </PartPage>
  );
}
