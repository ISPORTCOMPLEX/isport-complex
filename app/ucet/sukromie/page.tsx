import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/session';
import { DeleteAccountForm } from '@/components/account/DeleteAccountForm';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Súkromie a údaje') };
}

export default async function SukromiePage() {
  const t = await getT();
  const user = await requireUser('/ucet/sukromie');
  return (
    <div className="acct__stack">
      <header className="acct__head">
        <h1 className="display acct__title">{t('Súkromie')}</h1>
      </header>

      <div className="card acct__panel">
        <h2 className="h-card">{t('Stiahnuť moje údaje')}</h2>
        <p className="muted">
          {t('Podľa GDPR máš právo na kópiu svojich údajov. Stiahneš súbor JSON s osobnými údajmi, nastaveniami a históriou prihlásení. Viac v')}{' '}
          
          <Link href="/ochrana-osobnych-udajov" className="link-red">
            {t('ochrane osobných údajov')}
          </Link>
          .
        </p>
        <a href="/api/ucet/export" className="btn btn--ghost btn--sm" download>
          {t('Stiahnuť údaje (JSON)')}
        </a>
      </div>

      <div className="card acct__panel acct__panel--danger">
        <h2 className="h-card">{t('Zmazať účet')}</h2>
        <p className="muted">
          {t('Osobné údaje odstránime a účet sa už nebude dať použiť. Doklady o zaplatených rezerváciách musíme podľa zákona uchovať, ale už nebudú spojené s tvojím menom a e-mailom. Táto akcia sa nedá vrátiť.')}
        </p>
        <DeleteAccountForm has2fa={Boolean(user.twoFactorEnabledAt)} />
      </div>
    </div>
  );
}
