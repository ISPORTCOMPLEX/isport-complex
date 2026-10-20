// Stripe cez REST API (bez knižnice stripe – menej závislostí, rovnaký prístup ako pri Resende a Cloudinary).
// Zákazník platí na hostovanej stránke Stripe Checkout: karta, Apple Pay a Google Pay.
// Číslo karty nikdy nejde cez náš server (PCI DSS: stačí SAQ A).
//
// Dokumentácia: https://docs.stripe.com/api/checkout/sessions, https://docs.stripe.com/webhooks#verify-manually

import { createHmac, timingSafeEqual } from 'node:crypto';
import { ProviderError, WebhookSignatureError, type CheckoutInput, type CheckoutResult, type PaymentEventIn, type PaymentProvider, type RefundResult, type SessionStatus } from './types';

const API = 'https://api.stripe.com/v1';
// Pevná verzia API – zmena správania na strane Stripe nás neprekvapí. Pri aktualizácii prejdi changelog.
export const STRIPE_API_VERSION = '2024-06-20';
const TOLERANCE_SEC = 300;

type Params = Record<string, unknown>;

// Stripe chce application/x-www-form-urlencoded s vnorenými kľúčmi: a[b][0][c]=…
export function formEncode(params: Params, prefix = ''): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item !== null && typeof item === 'object') parts.push(formEncode(item as Params, `${key}[${i}]`));
        else parts.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`);
      });
    } else if (typeof v === 'object' && !(v instanceof Date)) {
      parts.push(formEncode(v as Params, key));
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v instanceof Date ? String(Math.floor(v.getTime() / 1000)) : String(v))}`);
    }
  }
  return parts.filter(Boolean).join('&');
}

