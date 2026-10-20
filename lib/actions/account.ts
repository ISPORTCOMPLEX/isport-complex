'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import type { FormState } from '@/lib/formState';
import { getSessionUser, createSession, destroySession, revokeAllSessions } from '@/lib/session';
import { hitLimit, minutes } from '@/lib/rateLimit';
import { getBaseUrl, getRequestInfo } from '@/lib/requestInfo';
import { logSecurity } from '@/lib/securityLog';
import { checked, isName, isPhone, normalizePhone, raw, str } from '@/lib/validate';
import { hashPassword, passwordProblemStrong, verifyPassword } from '@/lib/password';
import { encrypt, decrypt } from '@/lib/crypto';
import { generateBackupCodes, generateSecret, otpauthUri, verifyTotp } from '@/lib/totp';
import { checkSecondFactor } from '@/lib/secondFactor';
import { emailEnabled, sendSecurityNoticeEmail } from '@/lib/email';

async function notice(user: { email: string; firstName: string }, what: string) {
  if (!emailEnabled()) return;
  try {
    await sendSecurityNoticeEmail(user.email, user.firstName, what, `${await getBaseUrl()}/ucet/zabezpecenie`);
  } catch (err) {
    console.error('[email:security-notice]', err);
  }
}

// Každá akcia si sama overí prihláseného používateľa – nikdy sa nespolieha na údaje z formulára.
async function me() {
  const session = await getSessionUser();
  if (!session) redirect('/prihlasenie?next=/ucet');
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) redirect('/prihlasenie?next=/ucet');
  return user;
}

async function sensitiveLimit(userId: string): Promise<string | null> {
  const r = await hitLimit(`acct:sensitive:${userId}`, 10, 15 * 60);
  return r.ok ? null : `Príliš veľa pokusov. Skús to znova o ${minutes(r.retryAfterSec)} min.`;
}

// ───────────────────────── Profil ─────────────────────────

export async function updateProfileAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await me();
  const values = {
    firstName: str(form, 'firstName', 60),
    lastName: str(form, 'lastName', 60),
    phone: normalizePhone(str(form, 'phone', 30)),
    marketing: checked(form, 'marketing') ? 'on' : '',
  };
  const errors: Record<string, string> = {};
  if (!isName(values.firstName)) errors.firstName = 'Zadaj meno.';
  if (!isName(values.lastName)) errors.lastName = 'Zadaj priezvisko.';
  if (!isPhone(values.phone)) errors.phone = 'Zadaj telefón v tvare +421 9xx xxx xxx.';
  if (Object.keys(errors).length) return { error: 'Skontroluj označené polia.', errors, values };

  const limit = await hitLimit(`acct:profile:${user.id}`, 20, 15 * 60);
  if (!limit.ok) return { error: `Príliš veľa zmien. Skús to znova o ${minutes(limit.retryAfterSec)} min.`, values };

  await prisma.user.update({
    where: { id: user.id },
    data: { firstName: values.firstName, lastName: values.lastName, phone: values.phone || null, marketingOptIn: values.marketing === 'on' },
  });
  revalidatePath('/ucet', 'layout');
  return { success: 'Údaje sú uložené.', values };
}

// ───────────────────────── Heslo ─────────────────────────

export async function changePasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await me();
  const { ip, userAgent } = await getRequestInfo();
  const limited = await sensitiveLimit(user.id);
  if (limited) return { error: limited };

  const current = raw(form, 'current', 200);
  const next = raw(form, 'password', 200);
  if (!(await verifyPassword(current, user.passwordHash))) {
    await logSecurity({ type: 'password-change', ok: false, reason: 'bad-current', userId: user.id, ip, userAgent });
    return { error: 'Súčasné heslo nie je správne.', errors: { current: 'Súčasné heslo nie je správne.' } };
  }
  const problem = await passwordProblemStrong(next, { email: user.email, names: [user.firstName, user.lastName] });
  if (problem) return { error: problem, errors: { password: problem } };
  if (next !== raw(form, 'password2', 200)) return { error: 'Heslá sa nezhodujú.', errors: { password2: 'Heslá sa nezhodujú.' } };
  if (await verifyPassword(next, user.passwordHash)) return { error: 'Nové heslo musí byť iné ako súčasné.', errors: { password: 'Nové heslo musí byť iné ako súčasné.' } };

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next), passwordChangedAt: new Date() } });
  // Ostatné zariadenia sa odhlásia, toto dostane novú reláciu.
  await createSession(user.id);
  await logSecurity({ type: 'password-change', ok: true, userId: user.id, email: user.email, ip, userAgent });
  await notice(user, 'heslo bolo zmenené');
  return { success: 'Heslo je zmenené. Na ostatných zariadeniach sme ťa odhlásili.' };
}

