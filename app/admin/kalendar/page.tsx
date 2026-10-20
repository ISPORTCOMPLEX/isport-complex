import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireStaff, can } from '@/lib/staff';
import { getBookingSettings } from '@/lib/booking/settings';
import { addDays, euros, fmtDayLong, hallParts, hallTime, isIsoDate, pad2, todayIso } from '@/lib/booking/time';
import { AdmHead, Panel, Stat } from '@/components/admin/ui';
import { FormAlert } from '@/components/forms/FormAlert';
import { adminCreateBlock, adminDeleteBlock } from '@/lib/actions/adminBooking';

export const metadata: Metadata = { title: 'Kalendár ľadu' };

const NOTICE: Record<string, { ok: boolean; text: string }> = {
  'blok-ok': { ok: true, text: 'Čas je zablokovaný.' },
  'blok-zmazany': { ok: true, text: 'Blokovanie je zrušené, čas je opäť voľný.' },
  'blok-obsadene': { ok: false, text: 'V tomto čase už je rezervácia alebo iné blokovanie. Najprv ju zruš alebo zvoľ iný čas.' },
  'blok-chyba': { ok: false, text: 'Skontroluj dátum a čas blokovania.' },
};

type Props = { searchParams: Promise<{ datum?: string | string[]; stav?: string | string[] }> };
const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');

