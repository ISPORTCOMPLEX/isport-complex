import { LeagueTabs } from '@/components/league/LeagueTabs';
import { getT } from '@/lib/i18n/server';

// Súťaž tímov – zlatý pás odlišuje sekciu od zvyšku webu, pod ním záložky ako na NHL.com.
export default async function SutazLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();
  return (
    <>
      <section className="lgb">
        <span className="lgb__glow" aria-hidden="true" />
        <div className="wrap lgb__in">
          <p className="lgb__k">
            <i aria-hidden="true" />
            {t('Hokejová minisúťaž v I-SPORT COMPLEX')}
          </p>
          <p className="disp lgb__t">{t('Súťaž tímov')}</p>
          <LeagueTabs />
        </div>
      </section>
      <div className="lgp">
        <div className="wrap">{children}</div>
      </div>
    </>
  );
}
