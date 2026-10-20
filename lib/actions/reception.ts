'use server';

import { prisma } from '@/lib/prisma';
import { requireStaff, can } from '@/lib/staff';
import { getRequestInfo } from '@/lib/requestInfo';
import { safeEqual } from '@/lib/crypto';
import { str } from '@/lib/validate';
import { AREA_LABEL, METHOD_LABEL } from '@/lib/booking/format';
import { euros, fmtDayLong, fmtRange, todayIso, isoOf } from '@/lib/booking/time';

export type ReceptionState = {
  error?: string;
  success?: string;
  booking?: {
    id: string;
    code: string;
    who: string;
    when: string;
    area: string;
    price: string;
    method: string;
    paid: boolean;
    checkedIn: boolean;
    status: string;
    today: boolean;
    note: string | null;
  };
};

// Kód z QR je „ISP:KÓD:TOKEN“ – token overíme, aby sa vstupenka nedala podvrhnúť len z kódu.
// Ručne zadaný kód (bez tokenu) je tiež v poriadku – recepcia vidí meno a overí ho.
export async function receptionAction(_prev: ReceptionState, form: FormData): Promise<ReceptionState> {
  const me = await requireStaff('bookings.view');
  const op = str(form, 'op', 10);
  const input = str(form, 'q', 200).toUpperCase().replace(/\s/g, '');
  let code = input;
  let token: string | null = null;
  const raw = str(form, 'q', 200).trim();
  const m = /^ISP:(ISP-[A-Z0-9]{6}):([A-Za-z0-9_-]+)$/i.exec(raw);
  if (m) {
    code = m[1].toUpperCase();
    token = m[2];
  } else if (/^[A-Z0-9]{6}$/.test(code)) code = `ISP-${code}`;

  if (!/^ISP-[A-Z0-9]{6}$/.test(code)) return { error: 'Zadaj kód rezervácie v tvare ISP-XXXXXX alebo naskenuj QR kód.' };
  const b = await prisma.booking.findUnique({ where: { code } });
  if (!b) return { error: `Rezervácia ${code} neexistuje.` };
  if (token !== null && !safeEqual(token, b.qrToken)) return { error: 'QR kód je neplatný (nesedí overovací údaj). Over totožnosť zákazníka.' };

  if (op === 'checkin' || op === 'paid') {
    const { ip } = await getRequestInfo();
    if (op === 'checkin') {
      if (!can(me.role, 'bookings.manage')) return { error: 'Na potvrdenie príchodu nemáš oprávnenie.' };
      if (b.status !== 'CONFIRMED') return { error: 'Rezervácia nie je aktívna.', booking: view(b) };
      if (!b.checkedInAt) {
        await prisma.booking.update({ where: { id: b.id }, data: { checkedInAt: new Date() } });
        await prisma.auditLog.create({ data: { actorId: me.id, action: 'booking.check-in', target: b.id, meta: { code: b.code, via: 'recepcia' }, ip } });
      }
    } else {
      if (!can(me.role, 'payments.manage')) return { error: 'Na označenie platby nemáš oprávnenie.' };
      if (b.paymentStatus !== 'PAID') {
        await prisma.booking.update({ where: { id: b.id }, data: { paymentStatus: 'PAID', paidAt: new Date() } });
        await prisma.auditLog.create({ data: { actorId: me.id, action: 'booking.paid', target: b.id, meta: { code: b.code, via: 'recepcia' }, ip } });
      }
    }
    const fresh = await prisma.booking.findUnique({ where: { id: b.id } });
    return { success: op === 'checkin' ? 'Príchod potvrdený.' : 'Zaplatené.', booking: fresh ? view(fresh) : undefined };
  }
  return { booking: view(b) };
}

type B = {
  id: string;
  code: string;
  teamName: string | null;
  contactName: string;
  startsAt: Date;
  endsAt: Date;
  area: string;
  priceCents: number;
  paymentMethod: string;
  paymentStatus: string;
  checkedInAt: Date | null;
  status: string;
  note: string | null;
};

function view(b: B): NonNullable<ReceptionState['booking']> {
  return {
    id: b.id,
    code: b.code,
    who: b.teamName ? `${b.teamName} · ${b.contactName}` : b.contactName,
    when: `${fmtDayLong(b.startsAt)} · ${fmtRange(b.startsAt, b.endsAt)}`,
    area: AREA_LABEL[b.area] ?? b.area,
    price: euros(b.priceCents),
    method: METHOD_LABEL[b.paymentMethod] ?? b.paymentMethod,
    paid: b.paymentStatus === 'PAID',
    checkedIn: Boolean(b.checkedInAt),
    status: b.status,
    today: isoOf(b.startsAt) === todayIso(),
    note: b.note,
  };
}
