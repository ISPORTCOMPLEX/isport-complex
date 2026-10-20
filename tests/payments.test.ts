// Testy platobnej brány bez siete a databázy: podpis webhooku, mapovanie udalostí, výber brány, sumy.
// Spustenie:  npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyStripeSignature, mapStripeEvent, formEncode } from '../lib/payments/stripe.ts';
import { resolveProvider, providerDiagnosis, cardPaymentsEnabled } from '../lib/payments/config.ts';
import { refundState, parseEuroInput } from '../lib/payments/math.ts';
import { WebhookSignatureError } from '../lib/payments/types.ts';

const SECRET = 'whsec_testsecret123';
const sig = (body: string, t: number, secret = SECRET) => `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;

test('webhook: platný podpis prejde', () => {
  const now = 1_800_000_000;
  const body = '{"id":"evt_1"}';
  assert.doesNotThrow(() => verifyStripeSignature(body, sig(body, now), SECRET, now));
  // viac podpisov (rotácia tajomstva) – stačí jeden platný
  assert.doesNotThrow(() => verifyStripeSignature(body, `${sig(body, now, 'whsec_old')},v1=${sig(body, now).split('v1=')[1]}`, SECRET, now));
});

test('webhook: zlý, starý alebo chýbajúci podpis neprejde', () => {
  const now = 1_800_000_000;
  const body = '{"id":"evt_1"}';
  const bad: [string, string | null, number][] = [
    [body, null, now],
    [body, 'garbage', now],
    [body, sig(body, now, 'whsec_iny'), now],
    [`${body} `, sig(body, now), now], // zmenené telo
    [body, sig(body, now - 301), now], // starší ako 5 min (replay)
    [body, `t=${now},v1=zz`, now],
    [body, `t=${now}`, now],
  ];
  for (const [b, h, n] of bad) assert.throws(() => verifyStripeSignature(b, h, SECRET, n), WebhookSignatureError, String(h));
});

test('webhook: mapovanie udalostí Stripe', () => {
  const ev = (type: string, object: Record<string, unknown>) => ({ id: 'evt_9', type, data: { object } });
  assert.deepEqual(mapStripeEvent(ev('checkout.session.completed', { id: 'cs_1', payment_status: 'paid', payment_intent: 'pi_1', amount_total: 12000 })), {
    kind: 'paid',
    eventId: 'evt_9',
    sessionRef: 'cs_1',
    intentRef: 'pi_1',
    amountCents: 12000,
  });
  assert.equal(mapStripeEvent(ev('checkout.session.completed', { id: 'cs_1', payment_status: 'unpaid' })).kind, 'ignored');
  assert.equal(mapStripeEvent(ev('checkout.session.expired', { id: 'cs_1' })).kind, 'expired');
  assert.equal(mapStripeEvent(ev('checkout.session.async_payment_failed', { id: 'cs_1' })).kind, 'failed');
  const r = mapStripeEvent(ev('charge.refunded', { payment_intent: { id: 'pi_2' }, amount_refunded: 500 }));
  assert.deepEqual(r, { kind: 'refunded', eventId: 'evt_9', intentRef: 'pi_2', refundedTotalCents: 500 });
  assert.equal(mapStripeEvent(ev('customer.created', {})).kind, 'ignored');
  assert.throws(() => mapStripeEvent({ type: 'x' }), WebhookSignatureError);
});

test('Stripe: kódovanie parametrov', () => {
  const q = formEncode({ mode: 'payment', line_items: [{ quantity: 1, price_data: { unit_amount: 100 } }], metadata: { code: 'ISP-A&B' }, skip: undefined });
  assert.equal(decodeURIComponent(q), 'mode=payment&line_items[0][quantity]=1&line_items[0][price_data][unit_amount]=100&metadata[code]=ISP-A&B');
  assert.ok(q.includes('ISP-A%26B'), '& v hodnote je zakódované');
  assert.equal(formEncode({ expires_at: new Date(1_800_000_000_000) }), 'expires_at=1800000000');
});

test('výber brány: bezpečné predvolené vypnutie', () => {
  assert.equal(resolveProvider({}), 'off');
  assert.equal(cardPaymentsEnabled({}), false);
  assert.equal(resolveProvider({ PAYMENTS_PROVIDER: 'stripe' }), 'off', 'bez kľúčov sa nezapne');
  assert.equal(resolveProvider({ PAYMENTS_PROVIDER: 'stripe', STRIPE_SECRET_KEY: 'sk_test_abc', STRIPE_WEBHOOK_SECRET: 'whsec_abc' }), 'stripe');
  assert.equal(resolveProvider({ PAYMENTS_PROVIDER: 'stripe', STRIPE_SECRET_KEY: 'pk_test_abc', STRIPE_WEBHOOK_SECRET: 'whsec_abc' }), 'off', 'verejný kľúč nestačí');
  // ostrý kľúč len na produkcii
  const live = { PAYMENTS_PROVIDER: 'stripe', STRIPE_SECRET_KEY: 'sk_live_abc', STRIPE_WEBHOOK_SECRET: 'whsec_abc' };
  assert.equal(resolveProvider({ ...live, VERCEL_ENV: 'preview', NODE_ENV: 'production' }), 'off');
  assert.equal(resolveProvider({ ...live, VERCEL_ENV: 'production', NODE_ENV: 'production' }), 'stripe');
  // testovacia brána nikdy na produkcii
  assert.equal(resolveProvider({ PAYMENTS_PROVIDER: 'mock', NODE_ENV: 'development' }), 'mock');
  assert.equal(resolveProvider({ PAYMENTS_PROVIDER: 'mock', VERCEL_ENV: 'production', NODE_ENV: 'production' }), 'off');
  assert.equal(resolveProvider({ PAYMENTS_PROVIDER: 'mock', NODE_ENV: 'production' }), 'off');
  assert.equal(resolveProvider({ PAYMENTS_PROVIDER: 'paypal' }), 'off');
});

test('diagnostika brány neprezradí kľúč', () => {
  const out = providerDiagnosis({ PAYMENTS_PROVIDER: 'stripe', STRIPE_SECRET_KEY: 'sk_live_TAJNE123', STRIPE_WEBHOOK_SECRET: 'zly', VERCEL_ENV: 'preview' }).join(' ');
  assert.ok(!out.includes('TAJNE123'));
  assert.ok(out.includes('whsec_'));
});

test('sumy a stav vrátenia', () => {
  assert.equal(parseEuroInput('12,50'), 1250);
  assert.equal(parseEuroInput(' 120 € '), 12000);
  assert.equal(parseEuroInput('0.1'), 10);
  for (const bad of ['', '0', '-5', '1,234', 'abc', '1e3', '12,5,0', '9999999']) assert.equal(parseEuroInput(bad), null, bad);
  assert.equal(refundState(12000, 0), 'PAID');
  assert.equal(refundState(12000, 2000), 'PARTIALLY_REFUNDED');
  assert.equal(refundState(12000, 12000), 'REFUNDED');
  assert.equal(refundState(0, 0), null);
});
