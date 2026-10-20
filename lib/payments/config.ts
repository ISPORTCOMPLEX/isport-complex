// Ktorá platobná brána je zapnutá. Predvolene žiadna (off) – na webe sa platba kartou len ukáže ako „pripravujeme“.
//
//   PAYMENTS_PROVIDER=off      platba kartou vypnutá (predvolené)
//   PAYMENTS_PROVIDER=mock     testovacia brána bez peňazí – len na localhoste a na Preview, nikdy na produkcii
//   PAYMENTS_PROVIDER=stripe   Stripe; potrebuje STRIPE_SECRET_KEY a STRIPE_WEBHOOK_SECRET
//
// Chýbajúce kľúče = brána sa nezapne (bezpečné zlyhanie), web ďalej funguje s platbou na recepcii a prevodom.

import type { ProviderId } from './types';

type Env = Record<string, string | undefined>;

export const PAY_WINDOW_MIN = 30; // ako dlho držíme termín, kým zákazník zaplatí
export const PAY_GRACE_MIN = 10; // rezerva pre oneskorený webhook, kým rezerváciu zrušíme sami

export function isProductionEnv(env: Env = process.env): boolean {
  return env.VERCEL_ENV === 'production' || (env.NODE_ENV === 'production' && !env.VERCEL_ENV);
}

export function resolveProvider(env: Env = process.env): ProviderId {
  const wanted = (env.PAYMENTS_PROVIDER ?? 'off').trim().toLowerCase();
  if (wanted === 'stripe') {
    const key = env.STRIPE_SECRET_KEY ?? '';
    const hook = env.STRIPE_WEBHOOK_SECRET ?? '';
    if (!/^(sk|rk)_(test|live)_[A-Za-z0-9]+$/.test(key) || !/^whsec_[A-Za-z0-9]+$/.test(hook)) return 'off';
    // ostrý kľúč mimo produkcie nepustíme (aby sa z náhľadu nedalo omylom účtovať skutočné peniaze)
    if (key.includes('_live_') && !isProductionEnv(env)) return 'off';
    return 'stripe';
  }
  if (wanted === 'mock') return isProductionEnv(env) ? 'off' : 'mock';
  return 'off';
}

export function cardPaymentsEnabled(env: Env = process.env): boolean {
  return resolveProvider(env) !== 'off';
}

// Prečo je brána vypnutá – pre administráciu (bez prezradenia hodnôt kľúčov).
export function providerDiagnosis(env: Env = process.env): string[] {
  const out: string[] = [];
  const wanted = (env.PAYMENTS_PROVIDER ?? 'off').trim().toLowerCase();
  if (wanted === 'off' || !wanted) out.push('PAYMENTS_PROVIDER nie je nastavené (alebo je off).');
  if (wanted === 'stripe') {
    if (!env.STRIPE_SECRET_KEY) out.push('Chýba STRIPE_SECRET_KEY.');
    else if (!/^(sk|rk)_(test|live)_/.test(env.STRIPE_SECRET_KEY)) out.push('STRIPE_SECRET_KEY nemá správny tvar (sk_test_… alebo sk_live_…).');
    else if (env.STRIPE_SECRET_KEY.includes('_live_') && !isProductionEnv(env)) out.push('Ostrý kľúč (sk_live_) sa mimo produkcie nepoužije – na Preview použi sk_test_.');
    if (!env.STRIPE_WEBHOOK_SECRET) out.push('Chýba STRIPE_WEBHOOK_SECRET.');
    else if (!env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_')) out.push('STRIPE_WEBHOOK_SECRET nemá správny tvar (whsec_…).');
  }
  if (wanted === 'mock' && isProductionEnv(env)) out.push('Testovacia brána (mock) je na produkcii zakázaná.');
  if (wanted !== 'off' && wanted !== 'stripe' && wanted !== 'mock' && wanted) out.push(`Neznáma brána „${wanted}“.`);
  return out;
}
