import 'server-only';
import { resolveProvider } from './config';
import { mockProvider } from './mock';
import { stripeProvider } from './stripe';
import type { PaymentProvider } from './types';

export { cardPaymentsEnabled, PAY_WINDOW_MIN } from './config';

// Zapnutá brána alebo null, keď je platba kartou vypnutá.
export function getProvider(): PaymentProvider | null {
  switch (resolveProvider()) {
    case 'stripe':
      return stripeProvider(process.env.STRIPE_SECRET_KEY!, process.env.STRIPE_WEBHOOK_SECRET!);
    case 'mock':
      return mockProvider();
    default:
      return null;
  }
}

// Brána podľa toho, čím bola platba vytvorená (aj keď sa medzitým prepla – napr. vrátenie starej platby).
export function providerFor(id: string): PaymentProvider | null {
  const current = getProvider();
  return current && current.id === id ? current : null;
}
