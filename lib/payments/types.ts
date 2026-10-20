// Spoločné rozhranie pre platobné brány. Každá brána (Stripe, testovacia, neskôr napr. GoPay alebo Comgate)
// implementuje PaymentProvider – zvyšok webu (rezervácie, administrácia) s bránou priamo nepracuje.
// Návod na pridanie ďalšej brány: docs/PLATBY.md.

export type ProviderId = 'off' | 'mock' | 'stripe';

export type CheckoutInput = {
  bookingId: string;
  code: string; // kód rezervácie, napr. ISP-ABC123
  amountCents: number;
  currency: 'EUR';
  description: string; // čo zákazník uvidí na platobnej stránke
  customerEmail: string | null;
  successUrl: string;
  cancelUrl: string;
  expiresAt: Date; // do kedy sa dá zaplatiť (Stripe: najskôr o 30 min, najneskôr o 24 h)
  idempotencyKey: string;
};

export type CheckoutResult = { sessionRef: string; url: string; expiresAt: Date; livemode: boolean };

// Stav platobnej relácie priamo z brány – keď sa zákazník vráti skôr, ako príde webhook,
// alebo keď webhook nepríde vôbec (zladenie pri dennej údržbe).
export type SessionStatus =
  | { state: 'open' }
  | { state: 'paid'; intentRef: string | null; amountCents: number }
  | { state: 'expired' };

// Udalosti z brány prevedené do jednotného tvaru.
export type PaymentEventIn =
  | { kind: 'paid'; eventId: string; sessionRef: string; intentRef: string | null; amountCents: number }
  | { kind: 'expired'; eventId: string; sessionRef: string }
  | { kind: 'failed'; eventId: string; sessionRef: string; reason: string }
  | { kind: 'refunded'; eventId: string; intentRef: string; refundedTotalCents: number }
  | { kind: 'ignored'; eventId: string; type: string };

export type RefundResult = { refundRef: string; status: 'succeeded' | 'pending' | 'failed' };

export interface PaymentProvider {
  id: Exclude<ProviderId, 'off'>;
  label: string; // názov pre administráciu
  test: boolean; // testovací režim (žiadne skutočné peniaze)
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  getSession(sessionRef: string): Promise<SessionStatus>;
  expireSession(sessionRef: string): Promise<void>;
  refund(intentRef: string, amountCents: number, idempotencyKey: string, reason: string | null): Promise<RefundResult>;
  // Overí podpis a prevedie udalosť; pri neplatnom podpise vyhodí WebhookSignatureError.
  parseWebhook(rawBody: string, headers: Headers): Promise<PaymentEventIn>;
}

export class WebhookSignatureError extends Error {
  constructor(message = 'Neplatný podpis webhooku.') {
    super(message);
    this.name = 'WebhookSignatureError';
  }
}

export class ProviderError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
  }
}
