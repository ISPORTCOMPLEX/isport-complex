import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/session';
import { DeleteAccountForm } from '@/components/account/DeleteAccountForm';

export const metadata: Metadata = { title: 'Súkromie a údaje' };

export default async function SukromiePage() {
  const user = await requireUser('/ucet/sukromie');
  return (
    <div className="acct__stack">
      <header className="acct__head">
        <span className="kicker">Môj účet</span>
        <h1 className="display acct__title">Súkromie</h1>
      </header>

      <div className="card acct__panel">
        <h2 className="h-card">Stiahnuť moje údaje</h2>
        <p className="muted">
          Podľa GDPR máš právo na kópiu svojich údajov. Stiahneš súbor JSON s osobnými údajmi, nastaveniami a históriou prihlásení. Viac v{' '}
          <Link href="/ochrana-osobnych-udajov" className="link-red">
            ochrane osobných údajov
          </Link>
          .
        </p>
        <a href="/api/ucet/export" className="btn btn--ghost btn--sm" download>
          Stiahnuť údaje (JSON)
        </a>
      </div>

      <div className="card acct__panel acct__panel--danger">
        <h2 className="h-card">Zmazať účet</h2>
        <p className="muted">
          Osobné údaje odstránime a účet sa už nebude dať použiť. Doklady o zaplatených rezerváciách musíme podľa zákona uchovať, ale už nebudú spojené s tvojím menom
          a e-mailom. Táto akcia sa nedá vrátiť.
        </p>
        <DeleteAccountForm has2fa={Boolean(user.twoFactorEnabledAt)} />
      </div>
    </div>
  );
}
