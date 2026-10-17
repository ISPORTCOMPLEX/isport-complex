import type { Metadata } from 'next';
import { requireUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { ProfileForm } from '@/components/account/ProfileForm';
import { site } from '@/lib/site';

export const metadata: Metadata = { title: 'Osobné údaje' };

export default async function ProfilPage() {
  const user = await requireUser('/ucet/profil');
  const extra = await prisma.user.findUnique({ where: { id: user.id }, select: { marketingOptIn: true } });
  return (
    <div className="acct__stack">
      <header className="acct__head">
        <span className="kicker">Môj účet</span>
        <h1 className="display acct__title">Osobné údaje</h1>
      </header>
      <div className="card acct__panel">
        <ProfileForm firstName={user.firstName} lastName={user.lastName} phone={user.phone ?? ''} marketing={extra?.marketingOptIn ?? false} />
      </div>
      <div className="card acct__panel">
        <h2 className="h-card">E-mail</h2>
        <p className="acct__value">{user.email}</p>
        <p className="muted">E-mail slúži na prihlásenie. Ak ho potrebuješ zmeniť, napíš nám{site.email ? ` na ${site.email}` : ''}.</p>
      </div>
    </div>
  );
}
