import type { Metadata } from 'next';
import { PartPage, PartPhoto } from '@/components/PartPage';
import { InquiryForm } from '@/components/InquiryForm';
import { createFormStamp } from '@/lib/formGuard';

export const metadata: Metadata = { title: 'Fitness a wellness', description: 'Posilňovňa a wellness v I-SPORT COMPLEX Košice – pripravujeme.' };

export default function FitnessWellnessPage() {
  return (
    <PartPage
      crumb="Fitness a wellness"
      soon
      title={
        <>
          Fitness
          <br />a wellness
        </>
      }
      lead="Posilňovňa na kondičnú prípravu a wellness na regeneráciu po tréningu. Obe časti komplexu pripravujeme, otvorenie oznámime tu."
    >
      <section className="pp-dark">
        <div className="wrap pp__grid">
          <div className="pp__copy">
            <div className="pp__pair">
              <div>
                <PartPhoto label="Vizualizácia: posilňovňa" />
                <h2 className="cond pp__h2">Posilňovňa</h2>
                <p className="pp__p">Kondičná príprava pre hráčov aj verejnosť.</p>
              </div>
              <div>
                <PartPhoto label="Vizualizácia: wellness" />
                <h2 className="cond pp__h2">Wellness</h2>
                <p className="pp__p">Regenerácia po tréningu pod jednou strechou s ľadom.</p>
              </div>
            </div>
          </div>
          <div className="pp__form ice">
            <InquiryForm type="CONTACT" stamp={createFormStamp()} />
          </div>
        </div>
      </section>
    </PartPage>
  );
}
