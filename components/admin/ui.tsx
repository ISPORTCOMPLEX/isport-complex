import Link from 'next/link';
import { Dyn } from '@/components/Dyn';
import { getT } from '@/lib/i18n/server';
import { msg, type T } from '@/lib/i18n/translate';

// Drobné stavebné prvky administrácie (serverové komponenty).

export function AdmHead({ title, sub, children }: { title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="adm__head">
      <div>
        <h1 className="display adm__title">{title}</h1>
        {sub ? <p className="muted">{sub}</p> : null}
      </div>
      {children ? <div className="adm__head-actions">{children}</div> : null}
    </header>
  );
}

export function Stat({ label, value, note, tone }: { label: string; value: React.ReactNode; note?: React.ReactNode; tone?: 'red' | 'ok' | 'warn' }) {
  return (
    <div className={`adm-stat${tone ? ` adm-stat--${tone}` : ''}`}>
      <span className="adm-stat__label">{label}</span>
      <strong className="num adm-stat__value">{value}</strong>
      {note ? <span className="adm-stat__note">{note}</span> : null}
    </div>
  );
}

export function Chip({ tone = 'muted', children }: { tone?: 'ok' | 'warn' | 'red' | 'blue' | 'muted'; children: React.ReactNode }) {
  return <span className={`chip chip--${tone}`}>{children}</span>;
}

