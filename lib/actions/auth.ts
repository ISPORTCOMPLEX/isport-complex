'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import type { FormState } from '@/lib/formState';
import { checkFormGuard } from '@/lib/formGuard';
import { createCaptcha, verifyCaptcha } from '@/lib/captcha';
import { clearLimit, hitLimit, minutes, peekLimit } from '@/lib/rateLimit';
import { getBaseUrl, getRequestInfo } from '@/lib/requestInfo';
import { logSecurity } from '@/lib/securityLog';
import { checked, isEmail, isName, isPhone, normalizeEmail, normalizePhone, raw, str } from '@/lib/validate';
import { hashPassword, passwordProblemStrong, verifyPassword } from '@/lib/password';
import { checkEmailDomain } from '@/lib/disposableEmail';
import { createAuthToken, consumeAuthToken } from '@/lib/tokens';
import { emailEnabled, sendAlreadyRegisteredEmail, sendResetEmail, sendVerifyEmail } from '@/lib/email';
import { createSession, destroySession, getPending2fa, setPending2fa } from '@/lib/session';
import { safeRedirect } from '@/lib/safeRedirect';
import { sha256 } from '@/lib/crypto';
import { checkSecondFactor } from '@/lib/secondFactor';

const MAX_FAILED = 5;
const LOGIN_CAPTCHA_AFTER = 3;
const LOCK_MIN = 15;
const BOT_MESSAGE = 'Formulár sa nepodarilo odoslať. Obnov stránku a skús to znova.';

function tooMany(sec: number): string {
  return `Príliš veľa pokusov. Skús to znova o ${minutes(sec)} min.`;
}

// Vývojový režim bez Resendu: odkaz z e-mailu sa ukáže priamo na stránke, aby sa dalo testovať.
// Na produkcii (alebo s RESEND_API_KEY) sa nikdy nezobrazí.
function devLink(url: string): string | undefined {
  return process.env.NODE_ENV !== 'production' && !process.env.RESEND_API_KEY ? url : undefined;
}

async function mailSafely(fn: () => Promise<void>, label: string) {
  try {
    await fn();
  } catch (err) {
    console.error(`[email:${label}]`, err);
  }
}

// ───────────────────────── Registrácia ─────────────────────────

