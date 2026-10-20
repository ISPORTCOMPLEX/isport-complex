import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { can, isStaff } from '@/lib/staff';
import { getRequestInfo } from '@/lib/requestInfo';
import { addDays, hallTime, isIsoDate, todayIso } from '@/lib/booking/time';
import { METHOD_LABEL, PAYMENT_LABEL, STATUS_LABEL } from '@/lib/booking/format';

// Export rezervácií do CSV (Excel, slovenské nastavenie: bodkočiarka, čiarka v číslach, UTF-8 s BOM).
export const dynamic = 'force-dynamic';

const dt = new Intl.DateTimeFormat('sk-SK', { timeZone: 'Europe/Bratislava', day: '2-digit', month: '2-digit', year: 'numeric' });
const tm = new Intl.DateTimeFormat('sk-SK', { timeZone: 'Europe/Bratislava', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

function cell(v: unknown): string {
  let s = v === null || v === undefined ? '' : String(v);
  // Ochrana pred vložením vzorca do Excelu.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const money = (c: number) => (c / 100).toFixed(2).replace('.', ',');

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role) || !user.twoFactorEnabledAt || !can(user.role, 'bookings.view')) return new Response('Not found', { status: 404 });

  const url = new URL(req.url);
  const today = todayIso();
  const od = isIsoDate(url.searchParams.get('od')) ? url.searchParams.get('od')! : addDays(today, -30);
  const doo = isIsoDate(url.searchParams.get('do')) ? url.searchParams.get('do')! : today;
  if (od > doo) return new Response('Neplatné obdobie', { status: 400 });

  const rows = await prisma.booking.findMany({
    where: { startsAt: { gte: hallTime(od, 0), lt: hallTime(addDays(doo, 1), 0) } },
    orderBy: { startsAt: 'asc' },
    take: 20000,
    include: { user: { select: { email: true } } },
  });

  const head = ['Číslo', 'Kód', 'Dátum', 'Od', 'Do', 'Hodiny', 'Sprchy', 'Cena spolu €', 'z toho sprchy €', 'Stav', 'Platba', 'Spôsob platby', 'Zaplatené', 'Zákazník', 'Tím', 'Telefón', 'E-mail', 'Zadal', 'Vytvorená', 'Príchod', 'Poznámka'];
  const lines = [head.map(cell).join(';')];
  for (const b of rows) {
    lines.push(
      [
        b.number,
        b.code,
        dt.format(b.startsAt),
        tm.format(b.startsAt),
        tm.format(b.endsAt),
        b.hours,
        b.showers ? 'áno' : 'nie',
        money(b.priceCents),
        money(b.showerCents),
        STATUS_LABEL[b.status] ?? b.status,
        PAYMENT_LABEL[b.paymentStatus] ?? b.paymentStatus,
        METHOD_LABEL[b.paymentMethod] ?? b.paymentMethod,
        b.paidAt ? dt.format(b.paidAt) : '',
        b.contactName,
        b.teamName ?? '',
        b.contactPhone,
        b.user?.email ?? b.guestEmail ?? '',
        b.createdById ? 'recepcia' : 'online',
        `${dt.format(b.createdAt)} ${tm.format(b.createdAt)}`,
        b.checkedInAt ? tm.format(b.checkedInAt) : '',
        b.note ?? '',
      ]
        .map(cell)
        .join(';'),
    );
  }

  const { ip } = await getRequestInfo();
  await prisma.auditLog.create({ data: { actorId: user.id, action: 'booking.export', target: null, meta: { od, do: doo, count: rows.length }, ip } });

  return new Response(`﻿${lines.join('\r\n')}\r\n`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="rezervacie-${od}-${doo}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