export default async function KalendarPage({ searchParams }: Props) {
  const me = await requireStaff('bookings.view', '/admin/kalendar');
  const sp = await searchParams;
  const iso = isIsoDate(one(sp.datum)) ? one(sp.datum) : todayIso();
  const s = await getBookingSettings();
  const dayStart = hallTime(iso, 0);
  const dayEnd = hallTime(addDays(iso, 1), 0);
  const manage = can(me.role, 'bookings.manage');

  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: { startsAt: { gte: dayStart, lt: dayEnd }, status: { not: 'CANCELLED' } },
      orderBy: { startsAt: 'asc' },
      include: { user: { select: { firstName: true, lastName: true } } },
    }),
    prisma.block.findMany({ where: { startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } }, orderBy: { startsAt: 'asc' } }),
  ]);

  const open = s.openHour;
  const close = s.closeHour;
  const hourOf = (d: Date) => {
    const p = hallParts(d);
    return d >= dayEnd ? 24 : p.h;
  };
  const col = (_area: string) => '2';
  const row = (start: Date, end: Date) => {
    const a = Math.max(hourOf(start), open);
    const b = Math.min(end >= dayEnd ? 24 : hourOf(end), close);
    return { a, b, css: `${a - open + 2} / ${Math.max(b, a + 1) - open + 2}` };
  };

  const totalHalfHours = close - open;
  const usedHalfHours = bookings.reduce((sum, b) => sum + b.hours, 0);
  const revenue = bookings.reduce((sum, b) => sum + b.priceCents, 0);
  const notice = NOTICE[one(sp.stav)];
  const hours = Array.from({ length: close - open }, (_, i) => open + i);

  return (
    <div className="adm__stack">
      <AdmHead title="Kalendár ľadu" sub={fmtDayLong(hallTime(iso, 12))}>
        <nav className="adm-daynav" aria-label="Deň">
          <Link href={`/admin/kalendar?datum=${addDays(iso, -1)}`}>← Predošlý</Link>
          <Link href="/admin/kalendar">Dnes</Link>
          <Link href={`/admin/kalendar?datum=${addDays(iso, 1)}`}>Ďalší →</Link>
        </nav>
        <form action="/admin/kalendar" className="adm-inline-form" style={{ marginTop: 0 }}>
          <input type="date" name="datum" defaultValue={iso} className="adm-input" aria-label="Dátum" />
          <button className="btn btn--sm btn--ghost">Zobraziť</button>
        </form>
      </AdmHead>

      {notice ? <FormAlert error={notice.ok ? undefined : notice.text} success={notice.ok ? notice.text : undefined} /> : null}

      <div className="adm-stats">
        <Stat label="Rezervácie" value={bookings.length} />
        <Stat label="Obsadenosť" value={`${totalHalfHours ? Math.round((usedHalfHours / totalHalfHours) * 100) : 0} %`} note={`${open}:00 – ${close}:00`} />
        <Stat label="Hodnota rezervácií" value={euros(revenue)} />
        <Stat label="Blokované" value={blocks.length} note="údržba, úprava ľadu" />
      </div>

      <Panel>
        <div className="adm-table-wrap">
          <div className="cal" style={{ gridTemplateRows: `44px repeat(${close - open}, 64px)` }}>
            <div className="cal__head" style={{ gridColumn: '1', gridRow: '1' }} />
            <div className="cal__head" style={{ gridColumn: '2', gridRow: '1' }}>
              Ľadová plocha
            </div>
            {hours.map((h, i) => (
              <div key={`t${h}`} className="cal__time" style={{ gridColumn: '1', gridRow: String(i + 2) }}>
                {pad2(h)}
              </div>
            ))}
            {hours.map((h, i) => (
              <div key={`a${h}`} className="cal__cell" style={{ gridColumn: '2', gridRow: String(i + 2) }} />
            ))}
            {blocks.map((bl) => {
              const r = row(bl.startsAt, bl.endsAt);
              if (r.b <= open || r.a >= close) return null;
              return (
                <div key={bl.id} className="cal__item cal__item--block" style={{ gridColumn: col(bl.area), gridRow: r.css }}>
                  <strong>{bl.reason}</strong>
                  <small>
                    {pad2(r.a)} – {pad2(r.b)}
                  </small>
                  {manage ? (
                    <form action={adminDeleteBlock}>
                      <input type="hidden" name="blockId" value={bl.id} />
                      <input type="hidden" name="datum" value={iso} />
                      <button className="cal__x" aria-label={`Zrušiť blokovanie ${bl.reason}`}>
                        Zrušiť
                      </button>
                    </form>
                  ) : null}
                </div>
              );
            })}
            {bookings.map((b) => {
              const r = row(b.startsAt, b.endsAt);
              if (r.b <= open || r.a >= close) return null;
              const tone = b.status === 'NO_SHOW' ? 'noshow' : b.checkedInAt ? 'in' : b.paymentStatus === 'PAID' ? 'paid' : 'unpaid';
              return (
                <Link key={b.id} href={`/admin/rezervacie/${b.id}`} className={`cal__item cal__item--${tone}`} style={{ gridColumn: col(b.area), gridRow: r.css }}>
                  <strong>{b.teamName || b.contactName}</strong>
                  <small>
                    {pad2(r.a)} – {pad2(r.b)} · {b.code}
                    {b.showers ? ' · sprchy' : ''}
                  </small>
                  <small>{b.status === 'NO_SHOW' ? 'Neprišiel' : b.checkedInAt ? 'Na ľade / prišiel' : b.paymentStatus === 'PAID' ? 'Zaplatená' : 'Nezaplatená'}</small>
                </Link>
              );
            })}
          </div>
        </div>
        <div className="cal__legend">
          <span>
            <i className="cal__sw cal__sw--unpaid" />
            Nezaplatená
          </span>
          <span>
            <i className="cal__sw cal__sw--paid" />
            Zaplatená
          </span>
          <span>
            <i className="cal__sw cal__sw--in" />
            Prišiel
          </span>
          <span>
            <i className="cal__sw cal__sw--block" />
            Blokované
          </span>
        </div>
      </Panel>

      {manage ? (
        <Panel title="Zablokovať čas">
          <form action={adminCreateBlock} className="adm-inline-form" style={{ marginTop: 0 }}>
            <input type="hidden" name="datum" value={iso} />
            <label className="adm-label" style={{ flex: '0 1 120px' }}>
              Od
              <select name="od" className="adm-select" defaultValue={String(open)}>
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {pad2(h)}
                  </option>
                ))}
              </select>
            </label>
            <label className="adm-label" style={{ flex: '0 1 120px' }}>
              Do
              <select name="do" className="adm-select" defaultValue={String(open + 1)}>
                {hours.map((h) => (
                  <option key={h} value={h + 1}>
                    {pad2(h + 1)}
                  </option>
                ))}
              </select>
            </label>
            <input type="hidden" name="plocha" value="FULL" />
            <label className="adm-label">
              Dôvod
              <input name="reason" className="adm-input" maxLength={200} placeholder="napr. úprava ľadu, údržba rolby, turnaj" required />
            </label>
            <button className="btn btn--sm">Zablokovať</button>
          </form>
          <p className="muted adm-note">Blokovaný čas si zákazníci nemôžu rezervovať. Ak je v ňom už rezervácia, najprv ju treba zrušiť.</p>
        </Panel>
      ) : null}
    </div>
  );
}