export async function registerAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { ip, userAgent } = await getRequestInfo();
  const values = {
    firstName: str(form, 'firstName', 60),
    lastName: str(form, 'lastName', 60),
    email: normalizeEmail(str(form, 'email', 254)),
    phone: normalizePhone(str(form, 'phone', 30)),
  };
  const fresh = () => createCaptcha();

  const guard = checkFormGuard(form);
  if (!guard.ok) {
    await logSecurity({ type: 'register', ok: false, reason: guard.reason, email: values.email, ip, userAgent });
    return { error: BOT_MESSAGE, values, captcha: fresh() };
  }

  const burst = await hitLimit(`reg:ip15:${ip}`, 8, 15 * 60);
  const hourly = await hitLimit(`reg:ip60:${ip}`, 20, 60 * 60);
  if (!burst.ok || !hourly.ok) {
    await logSecurity({ type: 'register', ok: false, reason: 'rate-limit', email: values.email, ip, userAgent });
    return { error: tooMany(Math.max(burst.ok ? 0 : burst.retryAfterSec, hourly.ok ? 0 : hourly.retryAfterSec)), values, captcha: fresh() };
  }

  const errors: Record<string, string> = {};
  if (!isName(values.firstName)) errors.firstName = 'Zadaj meno.';
  if (!isName(values.lastName)) errors.lastName = 'Zadaj priezvisko.';
  if (!isEmail(values.email)) errors.email = 'Zadaj platný e-mail.';
  if (!isPhone(values.phone)) errors.phone = 'Zadaj telefón v tvare +421 9xx xxx xxx.';
  const password = raw(form, 'password', 200);
  const pwProblem = await passwordProblemStrong(password, { email: values.email, names: [values.firstName, values.lastName] });
  if (pwProblem) errors.password = pwProblem;
  else if (password !== raw(form, 'password2', 200)) errors.password2 = 'Heslá sa nezhodujú.';
  if (!checked(form, 'age')) errors.age = 'Registrácia je možná od 16 rokov.';
  if (!checked(form, 'terms')) errors.terms = 'Bez súhlasu s podmienkami sa nedá registrovať.';

  const captchaOk = await verifyCaptcha(str(form, 'captcha_token', 400), str(form, 'captcha', 10));
  if (!captchaOk) errors.captcha = 'Znaky z obrázka nesedia. Skús nový obrázok.';

  if (Object.keys(errors).length > 0) {
    await logSecurity({ type: 'register', ok: false, reason: `invalid:${Object.keys(errors).join(',')}`, email: values.email, ip, userAgent });
    return { error: 'Skontroluj označené polia.', errors, values, captcha: fresh() };
  }

  const domain = await checkEmailDomain(values.email);
  if (!domain.ok) {
    await logSecurity({ type: 'register', ok: false, reason: domain.reason, email: values.email, ip, userAgent });
    return { error: domain.message, errors: { email: domain.message }, values, captcha: fresh() };
  }

  const base = await getBaseUrl();
  const existing = await prisma.user.findUnique({ where: { email: values.email } });
  let link: string | undefined;

  // Rovnaká odpoveď pre nový aj existujúci e-mail – z webu sa nedá zistiť, kto má účet.
  if (existing) {
    if (!existing.deletedAt && !existing.bannedAt) {
      if (existing.emailVerifiedAt) {
        await mailSafely(() => sendAlreadyRegisteredEmail(existing.email, existing.firstName, `${base}/zabudnute-heslo`), 'already');
        link = devLink(`${base}/prihlasenie`);
      } else {
        // Pôvodný neoverený účet sa nemení (ochrana pred prevzatím účtu), len pošleme nový odkaz.
        const token = await createAuthToken(existing.id, 'VERIFY_EMAIL');
        const url = `${base}/overenie-emailu?token=${token}`;
        await mailSafely(() => sendVerifyEmail(existing.email, existing.firstName, url), 'verify');
        link = devLink(url);
      }
    }
    await logSecurity({ type: 'register', ok: false, reason: 'exists', email: values.email, userId: existing.id, ip, userAgent });
    return { done: true, values: { email: values.email }, devLink: link, manual: !emailEnabled() };
  }

  const now = new Date();
  const user = await prisma.user.create({
    data: {
      email: values.email,
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone || null,
      passwordHash: await hashPassword(password),
      termsAcceptedAt: now,
      ageConfirmedAt: now,
      marketingOptIn: checked(form, 'marketing'),
    },
  });
  const token = await createAuthToken(user.id, 'VERIFY_EMAIL');
  const url = `${base}/overenie-emailu?token=${token}`;
  await mailSafely(() => sendVerifyEmail(user.email, user.firstName, url), 'verify');
  await logSecurity({ type: 'register', ok: true, email: user.email, userId: user.id, ip, userAgent });
  return { done: true, values: { email: values.email }, devLink: devLink(url), manual: !emailEnabled() };
}

// ───────────────────────── Overenie e-mailu ─────────────────────────

export async function resendVerificationAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { ip, userAgent } = await getRequestInfo();
  const email = normalizeEmail(str(form, 'email', 254));
  const answer: FormState = emailEnabled()
    ? { success: 'Ak účet čaká na overenie, poslali sme nový odkaz. Pozri aj priečinok Spam.' }
    : { success: 'E-maily momentálne neposielame. Účet ti aktivuje recepcia – zvyčajne do 24 hodín, alebo nám zavolaj.' };
  if (!isEmail(email)) return answer;
  const byIp = await hitLimit(`resend:ip:${ip}`, 10, 60 * 60);
  const byEmail = await hitLimit(`resend:email:${sha256(email)}`, 3, 60 * 60);
  if (!byIp.ok || !byEmail.ok) return { error: tooMany(Math.max(byIp.retryAfterSec, byEmail.retryAfterSec)) };
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.emailVerifiedAt && !user.deletedAt && !user.bannedAt) {
    const token = await createAuthToken(user.id, 'VERIFY_EMAIL');
    const base = await getBaseUrl();
    const url = `${base}/overenie-emailu?token=${token}`;
    await mailSafely(() => sendVerifyEmail(user.email, user.firstName, url), 'verify');
    await logSecurity({ type: 'verify-email', ok: true, reason: 'resend', email, userId: user.id, ip, userAgent });
    return { ...answer, devLink: devLink(url) };
  }
  return answer;
}

// ───────────────────────── Prihlásenie ─────────────────────────

