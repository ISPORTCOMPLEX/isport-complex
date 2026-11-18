import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { verifyEmailToken } from '@/lib/verifyEmail';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Overenie e-mailu'), robots: { index: false }, referrer: 'no-referrer' };
}

type Props = { searchParams: Promise<{ token?: string | string[] }> };

export default async function OverenieEmailuPage({ searchParams }: Props) {
  const t = await getT();
  const sp = await searchParams;
  const ok = typeof sp.token === 'string' ? await verifyEmailToken(sp.token) : false;
  return (
    <AuthShell
      kicker={t('Overenie e-mailu')}
      title={
        <>
          {ok ? t('Účet') : t('Odkaz')}
          <br />
          <span className="red">{ok ? t('je aktívny') : t('nefunguje')}</span>
        </>
      }
      aside={<p className="lead">{ok ? t('Ďakujeme. Tvoj e-mail je overený a účet je pripravený.') : t('Overovací odkaz platí 24 hodín a dá sa použiť len raz.')}</p>}
    >
      {ok ? (
        <div className="auth__done">
          <div className="auth__done-ic auth__done-ic--ok" aria-hidden="true">✓</div>
          <h2 className="h-card">{t('E-mail je overený')}</h2>
          <p>{t('Teraz sa môžeš prihlásiť a rezervovať si ľad.')}</p>
          <Link href="/prihlasenie?stav=overeny" className="btn btn--full">
            {t('Prihlásiť sa')}
          </Link>
        </div>
      ) : (
        <div className="auth__done">
          <h2 className="h-card">{t('Odkaz je neplatný alebo vypršal')}</h2>
          <p>{t('Ak si už e-mail overil, stačí sa prihlásiť. Inak sa prihlás a vyžiadaj si nový odkaz – ponúkneme ti ho hneď pri prihlásení.')}</p>
          <Link href="/prihlasenie" className="btn btn--full">
            {t('Prihlásenie')}
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
