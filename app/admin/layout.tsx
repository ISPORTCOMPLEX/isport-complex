import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff, can, ROLE_LABEL } from '@/lib/staff';
import { AdminNav, type AdminNavItem } from '@/components/admin/AdminNav';
import { LogoMark, Wordmark } from '@/components/Logo';
import { logoutAction } from '@/lib/actions/auth';
import { prisma } from '@/lib/prisma';
import { addDays, hallTime, todayIso } from '@/lib/booking/time';

export const metadata: Metadata = { title: { default: 'Administrácia', template: '%s · Administrácia' }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff('dashboard');
  // Odznak pri Rezerváciách: dnešné nezaplatené rezervácie.
  const today = todayIso();
  const unpaidToday = can(user.role, 'bookings.view')
    ? await prisma.booking.count({
        where: { status: 'CONFIRMED', paymentStatus: 'UNPAID', startsAt: { gte: hallTime(today, 0), lt: hallTime(addDays(today, 1), 0) } },
      })
    : 0;
  const newInquiries = can(user.role, 'inquiries.manage') ? await prisma.inquiry.count({ where: { status: 'NEW' } }) : 0;
  const B = can(user.role, 'bookings.view');
  const items: AdminNavItem[] = [
    { href: '/admin', label: 'Prehľad', icon: 'home', group: '' },
    ...(B
      ? ([
          { href: '/admin/recepcia', label: 'Recepcia', icon: 'scan', group: 'Ľadová plocha' },
          { href: '/admin/kalendar', label: 'Kalendár', icon: 'cal', group: 'Ľadová plocha' },
          { href: '/admin/rezervacie', label: 'Rezervácie', icon: 'list', group: 'Ľadová plocha', badge: unpaidToday || undefined },
        ] as AdminNavItem[])
      : []),
    ...(can(user.role, 'users.view') ? ([{ href: '/admin/zakaznici', label: 'Zákazníci a kluby', icon: 'users', group: 'Ľudia' }] as AdminNavItem[]) : []),
    ...(can(user.role, 'inquiries.manage') ? ([{ href: '/admin/dopyty', label: 'Dopyty', icon: 'mail', group: 'Ľudia', badge: newInquiries || undefined }] as AdminNavItem[]) : []),
    ...(can(user.role, 'analytics.view') ? ([{ href: '/admin/analytika', label: 'Analytika', icon: 'chart', group: 'Prehľady' }] as AdminNavItem[]) : []),
    { href: '/admin/platby', label: 'Platby a faktúry', icon: 'card', group: 'Prehľady', soon: true },
    ...(can(user.role, 'security.view') ? ([{ href: '/admin/bezpecnost', label: 'Bezpečnosť', icon: 'shield', group: 'Systém' }] as AdminNavItem[]) : []),
    ...(can(user.role, 'audit.view') ? ([{ href: '/admin/audit', label: 'Záznam zmien', icon: 'log', group: 'Systém' }] as AdminNavItem[]) : []),
    ...(can(user.role, 'settings.manage') ? ([{ href: '/admin/nastavenia', label: 'Nastavenia', icon: 'gear', group: 'Systém' }] as AdminNavItem[]) : []),
  ];
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();

  return (
    <div className="adm">
      <aside className="adm__side">
        <Link href="/admin" className="adm__brand">
          <LogoMark size={32} />
          <span>
            <Wordmark className="adm__wm" />
            <small>Administrácia</small>
          </span>
        </Link>
        <form action="/admin/hladat" role="search" className="adm__search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input type="search" name="q" placeholder="Hľadať…" aria-label="Hľadať v administrácii" maxLength={80} />
        </form>
        <AdminNav items={items} />
        <div className="adm__foot">
          <Link href="/" className="adm__web">
            ← Zobraziť web
          </Link>
          <Link href="/ucet" className="adm__me">
            <span className="adm__avatar" aria-hidden="true">
              {initials}
            </span>
            <span>
              <strong>
                {user.firstName} {user.lastName}
              </strong>
              <small>{ROLE_LABEL[user.role] ?? user.role}</small>
            </span>
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="adm__logout">
              Odhlásiť sa
            </button>
          </form>
        </div>
      </aside>
      <div className="adm__main ice">{children}</div>
    </div>
  );
}
