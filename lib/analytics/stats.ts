import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { addDays, hallTime, todayIso } from '@/lib/booking/time';
import type { BookingSettings } from '@/lib/booking/settings';

// Štatistiky pre administráciu: návštevnosť webu (PageView) a prevádzka ľadu (Booking).
// Dni a hodiny sa počítajú v miestnom čase haly.

const TZ = 'Europe/Bratislava';

export type Range = { days: number; from: Date; to: Date; prevFrom: Date; fromIso: string; toIso: string };

export function rangeOf(days: number, now = new Date()): Range {
  const toIso = addDays(todayIso(now), 1);
  const fromIso = addDays(toIso, -days);
  const from = hallTime(fromIso, 0);
  const to = hallTime(toIso, 0);
  return { days, from, to, prevFrom: hallTime(addDays(fromIso, -days), 0), fromIso, toIso };
}

export type Point = { label: string; key: string; value: number; extra?: number };
export type Share = { label: string; value: number };

function series(range: Range, rows: { d: string; v: number; e?: number }[]): Point[] {
  const map = new Map(rows.map((r) => [r.d, r]));
  const out: Point[] = [];
  for (let i = 0; i < range.days; i++) {
    const iso = addDays(range.fromIso, i);
    const [, m, d] = iso.split('-');
    const r = map.get(iso);
    out.push({ key: iso, label: `${Number(d)}. ${Number(m)}.`, value: Number(r?.v ?? 0), extra: r?.e === undefined ? undefined : Number(r.e) });
  }
  return out;
}

const n = (v: unknown) => Number(v ?? 0);

/* ---------------- návštevnosť ---------------- */

export async function trafficStats(range: Range) {
  const { from, to, prevFrom } = range;
  const [tot, prev, daily, pages, sources, refs, devices, browsers, countries, heat, live, entry] = await Promise.all([
    prisma.$queryRaw<{ views: bigint; visitors: bigint; dur: number | null; logged: bigint }[]>`
      SELECT COUNT(*) AS views,
             COUNT(DISTINCT (visitor, date_trunc('day', "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ}))) AS visitors,
             AVG("durationMs") FILTER (WHERE "durationMs" BETWEEN 1000 AND 1800000) AS dur,
             COUNT(*) FILTER (WHERE "loggedIn") AS logged
      FROM "PageView" WHERE "createdAt" >= ${from} AND "createdAt" < ${to}`,
    prisma.$queryRaw<{ views: bigint; visitors: bigint }[]>`
      SELECT COUNT(*) AS views,
             COUNT(DISTINCT (visitor, date_trunc('day', "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ}))) AS visitors
      FROM "PageView" WHERE "createdAt" >= ${prevFrom} AND "createdAt" < ${from}`,
    prisma.$queryRaw<{ d: string; v: bigint; e: bigint }[]>`
      SELECT to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ}, 'YYYY-MM-DD') AS d,
             COUNT(DISTINCT visitor) AS v, COUNT(*) AS e
      FROM "PageView" WHERE "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY 1`,
    prisma.$queryRaw<{ label: string; value: bigint; visitors: bigint; dur: number | null }[]>`
      SELECT path AS label, COUNT(*) AS value, COUNT(DISTINCT visitor) AS visitors,
             AVG("durationMs") FILTER (WHERE "durationMs" BETWEEN 1000 AND 1800000) AS dur
      FROM "PageView" WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
      GROUP BY path ORDER BY value DESC LIMIT 12`,
    group('source', from, to),
    prisma.$queryRaw<{ label: string; value: bigint }[]>`
      SELECT referrer AS label, COUNT(DISTINCT visitor) AS value FROM "PageView"
      WHERE "createdAt" >= ${from} AND "createdAt" < ${to} AND referrer IS NOT NULL
      GROUP BY referrer ORDER BY value DESC LIMIT 8`,
    group('device', from, to),
    group('browser', from, to),
    group('country', from, to),
    prisma.$queryRaw<{ dow: number; h: number; v: bigint }[]>`
      SELECT EXTRACT(ISODOW FROM "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ})::int AS dow,
             EXTRACT(HOUR FROM "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ})::int AS h,
             COUNT(*) AS v
      FROM "PageView" WHERE "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY 1, 2`,
    prisma.$queryRaw<{ v: bigint }[]>`SELECT COUNT(DISTINCT visitor) AS v FROM "PageView" WHERE "createdAt" >= ${new Date(Date.now() - 5 * 60000)}`,
    // Lievik rezervácie: koľko návštevníkov videlo výber termínu, údaje a koľko rezervácií vzniklo online.
    prisma.$queryRaw<{ step: string; v: bigint }[]>`
      SELECT CASE WHEN path = '/rezervacia' THEN 'pick' WHEN path = '/rezervacia/udaje' THEN 'details' END AS step,
             COUNT(DISTINCT (visitor, date_trunc('day', "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ}))) AS v
      FROM "PageView" WHERE "createdAt" >= ${from} AND "createdAt" < ${to} AND path IN ('/rezervacia', '/rezervacia/udaje')
      GROUP BY 1`,
  ]);
  const onlineBookings = await prisma.booking.count({ where: { createdAt: { gte: from, lt: to }, createdById: null } });

  const t = tot[0];
  const p = prev[0];
  const views = n(t?.views);
  const visitors = n(t?.visitors);
  const heatGrid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  for (const r of heat) heatGrid[r.dow - 1][r.h] = n(r.v);
  const step = (s: string) => n(entry.find((e) => e.step === s)?.v);

  return {
    views,
    visitors,
    prevViews: n(p?.views),
    prevVisitors: n(p?.visitors),
    avgDurationSec: t?.dur ? Math.round(Number(t.dur) / 1000) : 0,
    perVisitor: visitors ? views / visitors : 0,
    loggedShare: views ? n(t?.logged) / views : 0,
    live: n(live[0]?.v),
    daily: series(
      range,
      daily.map((r) => ({ d: r.d, v: n(r.v), e: n(r.e) })),
    ),
    pages: pages.map((r) => ({ label: r.label, value: n(r.value), visitors: n(r.visitors), durSec: r.dur ? Math.round(Number(r.dur) / 1000) : 0 })),
    sources,
    refs: refs.map((r) => ({ label: r.label, value: n(r.value) })),
    devices,
    browsers,
    countries,
    heat: heatGrid,
    funnel: [
      { label: 'Návštevníci webu', value: visitors },
      { label: 'Výber termínu', value: step('pick') },
      { label: 'Vyplnenie údajov', value: step('details') },
      { label: 'Online rezervácie', value: onlineBookings },
    ],
  };
}