// Overenie podpisu hlavičky Stripe-Signature: t=…,v1=…  (HMAC-SHA256 z „t.telo“ tajným kľúčom webhooku)
export function verifyStripeSignature(rawBody: string, header: string | null, secret: string, nowSec = Math.floor(Date.now() / 1000)): void {
  if (!header) throw new WebhookSignatureError('Chýba hlavička Stripe-Signature.');
  let t = '';
  const v1: string[] = [];
  for (const part of header.split(',')) {
    const [k, val] = part.split('=', 2).map((x) => x.trim());
    if (k === 't') t = val ?? '';
    if (k === 'v1' && val) v1.push(val);
  }
  const ts = Number(t);
  if (!t || !Number.isFinite(ts) || v1.length === 0) throw new WebhookSignatureError('Hlavička Stripe-Signature nemá správny tvar.');
  if (Math.abs(nowSec - ts) > TOLERANCE_SEC) throw new WebhookSignatureError('Podpis webhooku je príliš starý.');
  const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`, 'utf8').digest();
  const ok = v1.some((sig) => {
    if (!/^[0-9a-f]{64}$/i.test(sig)) return false;
    const got = Buffer.from(sig, 'hex');
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
  if (!ok) throw new WebhookSignatureError();
}

type StripeObj = Record<string, unknown>;
const s = (v: unknown) => (typeof v === 'string' ? v : null);
const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
// payment_intent môže byť id alebo rozbalený objekt
const ref = (v: unknown) => s(v) ?? (v && typeof v === 'object' ? s((v as StripeObj).id) : null);

export function mapStripeEvent(event: StripeObj): PaymentEventIn {
  const eventId = s(event.id) ?? '';
  const type = s(event.type) ?? '';
  const obj = ((event.data as StripeObj | undefined)?.object ?? {}) as StripeObj;
  if (!eventId) throw new WebhookSignatureError('Udalosť nemá id.');
  switch (type) {
    case 'checkout.session.completed':
      // pri kartách je payment_status hneď „paid“; „unpaid“ = oneskorená metóda, počkáme na async_payment_*
      if (obj.payment_status === 'paid') return { kind: 'paid', eventId, sessionRef: s(obj.id) ?? '', intentRef: ref(obj.payment_intent), amountCents: n(obj.amount_total) };
      return { kind: 'ignored', eventId, type: `${type}:${String(obj.payment_status)}` };
    case 'checkout.session.async_payment_succeeded':
      return { kind: 'paid', eventId, sessionRef: s(obj.id) ?? '', intentRef: ref(obj.payment_intent), amountCents: n(obj.amount_total) };
    case 'checkout.session.async_payment_failed':
      return { kind: 'failed', eventId, sessionRef: s(obj.id) ?? '', reason: 'Oneskorená platba zlyhala.' };
    case 'checkout.session.expired':
      return { kind: 'expired', eventId, sessionRef: s(obj.id) ?? '' };
    case 'charge.refunded': {
      const intentRef = ref(obj.payment_intent);
      if (!intentRef) return { kind: 'ignored', eventId, type };
      return { kind: 'refunded', eventId, intentRef, refundedTotalCents: n(obj.amount_refunded) };
    }
    default:
      return { kind: 'ignored', eventId, type };
  }
}

export function stripeProvider(secretKey: string, webhookSecret: string): PaymentProvider {
  async function call(method: 'GET' | 'POST', path: string, params?: Params, idempotencyKey?: string): Promise<StripeObj> {
    const headers: Record<string, string> = { Authorization: `Bearer ${secretKey}`, 'Stripe-Version': STRIPE_API_VERSION };
    if (method === 'POST') headers['Content-Type'] = 'application/x-www-form-urlencoded';
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    const res = await fetch(`${API}${path}`, { method, headers, body: method === 'POST' ? formEncode(params ?? {}) : undefined, signal: AbortSignal.timeout(15000), cache: 'no-store' });
    const body = (await res.json().catch(() => ({}))) as StripeObj;
    if (!res.ok) {
      const err = (body.error ?? {}) as StripeObj;
      // správu z brány zapíšeme do logu, nikdy nie kľúč
      throw new ProviderError(`Stripe ${res.status}: ${String(err.message ?? 'neznáma chyba').slice(0, 300)}`, res.status);
    }
    return body;
  }

  return {
    id: 'stripe',
    label: 'Stripe',
    test: secretKey.includes('_test_'),

    async createCheckout(i: CheckoutInput): Promise<CheckoutResult> {
      const session = await call(
        'POST',
        '/checkout/sessions',
        {
          mode: 'payment',
          locale: 'sk',
          client_reference_id: i.bookingId,
          customer_email: i.customerEmail ?? undefined,
          success_url: i.successUrl,
          cancel_url: i.cancelUrl,
          expires_at: i.expiresAt,
          line_items: [{ quantity: 1, price_data: { currency: i.currency.toLowerCase(), unit_amount: i.amountCents, product_data: { name: i.description } } }],
          metadata: { bookingId: i.bookingId, code: i.code },
          payment_intent_data: { description: `Rezervácia ${i.code}`, metadata: { bookingId: i.bookingId, code: i.code } },
        },
        i.idempotencyKey,
      );
      const id = s(session.id);
      const url = s(session.url);
      if (!id || !url) throw new ProviderError('Stripe nevrátil platobnú stránku.');
      return { sessionRef: id, url, expiresAt: new Date(n(session.expires_at) * 1000 || i.expiresAt.getTime()), livemode: session.livemode === true };
    },

    async getSession(sessionRef: string): Promise<SessionStatus> {
      const x = await call('GET', `/checkout/sessions/${encodeURIComponent(sessionRef)}`);
      if (x.status === 'expired') return { state: 'expired' };
      if (x.status === 'complete' && x.payment_status === 'paid') return { state: 'paid', intentRef: ref(x.payment_intent), amountCents: n(x.amount_total) };
      return { state: 'open' };
    },

    async expireSession(sessionRef: string): Promise<void> {
      try {
        await call('POST', `/checkout/sessions/${encodeURIComponent(sessionRef)}/expire`);
      } catch (e) {
        // už zaplatená alebo už vypršaná relácia sa zrušiť nedá – to nevadí
        if (!(e instanceof ProviderError) || e.status !== 400) throw e;
      }
    },

    async refund(intentRef: string, amountCents: number, idempotencyKey: string, reason: string | null): Promise<RefundResult> {
      const r = await call('POST', '/refunds', { payment_intent: intentRef, amount: amountCents, reason: 'requested_by_customer', metadata: { note: reason ?? '' } }, idempotencyKey);
      const status = s(r.status);
      return { refundRef: s(r.id) ?? '', status: status === 'succeeded' ? 'succeeded' : status === 'failed' || status === 'canceled' ? 'failed' : 'pending' };
    },

    async parseWebhook(rawBody: string, headers: Headers): Promise<PaymentEventIn> {
      verifyStripeSignature(rawBody, headers.get('stripe-signature'), webhookSecret);
      let event: StripeObj;
      try {
        event = JSON.parse(rawBody) as StripeObj;
      } catch {
        throw new WebhookSignatureError('Telo webhooku nie je JSON.');
      }
      return mapStripeEvent(event);
    },
  };
}