export async function loginAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { ip, userAgent } = await getRequestInfo();
  const email = normalizeEmail(str(form, 'email', 254));
  const password = raw(form, 'password', 200);
  const next = safeRedirect(str(form, 'next', 500));
  const values = { email };
  const generic = 'Nesprávny e-mail alebo heslo.';

  const guard = checkFormGuard(form);
  if (!guard.ok) {
    await logSecurity({ type: 'login', ok: false, reason: guard.reason, email, ip, userAgent });
    return { error: BOT_MESSAGE, values };
  }

  const byIp = await hitLimit(`login:ip:${ip}`, 20, 15 * 60);
  if (!byIp.ok) {
    await logSecurity({ type: 'login', ok: false, reason: 'rate-limit-ip', email, ip, userAgent });
    return { error: tooMany(byIp.retryAfterSec), values };
  }
  // Po 3 neúspešných pokusoch z tej istej adresy chceme aj CAPTCHA (zastaví hádanie hesiel botmi).
  const failKey = `login:fail:${ip}`;
  if ((await peekLimit(failKey)) >= LOGIN_CAPTCHA_AFTER) {
    const ok = await verifyCaptcha(str(form, 'captcha_token', 400), str(form, 'captcha', 10));
    if (!ok) {
      await logSecurity({ type: 'login', ok: false, reason: 'captcha', email, ip, userAgent });
      return { error: 'Opíš znaky z obrázka.', errors: { captcha: 'Znaky nesedia, skús nový obrázok.' }, values, captcha: createCaptcha() };
    }
  }
  const failed = async (): Promise<FormState> => {
    const r = await hitLimit(failKey, 1000, 15 * 60);
    return { error: generic, values, captcha: r.count >= LOGIN_CAPTCHA_AFTER ? createCaptcha() : undefined };
  };

  if (!isEmail(email) || password.length === 0) return failed();
  const byEmail = await hitLimit(`login:email:${sha256(email)}`, 10, 15 * 60);
  if (!byEmail.ok) {
    await logSecurity({ type: 'login', ok: false, reason: 'rate-limit-email', email, ip, userAgent });
    return { error: tooMany(byEmail.retryAfterSec), values };
  }

  const found = await prisma.user.findUnique({ where: { email } });
  const user = found && !found.deletedAt ? found : null;

  // Zamknutý účet: o zámku povieme len tomu, kto zadal správne heslo – inak sa nedá zistiť, že účet existuje.
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    const right = await verifyPassword(password, user.passwordHash);
    await logSecurity({ type: 'login', ok: false, reason: 'locked', email, userId: user.id, ip, userAgent });
    await hitLimit(`login:fail:${ip}`, 1000, 15 * 60);
    return right
      ? { error: `Účet je dočasne zamknutý pre veľa neúspešných pokusov. Skús to znova o ${minutes((user.lockedUntil.getTime() - Date.now()) / 1000)} min alebo si obnov heslo.`, values }
      : await failed();
  }

  const ok = await verifyPassword(password, user?.passwordHash);
  if (!user || !ok) {
    if (user) {
      const failed = user.failedLoginCount + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: failed >= MAX_FAILED ? { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCK_MIN * 60 * 1000) } : { failedLoginCount: failed },
      });
    }
    await logSecurity({ type: 'login', ok: false, reason: user ? 'bad-password' : 'no-user', email, userId: user?.id, ip, userAgent });
    return failed();
  }
  await clearLimit(failKey);

  if (user.bannedAt) {
    await logSecurity({ type: 'login', ok: false, reason: 'banned', email, userId: user.id, ip, userAgent });
    return { error: 'Účet je zablokovaný. Kontaktuj nás, prosím.', values };
  }
  if (!user.emailVerifiedAt) {
    await logSecurity({ type: 'login', ok: false, reason: 'unverified', email, userId: user.id, ip, userAgent });
    return emailEnabled()
      ? { error: 'Najprv over svoj e-mail – odkaz sme ti poslali pri registrácii.', unverifiedEmail: email, values }
      : { error: 'Účet čaká na aktiváciu recepciou (zvyčajne do 24 hodín). Ak sa ponáhľaš, zavolaj nám.', values };
  }

  if (user.failedLoginCount > 0 || user.lockedUntil) {
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } });
  }

  if (user.twoFactorEnabledAt && user.twoFactorSecretEnc) {
    await setPending2fa(user.id, next);
    await logSecurity({ type: 'login', ok: true, reason: 'needs-2fa', email, userId: user.id, ip, userAgent });
    redirect('/prihlasenie/2fa');
  }

  await createSession(user.id);
  await logSecurity({ type: 'login', ok: true, email, userId: user.id, ip, userAgent });
  redirect(next);
}

