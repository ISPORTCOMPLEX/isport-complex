import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff, can, ROLE_LABEL } from '@/lib/staff';
import { AdminNav, type AdminNavItem } from '@/components/admin/AdminNav';
import { LogoMark } from '@/components/Logo';
import { logoutAction } from '@/lib/actions/auth';

export const metadata: Metadata = { title: { default: 'Administrácia', template: '%s · Administrácia' }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff('dashboard');
  const items: AdminNavItem[] = [
    { href: '/admin', label: 'Prehľad' },
    { href: '/admin/kalendar', label: 'Kalendár ľadu', soon: true },
    { href: '/admin/rezervacie', label: 'Rezervácie', soon: true },
    ...(can(user.role, 'users.view') ? [{ href: '/admin/zakaznici', label: 'Zákazníci a kluby' }] : []),
    { href: '/admin/platby', label: 'Platby a faktúry', soon: true },
    { href: '/admin/dopyty', label: 'Dopyty od klubov', soon: true },
    ...(can(user.role, 'security.view') ? [{ href: '/admin/bezpecnost', label: 'Bezpečnosť' }] : []),
    ...(can(user.role, 'audit.view') ? [{ href: '/admin/audit', label: 'Záznam zmien' }] : []),
    { href: '/admin/nastavenia', label: 'Cenník a nastavenia', soon: true },
  ];
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();

  return (
    <div className="adm">
      <aside className="adm__side">
        <Link href="/admin" className="adm__brand">
          <LogoMark size={34} />
          <span>
            <strong>I-SPORT</strong>
            <small>Administrácia</small>
          </span>
        </Link>
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
      <div className="adm__main">{children}</div>
    </div>
  );
}
