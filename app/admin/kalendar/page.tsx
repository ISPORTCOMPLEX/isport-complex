import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireStaff, can } from '@/lib/staff';
import { getBookingSettings } from '@/lib/booking/settings';
import { addDays, euros, fmtDayLong, hallParts, hallTime, isIsoDate, pad2, todayIso } from '@/lib/booking/time';
import { AdmHead, Panel, Stat } from '@/components/admin/ui';
import { FormAlert } from '@/components/forms/FormAlert';
import { adminCreateBlock, adminDeleteBlock } from '@/lib/actions/adminBooking';
import { Dyn } from '@/components/Dyn';
import { getT } from '@/lib/i18n/server';
import { msg } from '@/lib/i18n/translate';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Kalendár ľadu') };
}

const NOTICE: Record<string, { ok: boolean; text: string }> = {
  'blok-ok': { ok: true, text: msg('Čas je zablokovaný.') },
  'blok-zmazany': { ok: true, text: msg('Blokovanie je zrušené, čas je opäť voľný.') },
  'blok-obsadene': { ok: false, text: msg('V tomto čase už je rezervácia alebo iné blokovanie. Najprv ju zruš alebo zvoľ iný čas.') },
  'blok-chyba': { ok: false, text: msg('Skontroluj dátum a čas blokovania.') },
};

type Props = { searchParams: Promise<{ datum?: string | string[]; stav?: string | string[] }> };
const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');

export default async function KalendarPage({ searchParams }: Props) {
  const t = await getT();
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
  const notice = NOTICE[one(sp.stav)] ? { ...NOTICE[one(sp.stav)], text: t(NOTICE[one(sp.stav)].text) } : undefined;
  const hours = Array.from({ length: close - open }, (_, i) => open + i);

  return (
    <div className="adm__stack">
      <AdmHead title={t('Kalendár ľadu')} sub={fmtDayLong(hallTime(iso, 12), t)}>
        <nav className="adm-daynav" aria-label={t('Deň')}>
          <Link href={`/admin/kalendar?datum=${addDays(iso, -1)}`}>{t('← Predošlý')}</Link>
          <Link href="/admin/kalendar">{t('Dnes')}</Link>
          <Link href={`/admin/kalendar?datum=${addDays(iso, 1)}`}>{t('Ďalší →')}</Link>
        </nav>
        <form action="/admin/kalendar" className="adm-inline-form u-mt0">
          <input type="date" name="datum" defaultValue={iso} className="adm-input" aria-label={t('Dátum')} />
          <button className="btn btn--sm btn--ghost">{t('Zobraziť')}</button>
        </form>
      </AdmHead>

      {notice ? <FormAlert error={notice.ok ? undefined : notice.text} success={notice.ok ? notice.text : undefined} /> : null}

      <div className="adm-stats">
        <Stat label={t('Rezervácie')} value={bookings.length} />
        <Stat label={t('Obsadenosť')} value={`${totalHalfHours ? Math.round((usedHalfHours / totalHalfHours) * 100) : 0} %`} note={`${open}:00 – ${close}:00`} />
        <Stat label={t('Hodnota rezervácií')} value={euros(revenue)} />
        <Stat label={t('Blokované')} value={blocks.length} note={t('údržba, úprava ľadu')} />
      </div>

      <Panel>
        <div className="adm-table-wrap">
          <Dyn className="cal" css={{ 'grid-template-rows': `44px repeat(${close - open}, 64px)` }}>
            <div className="cal__head u-g11" />
            <div className="cal__head u-g21">
              {t('Ľadová plocha')}
            </div>
            {hours.map((h, i) => (
              <Dyn key={`t${h}`} className="cal__time" css={{ 'grid-column': '1', 'grid-row': String(i + 2) }}>
                {pad2(h)}
              </Dyn>
            ))}
            {hours.map((h, i) => (
              <Dyn key={`a${h}`} className="cal__cell" css={{ 'grid-column': '2', 'grid-row': String(i + 2) }} />
            ))}
            {blocks.map((bl) => {
              const r = row(bl.startsAt, bl.endsAt);
              if (r.b <= open || r.a >= close) return null;
              return (
                <Dyn key={bl.id} className="cal__item cal__item--block" css={{ 'grid-column': col(bl.area), 'grid-row': r.css }}>
                  <strong>{bl.reason}</strong>
                  <small>
                    {pad2(r.a)} – {pad2(r.b)}
                  </small>
                  {manage ? (
                    <form action={adminDeleteBlock}>
                      <input type="hidden" name="blockId" value={bl.id} />
                      <input type="hidden" name="datum" value={iso} />
                      <button className="cal__x" aria-label={t('Zrušiť blokovanie {reason}', { reason: bl.reason })}>
                        {t('Zrušiť')}
                      </button>
                    </form>
                  ) : null}
                </Dyn>
              );
            })}
            {bookings.map((b) => {
              const r = row(b.startsAt, b.endsAt);
              if (r.b <= open || r.a >= close) return null;
              const tone = b.status === 'NO_SHOW' ? 'noshow' : b.checkedInAt ? 'in' : b.paymentStatus === 'PAID' ? 'paid' : 'unpaid';
              return (
                <Dyn as="a" key={b.id} href={`/admin/rezervacie/${b.id}`} className={`cal__item cal__item--${tone}`} css={{ 'grid-column': col(b.area), 'grid-row': r.css }}>
                  <strong>{b.teamName || b.contactName}</strong>
                  <small>
                    {pad2(r.a)} – {pad2(r.b)} · {b.code}
                    {b.showers ? t(' · sprchy') : ''}
                  </small>
                  <small>{b.status === 'NO_SHOW' ? t('Neprišiel') : b.checkedInAt ? t('Na ľade / prišiel') : b.paymentStatus === 'PAID' ? t('Zaplatená') : t('Nezaplatená')}</small>
                </Dyn>
              );
            })}
          </Dyn>
        </div>
        <div className="cal__legend">
          <span>
            <i className="cal__sw cal__sw--unpaid" />
            {t('Nezaplatená')}
          </span>
          <span>
            <i className="cal__sw cal__sw--paid" />
            {t('Zaplatená')}
          </span>
          <span>
            <i className="cal__sw cal__sw--in" />
            {t('Prišiel')}
          </span>
          <span>
            <i className="cal__sw cal__sw--block" />
            {t('Blokované')}
          </span>
        </div>
      </Panel>

      {manage ? (
        <Panel title={t('Zablokovať čas')}>
          <form action={adminCreateBlock} className="adm-inline-form u-mt0">
            <input type="hidden" name="datum" value={iso} />
            <label className="adm-label u-f120">
              {t('Od')}
              <select name="od" className="adm-select" defaultValue={String(open)}>
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {pad2(h)}
                  </option>
                ))}
              </select>
            </label>
            <label className="adm-label u-f120">
              {t('Do')}
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
              {t('Dôvod')}
              <input name="reason" className="adm-input" maxLength={200} placeholder={t('napr. úprava ľadu, údržba rolby, turnaj')} required />
            </label>
            <button className="btn btn--sm">{t('Zablokovať')}</button>
          </form>
          <p className="muted adm-note">{t('Blokovaný čas si zákazníci nemôžu rezervovať. Ak je v ňom už rezervácia, najprv ju treba zrušiť.')}</p>
        </Panel>
      ) : null}
    </div>
  );
}
