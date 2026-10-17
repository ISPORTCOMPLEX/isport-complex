import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { TwoFactorForm } from '@/components/auth/TwoFactorForm';
import { getPending2fa } from '@/lib/session';

export const metadata: Metadata = { title: 'Overovací kód', robots: { index: false } };

export default async function TwoFactorPage() {
  if (!(await getPending2fa())) redirect('/prihlasenie');
  return (
    <AuthShell
      kicker="Dvojstupňové overenie"
      title={
        <>
          Ešte
          <br />
          <span className="red">jeden krok</span>
        </>
      }
      aside={<p className="lead">Tvoj účet chráni dvojstupňové overenie. Heslo sedí, teraz potvrď prihlásenie kódom z telefónu. Na zadanie máš 5 minút.</p>}
    >
      <TwoFactorForm />
    </AuthShell>
  );
}
