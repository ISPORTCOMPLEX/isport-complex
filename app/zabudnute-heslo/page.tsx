import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { ForgotForm } from '@/components/auth/ForgotForm';
import { createFormStamp } from '@/lib/formGuard';

export const metadata: Metadata = { title: 'Zabudnuté heslo', robots: { index: false } };

export default function ZabudnuteHesloPage() {
  return (
    <AuthShell
      kicker="Obnova prístupu"
      title={
        <>
          Nové
          <br />
          <span className="red">heslo</span>
        </>
      }
      aside={<p className="lead">Odkaz na obnovu je jednorazový a platí hodinu. Po zmene hesla ťa odhlásime zo všetkých zariadení.</p>}
    >
      <ForgotForm stamp={createFormStamp()} />
    </AuthShell>
  );
}
