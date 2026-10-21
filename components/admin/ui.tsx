import Link from 'next/link';
import { Dyn } from '@/components/Dyn';

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

const dt = new Intl.DateTimeFormat('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' });
const d = new Intl.DateTimeFormat('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'Europe/Bratislava' });

export function fmtDateTime(v: Date | null | undefined): string {
  return v ? dt.format(v) : '—';
}

export function fmtDate(v: Date | null | undefined): string {
  return v ? d.format(v) : '—';
}

export function ago(v: Date | null | undefined): string {
  if (!v) return 'nikdy';
  const s = Math.round((Date.now() - v.getTime()) / 1000);
  if (s < 60) return 'práve teraz';
  if (s < 3600) return `pred ${Math.round(s / 60)} min`;
  if (s < 86400) return `pred ${Math.round(s / 3600)} h`;
  if (s < 7 * 86400) return `pred ${Math.round(s / 86400)} d`;
  return d.format(v);
}

export const EVENT_LABEL: Record<string, string> = {
  register: 'Registrácia',
  login: 'Prihlásenie',
  'login-2fa': 'Prihlásenie 2FA',
  'password-reset': 'Obnova hesla',
  'password-change': 'Zmena hesla',
  'verify-email': 'Overenie e-mailu',
  'account-delete': 'Zmazanie účtu',
  '2fa-change': 'Zmena 2FA',
  sessions: 'Relácie',
  export: 'Export údajov',
};

export const REASON_LABEL: Record<string, string> = {
  'bad-password': 'zlé heslo',
  captcha: 'nesprávna CAPTCHA',
  'no-user': 'neexistujúci účet',
  locked: 'účet zamknutý',
  banned: 'účet zablokovaný',
  unverified: 'neoverený e-mail',
  'rate-limit': 'prekročený limit',
  'rate-limit-ip': 'limit na IP',
  'rate-limit-email': 'limit na e-mail',
  honeypot: 'bot (skryté pole)',
  'too-fast': 'bot (príliš rýchlo)',
  'no-stamp': 'bot (chýba pečiatka)',
  'bad-stamp': 'bot (zlá pečiatka)',
  expired: 'formulár vypršal',
  'disposable-list': 'dočasný e-mail',
  'disposable-mx': 'dočasný e-mail (MX)',
  'no-mx': 'e-mail bez pošty',
  exists: 'e-mail už existuje',
  'bad-token': 'neplatný odkaz',
  'bad-code': 'zlý kód',
  'needs-2fa': 'čaká na kód 2FA',
  requested: 'vyžiadaná',
  resend: 'nový odkaz',
};

export function reasonText(reason: string | null): string {
  if (!reason) return '';
  if (reason.startsWith('invalid:')) return `chybné polia: ${reason.slice(8)}`;
  return REASON_LABEL[reason] ?? reason;
}

export const AUDIT_LABEL: Record<string, string> = {
  'user.verify-email': 'Overil e-mail',
  'user.unlock': 'Odomkol účet',
  'user.ban': 'Zablokoval účet',
  'user.unban': 'Odblokoval účet',
  'user.revoke-sessions': 'Odhlásil zo všetkých zariadení',
  'user.send-reset': 'Poslal odkaz na nové heslo',
  'user.reset-2fa': 'Zrušil 2FA',
  'user.reset-link': 'Vytvoril odkaz na nové heslo',
  'user.role': 'Zmenil rolu',
};

export function auditText(action: string, meta: unknown): string {
  const base = AUDIT_LABEL[action] ?? action;
  const m = (meta ?? {}) as Record<string, unknown>;
  if (action === 'user.role' && m.from && m.to) return `${base}: ${String(m.from)} → ${String(m.to)}`;
  if (action === 'user.ban' && m.reason) return `${base} (${String(m.reason)})`;
  if (action === 'payment.refund' && typeof m.amount === 'number') return `${base}: ${(m.amount / 100).toFixed(2).replace('.', ',')} €${m.reason ? ` (${String(m.reason)})` : ''}`;
  return base;
}

Object.assign(AUDIT_LABEL, {
  'inquiry.update': 'Upravil dopyt',
  'settings.site': 'Zmenil údaje o firme a hale',
  'booking.create': 'Vytvoril rezerváciu',
  'booking.paid': 'Označil rezerváciu ako zaplatenú',
  'booking.unpaid': 'Zrušil označenie platby',
  'booking.check-in': 'Potvrdil príchod',
  'booking.no-show': 'Označil „neprišiel“',
  'booking.cancel': 'Zrušil rezerváciu',
  'block.create': 'Zablokoval čas',
  'block.delete': 'Zrušil blokovanie',
  'settings.booking': 'Zmenil cenník a nastavenia',
  'booking.export': 'Exportoval rezervácie (CSV)',
  'photo.upload': 'Nahral fotku',
  'photo.update': 'Upravil fotku',
  'photo.delete': 'Zmazal fotku',
  'article.create': 'Vytvoril článok',
  'article.publish': 'Zverejnil článok',
  'article.schedule': 'Naplánoval článok',
  'article.unpublish': 'Stiahol článok z webu',
  'article.trash': 'Presunul článok do koša',
  'article.restore': 'Obnovil článok z koša',
  'article.delete': 'Natrvalo zmazal článok',
  'payment.succeeded': 'Platba kartou prijatá',
  'payment.expired': 'Platba kartou vypršala – termín uvoľnený',
  'payment.failed': 'Platba kartou zlyhala – termín uvoľnený',
  'payment.refund': 'Vrátil peniaze na kartu',
  'payment.refund-synced': 'Vrátenie zladené z platobnej brány',
  'payment.auto-refund': 'Automatické vrátenie (rezervácia nebola aktívna)',
  'payment.amount-mismatch': 'Pozor: zaplatená suma sa líši od ceny',
});

export const INQUIRY_STATUS: Record<string, { label: string; tone: 'ok' | 'warn' | 'red' | 'blue' | 'muted' }> = {
  NEW: { label: 'Nový', tone: 'red' },
  IN_PROGRESS: { label: 'Rieši sa', tone: 'warn' },
  DONE: { label: 'Vybavený', tone: 'ok' },
  SPAM: { label: 'Spam', tone: 'muted' },
};


// Vodorovné pruhy pre podiely (zdroje, zariadenia, stránky). Jeden odtieň, hodnota vždy aj číslom.
export function Meters({ rows, total, unit = '', empty = 'Zatiaľ bez údajov.' }: { rows: { label: string; value: number; note?: string }[]; total?: number; unit?: string; empty?: string }) {
  if (rows.length === 0) return <Empty>{empty}</Empty>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  const sum = total ?? rows.reduce((a, r) => a + r.value, 0);
  return (
    <ul className="mt">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mt__row">
            <span className="mt__label" title={r.label}>
              {r.label}
            </span>
            <span className="mt__val">
              {r.value.toLocaleString('sk-SK')}
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
export function Kpi({ label, value, change, note, invert = false }: { label: string; value: React.ReactNode; change?: number | null; note?: React.ReactNode; invert?: boolean }) {
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
          <b className="kpi__flat">nové</b>
        ) : null}
        {note ? <span>{note}</span> : null}
      </span>
    </div>
  );
}
