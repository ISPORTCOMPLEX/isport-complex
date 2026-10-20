'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/staff';
import { getBaseUrl, getRequestInfo } from '@/lib/requestInfo';
import { createAuthToken } from '@/lib/tokens';
import { sendResetEmail } from '@/lib/email';
import { hitLimit } from '@/lib/rateLimit';
import { str } from '@/lib/validate';
import type { FormState } from '@/lib/formState';

// Zásahy administrátora do účtov. Každý zásah: kontrola oprávnenia, ochrana pred zásahom do vlastného účtu,
// zápis do záznamu zmien (kto, čo, komu, odkiaľ).

const ROLES: Role[] = ['CUSTOMER', 'CLUB_MANAGER', 'RECEPTION', 'ACCOUNTANT', 'ADMIN'];

async function target(form: FormData) {
  const actor = await requireStaff('users.manage');
  const limit = await hitLimit(`admin:act:${actor.id}`, 60, 10 * 60);
  if (!limit.ok) throw new Error('Príliš veľa zásahov za krátky čas.');
  const id = str(form, 'userId', 40);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.deletedAt) redirect('/admin/zakaznici');
  return { actor, user };
}

async function audit(actorId: string, action: string, targetId: string, meta?: Record<string, unknown>) {
  const { ip } = await getRequestInfo();
  await prisma.auditLog.create({ data: { actorId, action, target: targetId, meta: meta ? JSON.parse(JSON.stringify(meta)) : undefined, ip } });
}

function back(id: string, stav: string): never {
  revalidatePath(`/admin/zakaznici/${id}`);
  redirect(`/admin/zakaznici/${id}?stav=${stav}`);
}

export async function adminVerifyEmail(form: FormData): Promise<void> {
  const { actor, user } = await target(form);
  if (!user.emailVerifiedAt) {
    await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
    await audit(actor.id, 'user.verify-email', user.id, { email: user.email });
  }
  back(user.id, 'overeny');
}

export async function adminUnlock(form: FormData): Promise<void> {
  const { actor, user } = await target(form);
  await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } });
  await audit(actor.id, 'user.unlock', user.id, { email: user.email });
  back(user.id, 'odomknuty');
}

export async function adminBan(form: FormData): Promise<void> {
  const { actor, user } = await target(form);
  if (user.id === actor.id) back(user.id, 'nie-sebe');
  const reason = str(form, 'reason', 300);
  const now = new Date();
  await prisma.user.update({ where: { id: user.id }, data: { bannedAt: now, sessionsRevokedAt: now } });
  await audit(actor.id, 'user.ban', user.id, { email: user.email, reason });
  back(user.id, 'zablokovany');
}

export async function adminUnban(form: FormData): Promise<void> {
  const { actor, user } = await target(form);
  await prisma.user.update({ where: { id: user.id }, data: { bannedAt: null } });
  await audit(actor.id, 'user.unban', user.id, { email: user.email });
  back(user.id, 'odblokovany');
}

export async function adminRevokeSessions(form: FormData): Promise<void> {
  const { actor, user } = await target(form);
  if (user.id === actor.id) back(user.id, 'nie-sebe');
  await prisma.user.update({ where: { id: user.id }, data: { sessionsRevokedAt: new Date() } });
  await audit(actor.id, 'user.revoke-sessions', user.id, { email: user.email });
  back(user.id, 'odhlaseny');
}

export async function adminSendReset(form: FormData): Promise<void> {
  const { actor, user } = await target(form);
  if (user.bannedAt) back(user.id, 'zablokovany-ucet');
  const token = await createAuthToken(user.id, 'RESET_PASSWORD');
  const base = await getBaseUrl();
  try {
    await sendResetEmail(user.email, user.firstName, `${base}/obnova-hesla?token=${token}`);
  } catch (err) {
    console.error('[admin:reset-email]', err);
    back(user.id, 'email-chyba');
  }
  await audit(actor.id, 'user.send-reset', user.id, { email: user.email });
  back(user.id, 'reset-odoslany');
}

export async function adminResetTwoFactor(form: FormData): Promise<void> {
  const { actor, user } = await target(form);
  if (user.id === actor.id) back(user.id, 'nie-sebe');
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabledAt: null, twoFactorSecretEnc: null, twoFactorLastStep: null, twoFactorBackupHashes: [], sessionsRevokedAt: new Date() },
  });
  await audit(actor.id, 'user.reset-2fa', user.id, { email: user.email });
  back(user.id, '2fa-zrusene');
}

export async function adminSetRole(form: FormData): Promise<void> {
  const { actor, user } = await target(form);
  const role = str(form, 'role', 20) as Role;
  if (!ROLES.includes(role)) back(user.id, 'zla-rola');
  if (user.id === actor.id) back(user.id, 'nie-sebe');
  if (user.role === role) back(user.id, 'bez-zmeny');
  if (user.role === 'ADMIN') {
    const admins = await prisma.user.count({ where: { role: 'ADMIN', deletedAt: null, bannedAt: null } });
    if (admins <= 1) back(user.id, 'posledny-admin');
  }
  // Zmena roly zneplatní relácie – nové oprávnenia platia od ďalšieho prihlásenia.
  await prisma.user.update({ where: { id: user.id }, data: { role, sessionsRevokedAt: new Date() } });
  await audit(actor.id, 'user.role', user.id, { email: user.email, from: user.role, to: role });
  back(user.id, 'rola-zmenena');
}

// Jednorazový odkaz na nové heslo, ktorý personál odovzdá zákazníkovi inak než e-mailom (SMS, osobne).
// Použiť len po overení totožnosti. Platí 1 hodinu, zobrazí sa iba raz a zapíše sa do záznamu zmien.
export async function adminResetLinkAction(_prev: FormState, form: FormData): Promise<FormState> {
  const actor = await requireStaff('users.manage');
  const id = str(form, 'userId', 40);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.deletedAt) return { error: 'Účet neexistuje.' };
  if (user.bannedAt) return { error: 'Zablokovanému účtu sa odkaz nevytvára.' };
  if (user.id === actor.id) return { error: 'Vlastné heslo si zmeň v Môj účet → Zabezpečenie.' };
  const token = await createAuthToken(user.id, 'RESET_PASSWORD');
  const base = await getBaseUrl();
  await audit(actor.id, 'user.reset-link', user.id, { email: user.email });
  return { success: 'Odkaz je vytvorený. Platí 1 hodinu a dá sa použiť raz. Pošli ho zákazníkovi SMS-kou alebo cez WhatsApp.', values: { link: `${base}/obnova-hesla?token=${token}` } };
}
