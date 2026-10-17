import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireStaff, can, ROLE_LABEL } from '@/lib/staff';
import { AdmHead, Chip, Empty, Panel, EVENT_LABEL, ago, auditText, fmtDate, fmtDateTime, reasonText } from '@/components/admin/ui';
import { FormAlert } from '@/components/forms/FormAlert';
import {
  adminBan,
  adminResetTwoFactor,
  adminRevokeSessions,
  adminSendReset,
  adminSetRole,
  adminUnban,
  adminUnlock,
  adminVerifyEmail,
} from '@/lib/actions/admin';

export const metadata: Metadata = { title: 'Detail zákazníka' };

const NOTICE: Record<string, { ok: boolean; text: string }> = {
  overeny: { ok: true, text: 'E-mail je označený ako overený.' },
  odomknuty: { ok: true, text: 'Účet je odomknutý.' },
  zablokovany: { ok: true, text: 'Účet je zablokovaný a zákazník bol odhlásený.' },
  odblokovany: { ok: true, text: 'Účet je odblokovaný.' },
  odhlaseny: { ok: true, text: 'Zákazník bol odhlásený zo všetkých zariadení.' },
  'reset-odoslany': { ok: true, text: 'Odkaz na nastavenie nového hesla bol odoslaný e-mailom.' },
  '2fa-zrusene': { ok: true, text: 'Dvojstupňové overenie bolo zrušené. Zákazník si ho môže nastaviť znova.' },
  'rola-zmenena': { ok: true, text: 'Rola je zmenená. Platí od ďalšieho prihlásenia.' },
  'nie-sebe': { ok: false, text: 'Tento zásah sa nedá urobiť na vlastnom účte.' },
  'posledny-admin': { ok: false, text: 'Nedá sa odobrať rola poslednému administrátorovi.' },
  'bez-zmeny': { ok: false, text: 'Účet už túto rolu má.' },
  'zla-rola': { ok: false, text: 'Neplatná rola.' },
  'email-chyba': { ok: false, text: 'E-mail sa nepodarilo odoslať. Skontroluj nastavenie Resend.' },
  'zablokovany-ucet': { ok: false, text: 'Zablokovanému účtu sa obnova hesla neposiela.' },
};

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ stav?: string | string[] }> };