export function Panel({ title, action, children, className = '' }: { title?: string; action?: { href: string; label: string }; children: React.ReactNode; className?: string }) {
  return (
    <section className={`adm-panel ${className}`}>
      {title ? (
        <div className="adm-panel__head">
          <h2>{title}</h2>
          {action ? (
            <Link href={action.href} className="link-red">
              {action.label} →
            </Link>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="adm-empty">{children}</p>;
}

const DT_OPTS: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' };
const D_OPTS: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'Europe/Bratislava' };

// t = preklad (jeho t.intl určuje formát dátumu podľa jazyka)
export function fmtDateTime(v: Date | null | undefined, t: T): string {
  return v ? new Intl.DateTimeFormat(t.intl, DT_OPTS).format(v) : '—';
}

export function fmtDate(v: Date | null | undefined, t: T): string {
  return v ? new Intl.DateTimeFormat(t.intl, D_OPTS).format(v) : '—';
}

export function ago(v: Date | null | undefined, t: T): string {
  if (!v) return t('nikdy');
  const s = Math.round((Date.now() - v.getTime()) / 1000);
  if (s < 60) return t('práve teraz');
  if (s < 3600) return t('pred {n} min', { n: Math.round(s / 60) });
  if (s < 86400) return t('pred {n} h', { n: Math.round(s / 3600) });
  if (s < 7 * 86400) return t('pred {n} d', { n: Math.round(s / 86400) });
  return fmtDate(v, t);
}

export const EVENT_LABEL: Record<string, string> = {
  register: msg('Registrácia'),
  login: msg('Prihlásenie'),
  'login-2fa': msg('Prihlásenie 2FA'),
  'password-reset': msg('Obnova hesla'),
  'password-change': msg('Zmena hesla'),
  'verify-email': msg('Overenie e-mailu'),
  'account-delete': msg('Zmazanie účtu'),
  '2fa-change': msg('Zmena 2FA'),
  sessions: msg('Relácie'),
  export: msg('Export údajov'),
};

export const REASON_LABEL: Record<string, string> = {
  'bad-password': msg('zlé heslo'),
  captcha: msg('nesprávna CAPTCHA'),
  'no-user': msg('neexistujúci účet'),
  locked: msg('účet zamknutý'),
  banned: msg('účet zablokovaný'),
  unverified: msg('neoverený e-mail'),
  'rate-limit': msg('prekročený limit'),
  'rate-limit-ip': msg('limit na IP'),
  'rate-limit-email': msg('limit na e-mail'),
  honeypot: msg('bot (skryté pole)'),
  'too-fast': msg('bot (príliš rýchlo)'),
  'no-stamp': msg('bot (chýba pečiatka)'),
  'bad-stamp': msg('bot (zlá pečiatka)'),
  expired: msg('formulár vypršal'),
  'disposable-list': msg('dočasný e-mail'),
  'disposable-mx': msg('dočasný e-mail (MX)'),
  'no-mx': msg('e-mail bez pošty'),
  exists: msg('e-mail už existuje'),
  'bad-token': msg('neplatný odkaz'),
  'bad-code': msg('zlý kód'),
  'needs-2fa': msg('čaká na kód 2FA'),
  requested: msg('vyžiadaná'),
  resend: msg('nový odkaz'),
};

export function reasonText(reason: string | null, t: T): string {
  if (!reason) return '';
  if (reason.startsWith('invalid:')) return t('chybné polia: {fields}', { fields: reason.slice(8) });
  return REASON_LABEL[reason] ? t(REASON_LABEL[reason]) : reason;
}

export const AUDIT_LABEL: Record<string, string> = {
  'user.verify-email': msg('Overil e-mail'),
  'user.unlock': msg('Odomkol účet'),
  'user.ban': msg('Zablokoval účet'),
  'user.unban': msg('Odblokoval účet'),
  'user.revoke-sessions': msg('Odhlásil zo všetkých zariadení'),
  'user.send-reset': msg('Poslal odkaz na nové heslo'),
  'user.reset-2fa': msg('Zrušil 2FA'),
  'user.reset-link': msg('Vytvoril odkaz na nové heslo'),
  'user.role': msg('Zmenil rolu'),
};

export function auditText(action: string, meta: unknown, t: T): string {
  const base = AUDIT_LABEL[action] ? t(AUDIT_LABEL[action]) : action;
  const m = (meta ?? {}) as Record<string, unknown>;
  if (action === 'user.role' && m.from && m.to) return `${base}: ${String(m.from)} → ${String(m.to)}`;
  if (action === 'user.ban' && m.reason) return `${base} (${String(m.reason)})`;
  if (action === 'payment.refund' && typeof m.amount === 'number') return `${base}: ${(m.amount / 100).toFixed(2).replace('.', ',')} €${m.reason ? ` (${String(m.reason)})` : ''}`;
  return base;
}

Object.assign(AUDIT_LABEL, {
  'inquiry.update': msg('Upravil dopyt'),
  'settings.site': msg('Zmenil údaje o firme a hale'),
  'booking.create': msg('Vytvoril rezerváciu'),
  'booking.paid': msg('Označil rezerváciu ako zaplatenú'),
  'booking.unpaid': msg('Zrušil označenie platby'),
  'booking.check-in': msg('Potvrdil príchod'),
  'booking.no-show': msg('Označil „neprišiel“'),
  'booking.cancel': msg('Zrušil rezerváciu'),
  'block.create': msg('Zablokoval čas'),
  'block.delete': msg('Zrušil blokovanie'),
  'settings.booking': msg('Zmenil cenník a nastavenia'),
  'booking.export': msg('Exportoval rezervácie (CSV)'),
  'photo.upload': msg('Nahral fotku'),
  'photo.update': msg('Upravil fotku'),
  'photo.delete': msg('Zmazal fotku'),
  'article.create': msg('Vytvoril článok'),
  'article.publish': msg('Zverejnil článok'),
  'article.schedule': msg('Naplánoval článok'),
  'article.unpublish': msg('Stiahol článok z webu'),
  'article.trash': msg('Presunul článok do koša'),
  'article.restore': msg('Obnovil článok z koša'),
  'article.delete': msg('Natrvalo zmazal článok'),
  'payment.succeeded': msg('Platba kartou prijatá'),
  'payment.expired': msg('Platba kartou vypršala – termín uvoľnený'),
  'payment.failed': msg('Platba kartou zlyhala – termín uvoľnený'),
  'payment.refund': msg('Vrátil peniaze na kartu'),
  'payment.refund-synced': msg('Vrátenie zladené z platobnej brány'),
  'payment.auto-refund': msg('Automatické vrátenie (rezervácia nebola aktívna)'),
  'payment.amount-mismatch': msg('Pozor: zaplatená suma sa líši od ceny'),
});

export const INQUIRY_STATUS: Record<string, { label: string; tone: 'ok' | 'warn' | 'red' | 'blue' | 'muted' }> = {
  NEW: { label: msg('Nový'), tone: 'red' },
  IN_PROGRESS: { label: msg('Rieši sa'), tone: 'warn' },
  DONE: { label: msg('Vybavený'), tone: 'ok' },
  SPAM: { label: msg('Spam'), tone: 'muted' },
};


// Vodorovné pruhy pre podiely (zdroje, zariadenia, stránky). Jeden odtieň, hodnota vždy aj číslom.
export async function Meters({ rows, total, unit = '', empty }: { rows: { label: string; value: number; note?: string }[]; total?: number; unit?: string; empty?: string }) {
  const t = await getT();
  if (rows.length === 0) return <Empty>{empty ?? t('Zatiaľ bez údajov.')}</Empty>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  const sum = total ?? rows.reduce((a, r) => a + r.value, 0);
  return (
    <ul className="mt">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mt__row">
            <span className="mt__label" title={t(r.label)}>
              {t(r.label)}
            </span>
            <span className="mt__val">
              {r.value.toLocaleString(t.intl)}
              {unit ? ` ${unit}` : ''}
              {sum ? <small> · {Math.round((r.value / sum) * 100)} %</small> : null}
            </span>
          </div>
          <Dyn as="i" className="mt__bar" css={{ width: `${Math.max(1.5, (r.value / max) * 100)}%` }} />
          {r.note ? <small className="mt__note">{r.note}</small> : null}
        </li>
      ))}
    </ul>
  );
}

// Ukazovateľ so zmenou oproti predchádzajúcemu obdobiu.
export async function Kpi({ label, value, change, note, invert = false }: { label: string; value: React.ReactNode; change?: number | null; note?: React.ReactNode; invert?: boolean }) {
  const t = await getT();
  const has = change !== undefined && change !== null && Number.isFinite(change);
  const up = has && change! > 0.005;
  const down = has && change! < -0.005;
  const good = invert ? down : up;
  const bad = invert ? up : down;
  return (
    <div className="kpi">
      <span className="kpi__label">{label}</span>
      <strong className="kpi__value">{value}</strong>
      <span className="kpi__foot">
        {has ? (
          <b className={good ? 'kpi__up' : bad ? 'kpi__down' : 'kpi__flat'}>
            {up ? '▲' : down ? '▼' : '•'} {Math.abs(Math.round(change! * 100))} %
          </b>
        ) : change === null ? (
          <b className="kpi__flat">{t('nové')}</b>
        ) : null}
        {note ? <span>{note}</span> : null}
      </span>
    </div>
  );
}
