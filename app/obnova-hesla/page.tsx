import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { ResetForm } from '@/components/auth/ResetForm';
import { peekAuthToken } from '@/lib/tokens';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Obnova hesla'), robots: { index: false }, referrer: 'no-referrer' };
}

type Props = { searchParams: Promise<{ token?: string | string[] }> };

export default async function ObnovaHeslaPage({ searchParams }: Props) {
  const t = await getT();
  const sp = await searchParams;
  const token = typeof sp.token === 'string' ? sp.token : '';
  const valid = token ? await peekAuthToken(token, 'RESET_PASSWORD') : null;
  return (
    <AuthShell
      kicker={t('Obnova prístupu')}
      title={
        <>
          {t('Nové')}
          <br />
          <span className="red">{t('heslo')}</span>
        </>
      }
      aside={<p className="lead">{t('Zvoľ si silné heslo, ktoré nepoužívaš nikde inde. Po uložení ťa odhlásime zo všetkých zariadení.')}</p>}
    >
      {valid ? (
        <ResetForm token={token} />
      ) : (
        <div className="auth__done">
          <h2 className="h-card">{t('Odkaz je neplatný')}</h2>
          <p>{t('Odkaz na obnovu hesla vypršal alebo už bol použitý. Vyžiadaj si nový.')}</p>
          <Link href="/zabudnute-heslo" className="btn btn--full">
            {t('Poslať nový odkaz')}
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
