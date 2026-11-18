import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { TwoFactorForm } from '@/components/auth/TwoFactorForm';
import { getPending2fa } from '@/lib/session';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Overovací kód'), robots: { index: false } };
}

export default async function TwoFactorPage() {
  const t = await getT();
  if (!(await getPending2fa())) redirect('/prihlasenie');
  return (
    <AuthShell
      kicker={t('Dvojstupňové overenie')}
      title={
        <>
          {t('Ešte')}
          <br />
          <span className="red">{t('jeden krok')}</span>
        </>
      }
      aside={<p className="lead">{t('Tvoj účet chráni dvojstupňové overenie. Heslo sedí, teraz potvrď prihlásenie kódom z telefónu. Na zadanie máš 5 minút.')}</p>}
    >
      <TwoFactorForm />
    </AuthShell>
  );
}
