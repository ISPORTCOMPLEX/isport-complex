import Link from 'next/link';
import { MissArt } from '@/components/EmptyArt';
import { getT } from '@/lib/i18n/server';

export default async function NotFound() {
  const t = await getT();
  return (
    <section className="wrap nf2">
      <div className="nf2__tx">
        <h1 className="nf2__h">
          {t('Puk išiel')}
          <br />
          <em>{t('mimo bránky')}</em>
        </h1>
        <p className="nf2__p">{t('Stránka, ktorú hľadáš, neexistuje alebo sa presunula. Skús to cez hlavnú stránku alebo si rovno rezervuj ľad.')}</p>
        <div className="nf2__btns">
          <Link href="/" className="sbtn">
            {t('Na hlavnú stránku')}
          </Link>
          <Link href="/rezervacia" className="sbtn sbtn--ghost">
            {t('Rezervovať ľad')}
          </Link>
        </div>
        <p className="nf2__more">
          {t('Často hľadané:')}{' '}<Link href="/cennik">{t('Cenník')}</Link>
          <Link href="/ladova-plocha">{t('Ľadová plocha')}</Link>
          <Link href="/kontakt">{t('Kontakt')}</Link>
        </p>
      </div>
      <MissArt />
    </section>
  );
}
