import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { isStaff } from '@/lib/staff';
import { AREA_LABEL } from '@/lib/booking/format';

// Súbor .ics – pridanie tréningu do kalendára v telefóne (Google, Apple, Outlook).
function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await getSessionUser();
  if (!user) return new Response('Neprihlásený', { status: 401 });
  const b = await prisma.booking.findUnique({ where: { code } });
  if (!b || (b.userId !== user.id && !isStaff(user.role))) return new Response('Nenájdené', { status: 404 });

  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//I-SPORT COMPLEX//Rezervacie//SK',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${b.id}@isport-complex`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(b.startsAt)}`,
    `DTEND:${icsDate(b.endsAt)}`,
    `SUMMARY:${esc(`Ľad – ${AREA_LABEL[b.area]} (I-SPORT)`)}`,
    `DESCRIPTION:${esc(`Rezervácia ${b.code}. Na recepcii ukáž QR kód z webu. Príď 30 minút pred začiatkom.`)}`,
    `LOCATION:${esc('I-SPORT COMPLEX, hokejová hala, Košice')}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Tréning na ľade o 2 hodiny',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="isport-${b.code}.ics"`,
      'Cache-Control': 'no-store',
    },
  });
}
