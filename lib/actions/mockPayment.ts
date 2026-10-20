'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getProvider } from '@/lib/payments';
import { markPaid, markUnsuccessful } from '@/lib/payments/service';
import { getBaseUrl } from '@/lib/requestInfo';
import { getSessionUser } from '@/lib/session';
import { randomToken } from '@/lib/crypto';
import { str } from '@/lib/validate';

// Tlačidlá testovacej brány. Fungujú len keď PAYMENTS_PROVIDER=mock (nikdy na produkcii).
export async function mockPayAction(form: FormData): Promise<void> {
  const provider = getProvider();
  if (provider?.id !== 'mock') redirect('/');
  const user = await getSessionUser();
  const ref = str(form, 'ref', 80);
  const outcome = str(form, 'outcome', 10);
  const p = await prisma.payment.findUnique({ where: { sessionRef: ref }, include: { booking: true } });
  if (!p || !user || p.booking.userId !== user.id) redirect('/');
  const base = await getBaseUrl();
  if (outcome === 'pay') {
    await markPaid(ref, `mock_pi_${randomToken(12)}`, p.amountCents, base);
    redirect(`/rezervacia/${p.booking.code}?platba=ok`);
  }
  if (outcome === 'fail') {
    await markUnsuccessful(ref, 'FAILED', 'Testovacia platba zlyhala', base);
    redirect(`/rezervacia/${p.booking.code}?platba=zlyhala`);
  }
  redirect(`/rezervacia/${p.booking.code}?platba=zrusena`);
}