export async function twoFactorLoginAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { ip, userAgent } = await getRequestInfo();
  const pending = await getPending2fa();
  if (!pending) return { error: 'Čas na zadanie kódu vypršal. Prihlás sa znova.' };

  const limit = await hitLimit(`2fa:user:${pending.userId}`, 10, 15 * 60);
  if (!limit.ok) {
    await logSecurity({ type: 'login-2fa', ok: false, reason: 'rate-limit', userId: pending.userId, ip, userAgent });
    return { error: tooMany(limit.retryAfterSec) };
  }

  const user = await prisma.user.findUnique({ where: { id: pending.userId } });
  if (!user || user.deletedAt || user.bannedAt || !user.twoFactorSecretEnc || !user.twoFactorEnabledAt) {
    return { error: 'Prihlás sa znova.' };
  }

  const ok = await checkSecondFactor(user, str(form, 'code', 20));
  if (!ok) {
    await logSecurity({ type: 'login-2fa', ok: false, reason: 'bad-code', userId: user.id, ip, userAgent });
    return { error: 'Kód nie je správny alebo už bol použitý.' };
  }

  await createSession(user.id);
  await logSecurity({ type: 'login-2fa', ok: true, userId: user.id, email: user.email, ip, userAgent });
  redirect(safeRedirect(pending.next));
}

// ───────────────────────── Zabudnuté heslo ─────────────────────────

export async function forgotPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { ip, userAgent } = await getRequestInfo();
  const email = normalizeEmail(str(form, 'email', 254));
  const answer: FormState = { done: true, values: { email }, manual: !emailEnabled() };

  const guard = checkFormGuard(form);
  if (!guard.ok) return { error: BOT_MESSAGE, values: { email } };
  if (!isEmail(email)) return { error: 'Zadaj platný e-mail.', errors: { email: 'Zadaj platný e-mail.' }, values: { email } };

  const byIp = await hitLimit(`forgot:ip:${ip}`, 10, 60 * 60);
  if (!byIp.ok) return { error: tooMany(byIp.retryAfterSec), values: { email } };
  // Pri prekročení limitu na e-mail odpovedáme rovnako – nič neprezradíme.
  const byEmail = await hitLimit(`forgot:email:${sha256(email)}`, 3, 60 * 60);
  if (!byEmail.ok) return answer;

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.deletedAt && !user.bannedAt) {
    const token = await createAuthToken(user.id, 'RESET_PASSWORD');
    const base = await getBaseUrl();
    const url = `${base}/obnova-hesla?token=${token}`;
    await mailSafely(() => sendResetEmail(user.email, user.firstName, url), 'reset');
    await logSecurity({ type: 'password-reset', ok: true, reason: 'requested', email, userId: user.id, ip, userAgent });
    return { ...answer, devLink: devLink(url) };
  } else {
    await logSecurity({ type: 'password-reset', ok: false, reason: 'no-user', email, ip, userAgent });
  }
  return answer;
}

export async function resetPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { ip, userAgent } = await getRequestInfo();
  const limit = await hitLimit(`reset:ip:${ip}`, 10, 15 * 60);
  if (!limit.ok) return { error: tooMany(limit.retryAfterSec) };

  const password = raw(form, 'password', 200);
  const problem = await passwordProblemStrong(password);
  if (problem) return { error: problem, errors: { password: problem } };
  if (password !== raw(form, 'password2', 200)) return { error: 'Heslá sa nezhodujú.', errors: { password2: 'Heslá sa nezhodujú.' } };

  const userId = await consumeAuthToken(str(form, 'token', 200), 'RESET_PASSWORD');
  if (!userId) {
    await logSecurity({ type: 'password-reset', ok: false, reason: 'bad-token', ip, userAgent });
    return { error: 'Odkaz na obnovu je neplatný alebo vypršal. Vyžiadaj si nový.' };
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt || user.bannedAt) return { error: 'Odkaz na obnovu je neplatný alebo vypršal. Vyžiadaj si nový.' };

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(password),
      passwordChangedAt: new Date(),
      failedLoginCount: 0,
      lockedUntil: null,
      // odkaz prišiel na e-mail, takže e-mail je tým overený
      emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
    },
  });
  await prisma.authToken.deleteMany({ where: { userId, type: 'RESET_PASSWORD' } });
  await destroySession();
  await logSecurity({ type: 'password-reset', ok: true, email: user.email, userId, ip, userAgent });
  redirect('/prihlasenie?stav=heslo-zmenene');
}

// ───────────────────────── Odhlásenie ─────────────────────────

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect('/');
}
