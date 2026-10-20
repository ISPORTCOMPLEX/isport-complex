import type { Metadata } from 'next';
import Link from 'next/link';
import { PartPage, PartPhoto } from '@/components/PartPage';

export const metadata: Metadata = { title: 'Bufet a skyboxy', description: 'Bufet a skyboxy nad ľadovou plochou v I-SPORT COMPLEX Košice.' };

export default function BufetSkyboxyPage() {
  return (
    <PartPage
      crumb="Bufet a skyboxy"
      title={
        <>
          Bufet
          <br />a skyboxy
        </>
      }
      lead="Presklené skyboxy nad ľadovou plochou pre rodiny hráčov a návštevníkov a bufet priamo v hale."
    >
      <section className="pp-dark">
        <div className="wrap pp__pair pp__pair--big">
          <div>
            <PartPhoto label="Foto: skybox" />
            <h2 className="cond pp__h2">Skyboxy</h2>
            <p className="pp__p">Sledujte tréningy a zápasy v teple, s výhľadom na celú plochu. O možnostiach využitia sa informujte na recepcii.</p>
            <Link href="/kontakt" className="ulink">
              Napísať nám
            </Link>
          </div>
          <div>
            <PartPhoto label="Foto: bufet" />
            <h2 className="cond pp__h2">Bufet</h2>
            <p className="pp__p">Občerstvenie po tréningu aj počas zápasu, priamo v komplexe – pre hráčov, rodičov aj fanúšikov.</p>
          </div>
        </div>
      </section>
    </PartPage>
  );
}
