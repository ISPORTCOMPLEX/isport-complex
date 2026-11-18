import type { Metadata } from 'next';
import { requireUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { ProfileForm } from '@/components/account/ProfileForm';
import { getSite } from '@/lib/siteSettings';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Osobné údaje') };
}

export default async function ProfilPage() {
  const t = await getT();
  const site = await getSite();
  const user = await requireUser('/ucet/profil');
  const extra = await prisma.user.findUnique({ where: { id: user.id }, select: { marketingOptIn: true } });
  return (
    <div className="acct__stack">
      <header className="acct__head">
        <h1 className="display acct__title">{t('Osobné údaje')}</h1>
      </header>
      <div className="card acct__panel">
        <ProfileForm firstName={user.firstName} lastName={user.lastName} phone={user.phone ?? ''} marketing={extra?.marketingOptIn ?? false} />
      </div>
      <div className="card acct__panel">
        <h2 className="h-card">{t('E-mail')}</h2>
        <p className="acct__value">{user.email}</p>
        <p className="muted">{t('E-mail slúži na prihlásenie. Ak ho potrebuješ zmeniť, napíš nám')}{site.email ? t(' na {email}', { email: site.email }) : ''}.</p>
      </div>
    </div>
  );
}
