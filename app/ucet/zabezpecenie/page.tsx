import type { Metadata } from 'next';
import { requireUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { PasswordForm } from '@/components/account/PasswordForm';
import { TwoFactorPanel } from '@/components/account/TwoFactorPanel';
import { logoutOthersAction } from '@/lib/actions/account';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { FormAlert } from '@/components/forms/FormAlert';

export const metadata: Metadata = { title: 'Zabezpečenie' };

type Props = { searchParams: Promise<{ stav?: string | string[] }> };

const fmt = new Intl.DateTimeFormat('sk-SK', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Bratislava' });

export default async function ZabezpeceniePage({ searchParams }: Props) {
  const user = await requireUser('/ucet/zabezpecenie');
  const sp = await searchParams;
  const extra = await prisma.user.findUnique({ where: { id: user.id }, select: { twoFactorBackupHashes: true, passwordChangedAt: true } });
  const events = await prisma.securityEvent.findMany({
    where: { userId: user.id, type: { in: ['login', 'login-2fa'] }, ok: true, OR: [{ reason: null }, { reason: { not: 'needs-2fa' } }] },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, createdAt: true, ip: true, userAgent: true },
  });

  return (
    <div className="acct__stack">
      <header className="acct__head">
        <span className="kicker">Môj účet</span>
        <h1 className="display acct__title">Zabezpečenie</h1>
      </header>

      <div className="card acct__panel">
        <TwoFactorPanel enabled={Boolean(user.twoFactorEnabledAt)} backupLeft={extra?.twoFactorBackupHashes.length ?? 0} />
      </div>

      <div className="card acct__panel">
        <PasswordForm />
        {extra?.passwordChangedAt ? <p className="muted acct__note">Naposledy zmenené {fmt.format(extra.passwordChangedAt)}.</p> : null}
      </div>

      <div className="card acct__panel">
        <h2 className="h-card">Prihlásenia a zariadenia</h2>
        <FormAlert success={sp.stav === 'odhlasene' ? 'Ostatné zariadenia sú odhlásené.' : undefined} />
        {events.length > 0 ? (
          <ul className="acct__events">
            {events.map((e) => (
              <li key={e.id}>
                <strong>{fmt.format(e.createdAt)}</strong>
                <span>{describeAgent(e.userAgent)}</span>
                <small>IP {e.ip ?? 'neznáma'}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Zatiaľ žiadne záznamy.</p>
        )}
        <p className="muted">Ak nespoznávaš niektoré prihlásenie, zmeň si heslo a odhlás ostatné zariadenia.</p>
        <form action={logoutOthersAction}>
          <SubmitButton variant="ghost" full={false}>
            Odhlásiť ostatné zariadenia
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

function describeAgent(ua: string | null): string {
  if (!ua) return 'Neznáme zariadenie';
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Iný systém';
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Prehliadač';
  return `${browser} · ${os}`;
}
