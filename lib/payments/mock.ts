// Testovacia brána bez skutočných peňazí – na vývoj a ukážku celého procesu bez účtu v Stripe.
// Zákazník je presmerovaný na /platba/test/<relácia>, kde klikne „Zaplatiť“ alebo „Zlyhať“.
// Na produkcii sa nikdy nezapne (pozri config.ts).

import { randomToken } from '@/lib/crypto';
import { prisma } from '@/lib/prisma';
import { WebhookSignatureError, type PaymentProvider } from './types';

export function mockProvider(): PaymentProvider {
  return {
    id: 'mock',
    label: 'Testovacia brána',
    test: true,
    async createCheckout(i) {
      const sessionRef = `mock_cs_${randomToken(16)}`;
      const origin = new URL(i.successUrl).origin;
      return { sessionRef, url: `${origin}/platba/test/${sessionRef}`, expiresAt: i.expiresAt, livemode: false };
    },
    async getSession(sessionRef) {
      const p = await prisma.payment.findUnique({ where: { sessionRef } });
      if (!p) return { state: 'expired' };
      if (p.state === 'SUCCEEDED') return { state: 'paid', intentRef: p.intentRef, amountCents: p.amountCents };
      if (p.state !== 'CREATED' || (p.expiresAt && p.expiresAt < new Date())) return { state: 'expired' };
      return { state: 'open' };
    },
    async expireSession() {},
    async refund() {
      return { refundRef: `mock_re_${randomToken(12)}`, status: 'succeeded' };
    },
    async parseWebhook() {
      throw new WebhookSignatureError('Testovacia brána nepoužíva webhooky.');
    },
  };
}