export default async function ZakaznikDetail({ params, searchParams }: Props) {
  const { id } = await params;
  const me = await requireStaff('users.view', `/admin/zakaznici/${id}`);
  const sp = await searchParams;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.deletedAt) notFound();

  const manage = can(me.role, 'users.manage');
  const self = me.id === user.id;
  const locked = Boolean(user.lockedUntil && user.lockedUntil > new Date());
  const [events, changes] = await Promise.all([
    prisma.securityEvent.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 15 }),
    manage
      ? prisma.auditLog.findMany({ where: { target: user.id }, orderBy: { createdAt: 'desc' }, take: 10, include: { actor: { select: { firstName: true, lastName: true } } } })
      : Promise.resolve([]),
  ]);
  const notice = typeof sp.stav === 'string' ? NOTICE[sp.stav] : undefined;
  const hidden = <input type="hidden" name="userId" value={user.id} />;

  return (
    <div className="adm__stack">
      <Link href="/admin/zakaznici" className="adm-back">
        ← Zákazníci
      </Link>
      <AdmHead title={`${user.firstName} ${user.lastName}`} sub={user.email}>
        {user.bannedAt ? <Chip tone="red">Zablokovaný</Chip> : locked ? <Chip tone="warn">Zamknutý</Chip> : user.emailVerifiedAt ? <Chip tone="ok">Aktívny</Chip> : <Chip tone="warn">Neoverený</Chip>}
        {user.role !== 'CUSTOMER' ? <Chip tone={user.role === 'ADMIN' ? 'red' : 'blue'}>{ROLE_LABEL[user.role]}</Chip> : null}
      </AdmHead>

      {notice ? <FormAlert error={notice.ok ? undefined : notice.text} success={notice.ok ? notice.text : undefined} /> : null}

      <div className="adm-grid">
        <Panel title="Údaje">
          <dl className="adm-dl">
            <div>
              <dt>Telefón</dt>
              <dd>{user.phone ?? '—'}</dd>
            </div>
            <div>
              <dt>Rola</dt>
              <dd>{ROLE_LABEL[user.role]}</dd>
            </div>
            <div>
              <dt>Registrácia</dt>
              <dd>{fmtDateTime(user.createdAt)}</dd>
            </div>
            <div>
              <dt>E-mail overený</dt>
              <dd>{user.emailVerifiedAt ? fmtDateTime(user.emailVerifiedAt) : 'Nie'}</dd>
            </div>
            <div>
              <dt>Dvojstupňové overenie</dt>
              <dd>{user.twoFactorEnabledAt ? `Zapnuté od ${fmtDate(user.twoFactorEnabledAt)}` : 'Vypnuté'}</dd>
            </div>
            <div>
              <dt>Súhlas s podmienkami</dt>
              <dd>{fmtDateTime(user.termsAcceptedAt)}</dd>
            </div>
            <div>
              <dt>Novinky e-mailom</dt>
              <dd>{user.marketingOptIn ? 'Áno' : 'Nie'}</dd>
            </div>
            <div>
              <dt>Heslo zmenené</dt>
              <dd>{fmtDateTime(user.passwordChangedAt)}</dd>
            </div>
            {locked ? (
              <div>
                <dt>Zamknutý do</dt>
                <dd>{fmtDateTime(user.lockedUntil)}</dd>
              </div>
            ) : null}
            {user.bannedAt ? (
              <div>
                <dt>Zablokovaný</dt>
                <dd>{fmtDateTime(user.bannedAt)}</dd>
              </div>
            ) : null}
          </dl>
        </Panel>

        <Panel title="Rezervácie">
          <Empty>Rezervácie a platby zákazníka sa tu zobrazia po spustení rezervačného systému.</Empty>
        </Panel>
      </div>

      {manage ? (
        <Panel title="Zásahy do účtu">
          {self ? <p className="muted adm-note">Toto je tvoj účet – zablokovanie, zmena roly a zrušenie 2FA tu nie sú dostupné.</p> : null}
          <div className="adm-actions">
            {!user.emailVerifiedAt ? (
              <form action={adminVerifyEmail}>
                {hidden}
                <button className="btn btn--sm btn--ghost">Označiť e-mail ako overený</button>
              </form>
            ) : null}
            {locked ? (
              <form action={adminUnlock}>
                {hidden}
                <button className="btn btn--sm btn--ghost">Odomknúť účet</button>
              </form>
            ) : null}
            {!user.bannedAt ? (
              <form action={adminSendReset}>
                {hidden}
                <button className="btn btn--sm btn--ghost">Poslať odkaz na nové heslo</button>
              </form>
            ) : null}
            {!self ? (
              <form action={adminRevokeSessions}>
                {hidden}
                <button className="btn btn--sm btn--ghost">Odhlásiť zo všetkých zariadení</button>
              </form>
            ) : null}
          </div>

          {!self ? (
            <div className="adm-danger">
              <details className="tfa__more">
                <summary>Zmeniť rolu</summary>
                <form action={adminSetRole} className="adm-inline-form">
                  {hidden}
                  <label className="sr-only" htmlFor="role">
                    Rola
                  </label>
                  <select id="role" name="role" defaultValue={user.role} className="adm-select">
                    {Object.entries(ROLE_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <button className="btn btn--sm">Uložiť rolu</button>
                </form>
                <p className="muted adm-note">Personál (recepcia, účtovníctvo, administrátor) musí mať zapnuté dvojstupňové overenie, inak sa do administrácie nedostane.</p>
              </details>

              {user.twoFactorEnabledAt ? (
                <details className="tfa__more">
                  <summary>Zrušiť dvojstupňové overenie (stratený telefón)</summary>
                  <form action={adminResetTwoFactor} className="adm-inline-form">
                    {hidden}
                    <p className="muted">Použi len po overení totožnosti zákazníka (osobne alebo telefonicky). Zákazník bude odhlásený.</p>
                    <button className="btn btn--sm btn--danger">Zrušiť 2FA</button>
                  </form>
                </details>
              ) : null}

              {user.bannedAt ? (
                <form action={adminUnban} className="adm-inline-form">
                  {hidden}
                  <button className="btn btn--sm btn--ghost">Odblokovať účet</button>
                </form>
              ) : (
                <details className="tfa__more">
                  <summary>Zablokovať účet</summary>
                  <form action={adminBan} className="adm-inline-form">
                    {hidden}
                    <label className="adm-label">
                      Dôvod (interná poznámka)
                      <input name="reason" maxLength={300} className="adm-input" placeholder="napr. opakované neplatenie" />
                    </label>
                    <button className="btn btn--sm btn--danger">Zablokovať</button>
                  </form>
                </details>
              )}
            </div>
          ) : null}
        </Panel>
      ) : null}

      <div className="adm-grid">
        <Panel title="Bezpečnostné udalosti">
          {events.length === 0 ? (
            <Empty>Žiadne záznamy.</Empty>
          ) : (
            <ul className="adm-events">
              {events.map((e) => (
                <li key={e.id}>
                  <span className={`adm-dot ${e.ok ? 'adm-dot--ok' : 'adm-dot--bad'}`} aria-label={e.ok ? 'úspech' : 'neúspech'} />
                  <div>
                    <strong>
                      {EVENT_LABEL[e.type] ?? e.type}
                      {e.reason ? <span className="muted"> · {reasonText(e.reason)}</span> : null}
                    </strong>
                    <small>
                      {ago(e.createdAt)} · IP {e.ip ?? '—'}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {manage ? (
          <Panel title="Zásahy personálu">
            {changes.length === 0 ? (
              <Empty>Personál do účtu zatiaľ nezasahoval.</Empty>
            ) : (
              <ul className="adm-events">
                {changes.map((c) => (
                  <li key={c.id}>
                    <span className="adm-dot" />
                    <div>
                      <strong>{auditText(c.action, c.meta)}</strong>
                      <small>
                        {ago(c.createdAt)} · {c.actor ? `${c.actor.firstName} ${c.actor.lastName}` : 'neznámy'}
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
