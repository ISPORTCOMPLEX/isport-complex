import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireStaff, can, ROLE_LABEL } from '@/lib/staff';
import { AdmHead, Chip, Empty, Panel, EVENT_LABEL, ago, auditText, fmtDate, fmtDateTime, reasonText } from '@/components/admin/ui';
import { FormAlert } from '@/components/forms/FormAlert';
import { ResetLinkForm } from '@/components/admin/ResetLinkForm';
import { emailEnabled } from '@/lib/email';
import { PAYMENT_LABEL, STATUS_LABEL } from '@/lib/booking/format';
import { euros, fmtDayShort, fmtRange } from '@/lib/booking/time';
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
import { getT } from '@/lib/i18n/server';
import { msg } from '@/lib/i18n/translate';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Detail zákazníka') };
}

const NOTICE: Record<string, { ok: boolean; text: string }> = {
  overeny: { ok: true, text: msg('E-mail je označený ako overený.') },
  odomknuty: { ok: true, text: msg('Účet je odomknutý.') },
  zablokovany: { ok: true, text: msg('Účet je zablokovaný a zákazník bol odhlásený.') },
  odblokovany: { ok: true, text: msg('Účet je odblokovaný.') },
  odhlaseny: { ok: true, text: msg('Zákazník bol odhlásený zo všetkých zariadení.') },
  'reset-odoslany': { ok: true, text: msg('Odkaz na nastavenie nového hesla bol odoslaný e-mailom.') },
  '2fa-zrusene': { ok: true, text: msg('Dvojstupňové overenie bolo zrušené. Zákazník si ho môže nastaviť znova.') },
  'rola-zmenena': { ok: true, text: msg('Rola je zmenená. Platí od ďalšieho prihlásenia.') },
  'nie-sebe': { ok: false, text: msg('Tento zásah sa nedá urobiť na vlastnom účte.') },
  'posledny-admin': { ok: false, text: msg('Nedá sa odobrať rola poslednému administrátorovi.') },
  'bez-zmeny': { ok: false, text: msg('Účet už túto rolu má.') },
  'zla-rola': { ok: false, text: msg('Neplatná rola.') },
  'email-chyba': { ok: false, text: msg('E-mail sa nepodarilo odoslať. Skontroluj nastavenie Resend.') },
  'zablokovany-ucet': { ok: false, text: msg('Zablokovanému účtu sa obnova hesla neposiela.') },
};

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ stav?: string | string[] }> };

