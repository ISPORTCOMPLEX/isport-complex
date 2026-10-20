import { getProvider } from '@/lib/payments';
import { handleEvent } from '@/lib/payments/service';
import { WebhookSignatureError } from '@/lib/payments/types';
import { getBaseUrl } from '@/lib/requestInfo';

// Webhook platobnej brány (Stripe → Developers → Webhooks → Add endpoint):
//   https://<doména>/api/platby/webhook
//   udalosti: checkout.session.completed, checkout.session.async_payment_succeeded,
//             checkout.session.async_payment_failed, checkout.session.expired, charge.refunded
// Pravosť overuje podpis (STRIPE_WEBHOOK_SECRET). Bez platného podpisu sa nič nespracuje.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BODY = 512 * 1024;

export async function POST(req: Request) {
  const provider = getProvider();
  if (!provider || provider.id === 'mock') return new Response('Not found', { status: 404 });

  const len = Number(req.headers.get('content-length') ?? '0');
  if (len > MAX_BODY) return new Response('Payload too large', { status: 413 });
  const raw = await req.text();
  if (raw.length > MAX_BODY) return new Response('Payload too large', { status: 413 });

  let event;
  try {
    event = await provider.parseWebhook(raw, req.headers);
  } catch (err) {
    if (err instanceof WebhookSignatureError) {
      console.warn('[payments:webhook] odmietnutý podpis:', err.message);
      return new Response('Bad signature', { status: 400 });
    }
    throw err;
  }

  try {
    const result = await handleEvent(provider, event, await getBaseUrl());
    return Response.json({ received: true, result });
  } catch (err) {
    // 500 → brána udalosť pošle znova neskôr
    console.error('[payments:webhook]', event.kind, err);
    return new Response('Processing error', { status: 500 });
  }
}
