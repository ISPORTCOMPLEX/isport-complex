import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff, can, ROLE_LABEL } from '@/lib/staff';
import { AdminNav, type AdminNavItem } from '@/components/admin/AdminNav';
import { LogoLockup } from '@/components/Logo';
import { logoutAction } from '@/lib/actions/auth';
import { prisma } from '@/lib/prisma';
import { addDays, hallTime, todayIso } from '@/lib/booking/time';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: { default: t('Administrácia'), template: t('%s · Administrácia') }, robots: { index: false, follow: false } };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();
  const user = await requireStaff('dashboard');
  // Odznak pri Rezerváciách: dnešné nezaplatené rezervácie.
  const today = todayIso();
  const unpaidToday = can(user.role, 'bookings.view')
    ? await prisma.booking.count({
        where: { status: 'CONFIRMED', paymentStatus: 'UNPAID', startsAt: { gte: hallTime(today, 0), lt: hallTime(addDays(today, 1), 0) } },
      })
    : 0;
  const newInquiries = can(user.role, 'inquiries.manage') ? await prisma.inquiry.count({ where: { status: 'NEW' } }) : 0;
  // odznak pri Súťaži: tímy čakajúce na schválenie (tabuľka ešte nemusí existovať)
  const pendingTeams = can(user.role, 'league.manage') ? await prisma.leagueTeam.count({ where: { status: 'PENDING' } }).catch(() => 0) : 0;
  const B = can(user.role, 'bookings.view');
  const items: AdminNavItem[] = [
    { href: '/admin', label: t('Prehľad'), icon: 'home', group: '' },
    ...(B
      ? ([
          { href: '/admin/recepcia', label: t('Recepcia'), icon: 'scan', group: t('Ľadová plocha') },
          { href: '/admin/kalendar', label: t('Kalendár'), icon: 'cal', group: t('Ľadová plocha') },
          { href: '/admin/rezervacie', label: t('Rezervácie'), icon: 'list', group: t('Ľadová plocha'), badge: unpaidToday || undefined },
        ] as AdminNavItem[])
      : []),
    ...(can(user.role, 'users.view') ? ([{ href: '/admin/zakaznici', label: t('Zákazníci a kluby'), icon: 'users', group: t('Ľudia') }] as AdminNavItem[]) : []),
    ...(can(user.role, 'inquiries.manage') ? ([{ href: '/admin/dopyty', label: t('Dopyty'), icon: 'mail', group: t('Ľudia'), badge: newInquiries || undefined }] as AdminNavItem[]) : []),
    ...(can(user.role, 'articles.write') ? ([{ href: '/admin/clanky', label: t('Články'), icon: 'doc', group: 'Web', hard: true }] as AdminNavItem[]) : []),
    ...(can(user.role, 'league.manage') ? ([{ href: '/admin/sutaz', label: t('Súťaž tímov'), icon: 'trophy', group: 'Web', badge: pendingTeams || undefined }] as AdminNavItem[]) : []),
    ...(can(user.role, 'media.manage') ? ([{ href: '/admin/fotky', label: t('Fotky'), icon: 'image', group: 'Web', hard: true }] as AdminNavItem[]) : []),
    ...(can(user.role, 'analytics.view') ? ([{ href: '/admin/analytika', label: t('Analytika'), icon: 'chart', group: t('Prehľady') }] as AdminNavItem[]) : []),
    { href: '/admin/platby', label: t('Platby a faktúry'), icon: 'card', group: t('Prehľady'), soon: true },
    ...(can(user.role, 'security.view') ? ([{ href: '/admin/bezpecnost', label: t('Bezpečnosť'), icon: 'shield', group: t('Systém') }] as AdminNavItem[]) : []),
    ...(can(user.role, 'audit.view') ? ([{ href: '/admin/audit', label: t('Záznam zmien'), icon: 'log', group: t('Systém') }] as AdminNavItem[]) : []),
    ...(can(user.role, 'settings.manage') ? ([{ href: '/admin/nastavenia', label: t('Nastavenia'), icon: 'gear', group: t('Systém') }] as AdminNavItem[]) : []),
  ];
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();

  return (
    <div className="adm">
      <aside className="adm__side">
        <Link href="/admin" className="adm__brand">
          <span>
            <LogoLockup height={34} />
            <small>{t('Administrácia')}</small>
          </span>
        </Link>
        <form action="/admin/hladat" role="search" className="adm__search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input type="search" name="q" placeholder={t('Hľadať…')} aria-label={t('Hľadať v administrácii')} maxLength={80} />
        </form>
        <AdminNav items={items} />
        <div className="adm__foot">
          <Link href="/" className="adm__web">
            {t('← Zobraziť web')}
          </Link>
          <Link href="/ucet" className="adm__me">
            <span className="adm__avatar" aria-hidden="true">
              {initials}
            </span>
            <span>
              <strong>
                {user.firstName} {user.lastName}
              </strong>
              <small>{ROLE_LABEL[user.role] ? t(ROLE_LABEL[user.role]) : user.role}</small>
            </span>
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="adm__logout">
              {t('Odhlásiť sa')}
            </button>
          </form>
        </div>
      </aside>
      <div className="adm__main ice">{children}</div>
    </div>
  );
}
