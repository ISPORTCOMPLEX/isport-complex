import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { ForgotForm } from '@/components/auth/ForgotForm';
import { createFormStamp } from '@/lib/formGuard';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Zabudnuté heslo'), robots: { index: false } };
}

export default async function ZabudnuteHesloPage() {
  const t = await getT();
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
      aside={<p className="lead">{t('Odkaz na obnovu je jednorazový a platí hodinu. Po zmene hesla ťa odhlásime zo všetkých zariadení.')}</p>}
    >
      <ForgotForm stamp={createFormStamp()} />
    </AuthShell>
  );
}