async function group(col: 'source' | 'device' | 'browser' | 'country', from: Date, to: Date): Promise<Share[]> {
  const rows = await prisma.$queryRaw<{ label: string | null; value: bigint }[]>`
    SELECT ${Prisma.raw(`"${col}"`)} AS label, COUNT(DISTINCT visitor) AS value FROM "PageView"
    WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
    GROUP BY 1 ORDER BY value DESC LIMIT 8`;
  return rows.map((r) => ({ label: r.label ?? 'Neznáme', value: n(r.value) }));
}

/* ---------------- prevádzka ľadu ---------------- */

export async function businessStats(range: Range, s: BookingSettings) {
  const { from, to, prevFrom } = range;
  const played = { in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] as ('CONFIRMED' | 'COMPLETED' | 'NO_SHOW')[] };
  const [bookings, prevAgg, created, cancelled, users, prevUsers, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: { startsAt: { gte: from, lt: to }, status: played },
      select: { startsAt: true, hours: true, priceCents: true, showers: true, status: true, paymentStatus: true, paymentMethod: true, createdAt: true, createdById: true, teamName: true, contactName: true, checkedInAt: true },
    }),
    prisma.booking.aggregate({ where: { startsAt: { gte: prevFrom, lt: from }, status: played }, _sum: { priceCents: true, hours: true }, _count: { _all: true } }),
    prisma.booking.count({ where: { createdAt: { gte: from, lt: to } } }),
    prisma.booking.count({ where: { createdAt: { gte: from, lt: to }, status: 'CANCELLED' } }),
    prisma.user.count({ where: { createdAt: { gte: from, lt: to }, role: 'CUSTOMER' } }),
    prisma.user.count({ where: { createdAt: { gte: prevFrom, lt: from }, role: 'CUSTOMER' } }),
    prisma.block.findMany({ where: { startsAt: { lt: to }, endsAt: { gt: from } }, select: { startsAt: true, endsAt: true } }),
  ]);

  const hourFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23', weekday: 'short' });
  const dowIdx: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const local = (d: Date) => {
    const p = hourFmt.formatToParts(d);
    return { dow: dowIdx[p.find((x) => x.type === 'weekday')?.value ?? 'Mon'] ?? 0, h: Number(p.find((x) => x.type === 'hour')?.value ?? 0) };
  };

  // Obsadenosť: predané hodiny / hodiny otvorenia (mínus blokovaný čas).
  const open = s.closeHour - s.openHour;
  const heat = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  const heatCap = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  for (let i = 0; i < range.days; i++) {
    const iso = addDays(range.fromIso, i);
    const { dow } = local(hallTime(iso, 12));
    for (let h = s.openHour; h < s.closeHour; h++) heatCap[dow][h]++;
  }
  let blockedHours = 0;
  for (const b of blocks) {
    const start = Math.max(b.startsAt.getTime(), from.getTime());
    const end = Math.min(b.endsAt.getTime(), to.getTime());
    blockedHours += Math.max(0, (end - start) / 3600000);
  }

  let revenue = 0;
  let paid = 0;
  let hours = 0;
  let showers = 0;
  let noShow = 0;
  let online = 0;
  let leadSum = 0;
  const methods = new Map<string, number>();
  const teams = new Map<string, { hours: number; cents: number; count: number }>();
  const byDay = new Map<string, { cents: number; hours: number }>();
  for (const b of bookings) {
    revenue += b.priceCents;
    if (b.paymentStatus === 'PAID') paid += b.priceCents;
    hours += b.hours;
    if (b.showers > 0) showers++;
    if (b.status === 'NO_SHOW') noShow++;
    if (!b.createdById) online++;
    leadSum += Math.max(0, b.startsAt.getTime() - b.createdAt.getTime());
    methods.set(b.paymentMethod, (methods.get(b.paymentMethod) ?? 0) + 1);
    const team = (b.teamName || b.contactName || '—').trim();
    const t = teams.get(team) ?? { hours: 0, cents: 0, count: 0 };
    teams.set(team, { hours: t.hours + b.hours, cents: t.cents + b.priceCents, count: t.count + 1 });
    const iso = todayIso(b.startsAt);
    const d = byDay.get(iso) ?? { cents: 0, hours: 0 };
    byDay.set(iso, { cents: d.cents + b.priceCents, hours: d.hours + b.hours });
    for (let k = 0; k < b.hours; k++) {
      const { dow, h } = local(new Date(b.startsAt.getTime() + k * 3600000));
      heat[dow][h]++;
    }
  }
  const capacity = Math.max(1, range.days * open - blockedHours);
  const count = bookings.length;
  const METHOD: Record<string, string> = { ONSITE: 'Na recepcii', TRANSFER: 'Prevodom', CARD: 'Kartou online' };

  return {
    revenue,
    paid,
    unpaid: revenue - paid,
    prevRevenue: prevAgg._sum.priceCents ?? 0,
    hours,
    prevHours: prevAgg._sum.hours ?? 0,
    count,
    prevCount: prevAgg._count._all,
    occupancy: hours / capacity,
    capacity,
    blockedHours: Math.round(blockedHours),
    avgPrice: count ? revenue / count : 0,
    avgHours: count ? hours / count : 0,
    showerRate: count ? showers / count : 0,
    noShowRate: count ? noShow / count : 0,
    onlineShare: count ? online / count : 0,
    leadDays: count ? leadSum / count / 86400000 : 0,
    created,
    cancelRate: created ? cancelled / created : 0,
    newUsers: users,
    prevUsers,
    methods: [...methods.entries()].map(([k, v]) => ({ label: METHOD[k] ?? k, value: v })).sort((a, b) => b.value - a.value),
    teams: [...teams.entries()].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.hours - a.hours).slice(0, 8),
    dailyRevenue: series(
      range,
      [...byDay.entries()].map(([d, v]) => ({ d, v: v.cents / 100, e: v.hours })),
    ),
    heat: heat.map((row, i) => row.map((v, h) => (heatCap[i][h] ? v / heatCap[i][h] : -1))),
    openHour: s.openHour,
    closeHour: s.closeHour,
  };
}

export function delta(cur: number, prev: number): number | null {
  if (!prev) return cur ? null : 0;
  return (cur - prev) / prev;
}
