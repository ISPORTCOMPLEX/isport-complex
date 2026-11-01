import Link from 'next/link';
import { MissArt } from '@/components/EmptyArt';

export default function NotFound() {
  return (
    <section className="wrap nf2">
      <div className="nf2__tx">
        <h1 className="nf2__h">
          Puk išiel
          <br />
          <em>mimo bránky</em>
        </h1>
        <p className="nf2__p">Stránka, ktorú hľadáš, neexistuje alebo sa presunula. Skús to cez hlavnú stránku alebo si rovno rezervuj ľad.</p>
        <div className="nf2__btns">
          <Link href="/" className="sbtn">
            Na hlavnú stránku
          </Link>
          <Link href="/rezervacia" className="sbtn sbtn--ghost">
            Rezervovať ľad
          </Link>
        </div>
        <p className="nf2__more">
          Často hľadané: <Link href="/cennik">Cenník</Link>
          <Link href="/ladova-plocha">Ľadová plocha</Link>
          <Link href="/kontakt">Kontakt</Link>
        </p>
      </div>
      <MissArt />
    </section>
  );
}
