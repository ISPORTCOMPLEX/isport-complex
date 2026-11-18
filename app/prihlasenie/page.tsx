import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { LoginForm } from '@/components/auth/LoginForm';
import { createFormStamp } from '@/lib/formGuard';
import { getSessionUser } from '@/lib/session';
import { safeRedirect } from '@/lib/safeRedirect';
import { peekLimit } from '@/lib/rateLimit';
import { getRequestInfo } from '@/lib/requestInfo';
import { createCaptcha } from '@/lib/captcha';
import { getT } from '@/lib/i18n/server';
import { msg } from '@/lib/i18n/translate';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Prihlásenie'), robots: { index: false } };
}

const NOTICES: Record<string, string> = {
  'heslo-zmenene': msg('Heslo je zmenené. Prihlás sa novým heslom.'),
  overeny: msg('E-mail je overený. Teraz sa môžeš prihlásiť.'),
};

type Props = { searchParams: Promise<{ next?: string | string[]; stav?: string | string[] }> };

export default async function PrihlaseniePage({ searchParams }: Props) {
  const t = await getT();
  const sp = await searchParams;
  const next = safeRedirect(typeof sp.next === 'string' ? sp.next : undefined);
  if (await getSessionUser()) redirect(next);
  const notice = typeof sp.stav === 'string' && NOTICES[sp.stav] ? t(NOTICES[sp.stav]) : undefined;
  const { ip } = await getRequestInfo();
  const captcha = (await peekLimit(`login:fail:${ip}`)) >= 3 ? createCaptcha() : null;
  return (
    <AuthShell
      kicker={t('Môj účet')}
      title={
        <>
          {t('Vitaj späť')}
          <br />
          <span className="red">{t('na ľade.')}</span>
        </>
      }
    >
      <LoginForm stamp={createFormStamp()} next={next} notice={notice} captcha={captcha} />
    </AuthShell>
  );
}
