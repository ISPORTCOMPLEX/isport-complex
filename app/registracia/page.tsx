import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { createCaptcha } from '@/lib/captcha';
import { createFormStamp } from '@/lib/formGuard';
import { getSessionUser } from '@/lib/session';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Registrácia'), robots: { index: false } };
}

export default async function RegistraciaPage() {
  const t = await getT();
  if (await getSessionUser()) redirect('/ucet');
  return (
    <AuthShell
      kicker={t('Nový účet')}
      title={
        <>
          {t('Vstúp')}
          <br />
          <span className="red">{t('na ľad')}</span>
        </>
      }
      word={t('ĽAD')}
    >
      <RegisterForm captcha={createCaptcha()} stamp={createFormStamp()} />
    </AuthShell>
  );
}
