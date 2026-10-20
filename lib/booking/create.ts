import 'server-only';
import { randomInt } from 'node:crypto';
import type { Area, PaymentMethod } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { randomToken } from '@/lib/crypto';
import type { BookingSettings } from './settings';
import { iceCents, showerCents } from './pricing';
import { hallTime } from './time';
import { inWindow } from './availability';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function newCode(): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  return `ISP-${s}`;
}

export type CreateInput = {
  userId: string | null;
  guestEmail?: string | null;
  createdById?: string | null;
  movedFromCode?: string | null;
  paid?: boolean;
  staff?: boolean;
  iso: string;
  startHour: number;
  hours: number;
  showers: boolean;
  contactName: string;
  contactPhone: string;
  teamName: string | null;
  note: string | null;
  paymentMethod: PaymentMethod;
};

export type CreateResult = { ok: true; code: string; id: string } | { ok: false; error: string };

export function validateSlot(s: BookingSettings, iso: string, startHour: number, hours: number, now = new Date(), staff = false): string | null {
  if (!Number.isInteger(startHour) || !Number.isInteger(hours) || hours < 1 || hours > (staff ? 12 : s.maxHours)) return `Rezervácia môže mať 1 až ${staff ? 12 : s.maxHours} hodiny.`;
  if (startHour < s.openHour || startHour + hours > s.closeHour) return 'Vybraný čas je mimo otváracích hodín.';
  if (staff) {
    // Recepcia môže rezervovať aj prebiehajúcu hodinu (zákazník prišiel bez rezervácie) a ďaleko dopredu.
    if (hallTime(iso, startHour + hours).getTime() <= now.getTime()) return 'Tento čas už uplynul.';
    return null;
  }
  if (!inWindow(s, iso, now)) return `Rezervovať sa dá najviac ${s.maxDaysAhead} dní dopredu.`;
  if (hallTime(iso, startHour).getTime() < now.getTime() + s.leadMinutes * 60 * 1000) return 'Tento čas sa už nedá rezervovať.';
  return null;
}

function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002';
}

// Vytvorí rezerváciu. Obsadenie hodín zabezpečuje unikátny index v databáze –
// keď niekto iný ten istý čas zaberie o zlomok sekundy skôr, dostaneme chybu a nič sa neuloží.
export async function createBooking(s: BookingSettings, input: CreateInput): Promise<CreateResult> {
  const problem = validateSlot(s, input.iso, input.startHour, input.hours, new Date(), input.staff ?? false);
  if (problem) return { ok: false, error: problem };

  const starts: Date[] = [];
  for (let h = input.startHour; h < input.startHour + input.hours; h++) starts.push(hallTime(input.iso, h));
  const startsAt = starts[0];
  const endsAt = hallTime(input.iso, input.startHour + input.hours);
  const shower = showerCents(s, input.showers);
  const priceCents = iceCents(s, input.iso, input.startHour, input.hours) + shower;

  // Prenajíma sa celá plocha = obe polovice (A, B) v každej hodine.
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = newCode();
    try {
      const booking = await prisma.booking.create({
        data: {
          code,
          userId: input.userId,
          guestEmail: input.guestEmail ?? null,
          createdById: input.createdById ?? null,
          movedFromCode: input.movedFromCode ?? null,
          ...(input.paid ? { paymentStatus: 'PAID' as const, paidAt: new Date() } : {}),
          area: 'FULL' as Area,
          startsAt,
          endsAt,
          hours: input.hours,
          priceCents,
          showers: shower > 0 ? 1 : 0,
          showerCents: shower,
          paymentMethod: input.paymentMethod,
          contactName: input.contactName,
          contactPhone: input.contactPhone,
          teamName: input.teamName,
          note: input.note,
          qrToken: randomToken(18),
          slots: { create: starts.flatMap((slotStart) => (['A', 'B'] as const).map((half) => ({ slotStart, half }))) },
        },
        select: { id: true, code: true },
      });
      return { ok: true, code: booking.code, id: booking.id };
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
      const target = String((e as { meta?: { target?: unknown } }).meta?.target ?? '');
      if (target.includes('code')) continue; // kolízia kódu – skúsime iný
      break; // čas je obsadený
    }
  }
  return { ok: false, error: 'Vybraný čas medzitým niekto obsadil. Vyber si iný termín.' };
}

// Zrušenie: uvoľní hodiny (zmaže sloty) a označí rezerváciu ako zrušenú.
export async function cancelBooking(id: string, by: 'customer' | 'staff', reason: string | null): Promise<boolean> {
  const r = await prisma.$transaction(async (tx) => {
    const updated = await tx.booking.updateMany({
      where: { id, status: 'CONFIRMED' },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason, cancelledBy: by },
    });
    if (updated.count === 1) await tx.bookingSlot.deleteMany({ where: { bookingId: id } });
    return updated.count;
  });
  return r === 1;
}