// ───────────────────────── Dvojstupňové overenie (2FA) ─────────────────────────

export async function startTwoFactorAction(_prev: FormState): Promise<FormState> {
  const user = await me();
  if (user.twoFactorEnabledAt) return { error: 'Dvojstupňové overenie už máš zapnuté.' };
  const limited = await sensitiveLimit(user.id);
  if (limited) return { error: limited };

  const secret = generateSecret();
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecretEnc: encrypt(secret), twoFactorLastStep: null } });
  const qr = await QRCode.toDataURL(otpauthUri(secret, user.email), { margin: 1, width: 240, color: { dark: '#000000', light: '#ffffff' } });
  return { qr, secret: secret.replace(/(.{4})/g, '$1 ').trim() };
}

export async function confirmTwoFactorAction(prev: FormState, form: FormData): Promise<FormState> {
  const user = await me();
  const { ip, userAgent } = await getRequestInfo();
  const keep = { qr: prev.qr, secret: prev.secret };
  if (user.twoFactorEnabledAt) return { error: 'Dvojstupňové overenie už máš zapnuté.' };
  if (!user.twoFactorSecretEnc) return { error: 'Začni nastavenie znova.' };
  const limited = await sensitiveLimit(user.id);
  if (limited) return { ...keep, error: limited };

  let secret: string;
  try {
    secret = decrypt(user.twoFactorSecretEnc);
  } catch {
    return { error: 'Začni nastavenie znova.' };
  }
  const step = verifyTotp(secret, str(form, 'code', 20), null);
  if (step === null) {
    await logSecurity({ type: '2fa-change', ok: false, reason: 'bad-code-enable', userId: user.id, ip, userAgent });
    return { ...keep, error: 'Kód nesedí. Skontroluj čas v telefóne a zadaj aktuálny kód.' };
  }
  const { codes, hashes } = generateBackupCodes();
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabledAt: new Date(), twoFactorLastStep: step, twoFactorBackupHashes: hashes },
  });
  await logSecurity({ type: '2fa-change', ok: true, reason: 'enabled', userId: user.id, email: user.email, ip, userAgent });
  // Bez revalidácie – záložné kódy musia ostať na obrazovke, kým si ich používateľ neuloží.
  return { backupCodes: codes, success: 'Dvojstupňové overenie je zapnuté.' };
}

export async function disableTwoFactorAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await me();
  const { ip, userAgent } = await getRequestInfo();
  if (!user.twoFactorEnabledAt) return { error: 'Dvojstupňové overenie nie je zapnuté.' };
  const limited = await sensitiveLimit(user.id);
  if (limited) return { error: limited };

  if (!(await verifyPassword(raw(form, 'password', 200), user.passwordHash))) {
    await logSecurity({ type: '2fa-change', ok: false, reason: 'bad-password-disable', userId: user.id, ip, userAgent });
    return { error: 'Heslo nie je správne.', errors: { password: 'Heslo nie je správne.' } };
  }
  if (!(await checkSecondFactor(user, str(form, 'code', 20)))) {
    await logSecurity({ type: '2fa-change', ok: false, reason: 'bad-code-disable', userId: user.id, ip, userAgent });
    return { error: 'Kód nie je správny.', errors: { code: 'Kód nie je správny.' } };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabledAt: null, twoFactorSecretEnc: null, twoFactorLastStep: null, twoFactorBackupHashes: [] },
  });
  await logSecurity({ type: '2fa-change', ok: true, reason: 'disabled', userId: user.id, email: user.email, ip, userAgent });
  await notice(user, 'dvojstupňové overenie bolo vypnuté');
  revalidatePath('/ucet', 'layout');
  return { success: 'Dvojstupňové overenie je vypnuté.' };
}

