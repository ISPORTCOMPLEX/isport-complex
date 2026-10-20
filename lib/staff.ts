import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { getSessionUser, type SessionUser } from './session';

// Personál a oprávnenia. Zákazník ani neprihlásený návštevník administráciu neuvidí (404).
// Každý člen personálu musí mať zapnuté dvojstupňové overenie.

export const STAFF_ROLES = ['ADMIN', 'RECEPTION', 'ACCOUNTANT'] as const;

export type Permission =
  | 'dashboard'
  | 'analytics.view'
  | 'media.manage'
  | 'users.view'
  | 'users.manage'
  | 'security.view'
  | 'audit.view'
  | 'bookings.view'
  | 'bookings.manage'
  | 'payments.manage'
  | 'settings.manage'
  | 'inquiries.manage';

const PERMS: Record<string, Permission[]> = {
  ADMIN: ['dashboard', 'analytics.view', 'media.manage', 'users.view', 'users.manage', 'security.view', 'audit.view', 'bookings.view', 'bookings.manage', 'payments.manage', 'settings.manage', 'inquiries.manage'],
  RECEPTION: ['dashboard', 'media.manage', 'users.view', 'bookings.view', 'bookings.manage', 'payments.manage', 'inquiries.manage'],
  ACCOUNTANT: ['dashboard', 'analytics.view', 'users.view', 'bookings.view', 'payments.manage'],
};

export const ROLE_LABEL: Record<string, string> = {
  CUSTOMER: 'Zákazník',
  CLUB_MANAGER: 'Manažér klubu',
  RECEPTION: 'Recepcia',
  ACCOUNTANT: 'Účtovníctvo',
  ADMIN: 'Administrátor',
};

export function isStaff(role: string): boolean {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

export function can(role: string, perm: Permission): boolean {
  return PERMS[role]?.includes(perm) ?? false;
}

export async function requireStaff(perm: Permission, next = '/admin'): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/prihlasenie?next=${encodeURIComponent(next)}`);
  if (!isStaff(user.role)) notFound();
  if (!user.twoFactorEnabledAt) redirect('/ucet/zabezpecenie?stav=admin-2fa');
  if (!can(user.role, perm)) notFound();
  return user;
}
