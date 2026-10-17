import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { createCaptcha } from '@/lib/captcha';
import { createFormStamp } from '@/lib/formGuard';
import { getSessionUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Registrácia', robots: { index: false } };

export default async function RegistraciaPage() {
  if (await getSessionUser()) redirect('/ucet');
  return (
    <AuthShell
      kicker="Nový účet"
      title={
        <>
          Vstúp
          <br />
          <span className="red">na ľad</span>
        </>
      }
      word="ĽAD"
    >
      <RegisterForm captcha={createCaptcha()} stamp={createFormStamp()} />
    </AuthShell>
  );
}