export async function regenerateBackupCodesAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await me();
  const { ip, userAgent } = await getRequestInfo();
  if (!user.twoFactorEnabledAt) return { error: 'Dvojstupňové overenie nie je zapnuté.' };
  const limited = await sensitiveLimit(user.id);
  if (limited) return { error: limited };
  if (!(await verifyPassword(raw(form, 'password', 200), user.passwordHash))) {
    return { error: 'Heslo nie je správne.', errors: { password: 'Heslo nie je správne.' } };
  }
  const { codes, hashes } = generateBackupCodes();
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorBackupHashes: hashes } });
  await logSecurity({ type: '2fa-change', ok: true, reason: 'backup-regenerated', userId: user.id, ip, userAgent });
  return { backupCodes: codes, success: 'Nové záložné kódy sú vytvorené. Staré prestali platiť.' };
}

// ───────────────────────── Relácie ─────────────────────────

export async function logoutOthersAction(): Promise<void> {
  const user = await me();
  const { ip, userAgent } = await getRequestInfo();
  await prisma.user.update({ where: { id: user.id }, data: { sessionsRevokedAt: new Date() } });
  await revokeAllSessions(user.id);
  await createSession(user.id);
  await logSecurity({ type: 'sessions', ok: true, reason: 'logout-others', userId: user.id, ip, userAgent });
  redirect('/ucet/zabezpecenie?stav=odhlasene');
}

// ───────────────────────── Zmazanie účtu ─────────────────────────

export async function deleteAccountAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await me();
  const { ip, userAgent } = await getRequestInfo();
  const limited = await sensitiveLimit(user.id);
  if (limited) return { error: limited };

  if (str(form, 'confirm', 20).toUpperCase() !== 'ZMAZAŤ') {
    return { error: 'Pre potvrdenie napíš ZMAZAŤ.', errors: { confirm: 'Napíš ZMAZAŤ.' } };
  }
  if (!(await verifyPassword(raw(form, 'password', 200), user.passwordHash))) {
    await logSecurity({ type: 'account-delete', ok: false, reason: 'bad-password', userId: user.id, ip, userAgent });
    return { error: 'Heslo nie je správne.', errors: { password: 'Heslo nie je správne.' } };
  }
  if (user.twoFactorEnabledAt && !(await checkSecondFactor(user, str(form, 'code', 20)))) {
    return { error: 'Kód z aplikácie nie je správny.', errors: { code: 'Kód nie je správny.' } };
  }

  // Anonymizácia: osobné údaje sa odstránia, záznam ostane kvôli účtovníctvu rezervácií.
  // Budúce rezervácie sa zrušia a ich čas sa uvoľní.
  const now = new Date();
  const future = await prisma.booking.findMany({ where: { userId: user.id, status: 'CONFIRMED', startsAt: { gt: now } }, select: { id: true } });
  await prisma.$transaction([
    prisma.bookingSlot.deleteMany({ where: { bookingId: { in: future.map((f) => f.id) } } }),
    prisma.booking.updateMany({
      where: { id: { in: future.map((f) => f.id) } },
      data: { status: 'CANCELLED', cancelledAt: now, cancelledBy: 'customer', cancelReason: 'Zmazanie účtu' },
    }),
    prisma.booking.updateMany({ where: { userId: user.id }, data: { contactName: 'Zmazaný používateľ', contactPhone: '', note: null } }),
    prisma.authToken.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        email: `zmazany+${user.id}@deleted.invalid`,
        firstName: 'Zmazaný',
        lastName: 'používateľ',
        phone: null,
        passwordHash: null,
        marketingOptIn: false,
        twoFactorEnabledAt: null,
        twoFactorSecretEnc: null,
        twoFactorLastStep: null,
        twoFactorBackupHashes: [],
        deletedAt: now,
        sessionsRevokedAt: now,
      },
    }),
    prisma.securityEvent.updateMany({ where: { userId: user.id }, data: { email: null, ip: null, userAgent: null } }),
  ]);
  await logSecurity({ type: 'account-delete', ok: true, userId: user.id });
  await destroySession();
  redirect('/?stav=ucet-zmazany');
}