export default async function ZakaznikDetail({ params, searchParams }: Props) {
  const t = await getT();
  const { id } = await params;
  const me = await requireStaff('users.view', `/admin/zakaznici/${id}`);
  const sp = await searchParams;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.deletedAt) notFound();

  const manage = can(me.role, 'users.manage');
  const self = me.id === user.id;
  const locked = Boolean(user.lockedUntil && user.lockedUntil > new Date());
  const bookings = can(me.role, 'bookings.view')
    ? await prisma.booking.findMany({ where: { userId: user.id }, orderBy: { startsAt: 'desc' }, take: 15 })
    : [];
  const [events, changes] = await Promise.all([
    prisma.securityEvent.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 15 }),
    manage
      ? prisma.auditLog.findMany({ where: { target: user.id }, orderBy: { createdAt: 'desc' }, take: 10, include: { actor: { select: { firstName: true, lastName: true } } } })
      : Promise.resolve([]),
  ]);
  const notice = typeof sp.stav === 'string' && NOTICE[sp.stav] ? { ...NOTICE[sp.stav], text: t(NOTICE[sp.stav].text) } : undefined;
  const hidden = <input type="hidden" name="userId" value={user.id} />;

  return (
    <div className="adm__stack">
      <Link href="/admin/zakaznici" className="adm-back">
        {t('← Zákazníci')}
      </Link>
      <AdmHead title={`${user.firstName} ${user.lastName}`} sub={user.email}>
        {user.bannedAt ? <Chip tone="red">{t('Zablokovaný')}</Chip> : locked ? <Chip tone="warn">{t('Zamknutý')}</Chip> : user.emailVerifiedAt ? <Chip tone="ok">{t('Aktívny')}</Chip> : <Chip tone="warn">{t('Neoverený')}</Chip>}
        {user.role !== 'CUSTOMER' ? <Chip tone={user.role === 'ADMIN' ? 'red' : 'blue'}>{t(ROLE_LABEL[user.role])}</Chip> : null}
      </AdmHead>

      {notice ? <FormAlert error={notice.ok ? undefined : notice.text} success={notice.ok ? notice.text : undefined} /> : null}

      <div className="adm-grid">
        <Panel title={t('Údaje')}>
          <dl className="adm-dl">
            <div>
              <dt>{t('Telefón')}</dt>
              <dd>{user.phone ?? '—'}</dd>
            </div>
            <div>
              <dt>{t('Rola')}</dt>
              <dd>{t(ROLE_LABEL[user.role])}</dd>
            </div>
            <div>
              <dt>{t('Registrácia')}</dt>
              <dd>{fmtDateTime(user.createdAt, t)}</dd>
            </div>
            <div>
              <dt>{t('E-mail overený')}</dt>
              <dd>{user.emailVerifiedAt ? fmtDateTime(user.emailVerifiedAt, t) : t('Nie')}</dd>
            </div>
            <div>
              <dt>{t('Dvojstupňové overenie')}</dt>
              <dd>{user.twoFactorEnabledAt ? t('Zapnuté od {fmtDate}', { fmtDate: fmtDate(user.twoFactorEnabledAt, t) }) : t('Vypnuté')}</dd>
            </div>
            <div>
              <dt>{t('Súhlas s podmienkami')}</dt>
              <dd>{fmtDateTime(user.termsAcceptedAt, t)}</dd>
            </div>
            <div>
              <dt>{t('Novinky e-mailom')}</dt>
              <dd>{user.marketingOptIn ? t('Áno') : t('Nie')}</dd>
            </div>
            <div>
              <dt>{t('Heslo zmenené')}</dt>
              <dd>{fmtDateTime(user.passwordChangedAt, t)}</dd>
            </div>
            {locked ? (
              <div>
                <dt>{t('Zamknutý do')}</dt>
                <dd>{fmtDateTime(user.lockedUntil, t)}</dd>
              </div>
            ) : null}
            {user.bannedAt ? (
              <div>
                <dt>{t('Zablokovaný')}</dt>
                <dd>{fmtDateTime(user.bannedAt, t)}</dd>
              </div>
            ) : null}
          </dl>
        </Panel>

        <Panel title={t('Rezervácie')}>
          {bookings.length === 0 ? (
            <Empty>{t('Zákazník zatiaľ nemá rezervácie.')}</Empty>
          ) : (
            <ul className="adm-events">
              {bookings.map((b) => (
                <li key={b.id}>
                  <span className={`adm-dot ${b.status === 'CONFIRMED' ? 'adm-dot--ok' : b.status === 'CANCELLED' ? '' : 'adm-dot--bad'}`} />
                  <div>
                    <strong>
                      <Link href={`/admin/rezervacie/${b.id}`}>
                        {fmtDayShort(b.startsAt, t)} · {fmtRange(b.startsAt, b.endsAt)}
                      </Link>
                    </strong>
                    <small>
                      {b.code} · {euros(b.priceCents)} · {t(STATUS_LABEL[b.status])} · {t(PAYMENT_LABEL[b.paymentStatus])}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {manage ? (
        <Panel title={t('Zásahy do účtu')}>
          {self ? <p className="muted adm-note">{t('Toto je tvoj účet – zablokovanie, zmena roly a zrušenie 2FA tu nie sú dostupné.')}</p> : null}
          <div className="adm-actions">
            {!user.emailVerifiedAt ? (
              <form action={adminVerifyEmail}>
                {hidden}
                <button className="btn btn--sm btn--ghost">{t('Označiť e-mail ako overený')}</button>
              </form>
            ) : null}
            {locked ? (
              <form action={adminUnlock}>
                {hidden}
                <button className="btn btn--sm btn--ghost">{t('Odomknúť účet')}</button>
              </form>
            ) : null}
            {!user.bannedAt && emailEnabled() ? (
              <form action={adminSendReset}>
                {hidden}
                <button className="btn btn--sm btn--ghost">{t('Poslať odkaz na nové heslo e-mailom')}</button>
              </form>
            ) : null}
            {!self ? (
              <form action={adminRevokeSessions}>
                {hidden}
                <button className="btn btn--sm btn--ghost">{t('Odhlásiť zo všetkých zariadení')}</button>
              </form>
            ) : null}
          </div>

          {!self && !user.bannedAt ? <ResetLinkForm userId={user.id} /> : null}
          {!self ? (
            <div className="adm-danger">
              <details className="tfa__more">
                <summary>{t('Zmeniť rolu')}</summary>
                <form action={adminSetRole} className="adm-inline-form">
                  {hidden}
                  <label className="sr-only" htmlFor="role">
                    {t('Rola')}
                  </label>
                  <select id="role" name="role" defaultValue={user.role} className="adm-select">
                    {Object.entries(ROLE_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {t(v)}
                      </option>
                    ))}
                  </select>
                  <button className="btn btn--sm">{t('Uložiť rolu')}</button>
                </form>
                <p className="muted adm-note">{t('Personál (recepcia, účtovníctvo, administrátor) musí mať zapnuté dvojstupňové overenie, inak sa do administrácie nedostane.')}</p>
              </details>

              {user.twoFactorEnabledAt ? (
                <details className="tfa__more">
                  <summary>{t('Zrušiť dvojstupňové overenie (stratený telefón)')}</summary>
                  <form action={adminResetTwoFactor} className="adm-inline-form">
                    {hidden}
                    <p className="muted">{t('Použi len po overení totožnosti zákazníka (osobne alebo telefonicky). Zákazník bude odhlásený.')}</p>
                    <button className="btn btn--sm btn--danger">{t('Zrušiť 2FA')}</button>
                  </form>
                </details>
              ) : null}

              {user.bannedAt ? (
                <form action={adminUnban} className="adm-inline-form">
                  {hidden}
                  <button className="btn btn--sm btn--ghost">{t('Odblokovať účet')}</button>
                </form>
              ) : (
                <details className="tfa__more">
                  <summary>{t('Zablokovať účet')}</summary>
                  <form action={adminBan} className="adm-inline-form">
                    {hidden}
                    <label className="adm-label">
                      {t('Dôvod (interná poznámka)')}
                      <input name="reason" maxLength={300} className="adm-input" placeholder={t('napr. opakované neplatenie')} />
                    </label>
                    <button className="btn btn--sm btn--danger">{t('Zablokovať')}</button>
                  </form>
                </details>
              )}
            </div>
          ) : null}
        </Panel>
      ) : null}

      <div className="adm-grid">
        <Panel title={t('Bezpečnostné udalosti')}>
          {events.length === 0 ? (
            <Empty>{t('Žiadne záznamy.')}</Empty>
          ) : (
            <ul className="adm-events">
              {events.map((e) => (
                <li key={e.id}>
                  <span className={`adm-dot ${e.ok ? 'adm-dot--ok' : 'adm-dot--bad'}`} aria-label={e.ok ? t('úspech') : t('neúspech')} />
                  <div>
                    <strong>
                      {EVENT_LABEL[e.type] ? t(EVENT_LABEL[e.type]) : e.type}
                      {e.reason ? <span className="muted"> · {reasonText(e.reason, t)}</span> : null}
                    </strong>
                    <small>
                      {ago(e.createdAt, t)} · IP {e.ip ?? '—'}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {manage ? (
          <Panel title={t('Zásahy personálu')}>
            {changes.length === 0 ? (
              <Empty>{t('Personál do účtu zatiaľ nezasahoval.')}</Empty>
            ) : (
              <ul className="adm-events">
                {changes.map((c) => (
                  <li key={c.id}>
                    <span className="adm-dot" />
                    <div>
                      <strong>{auditText(c.action, c.meta, t)}</strong>
                      <small>
                        {ago(c.createdAt, t)} · {c.actor ? `${c.actor.firstName} ${c.actor.lastName}` : t('neznámy')}
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
