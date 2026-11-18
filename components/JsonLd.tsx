import { headers } from 'next/headers';

// Štruktúrované údaje pre vyhľadávače (Google Mapy, FAQ). Inline skript s nonce – prejde cez CSP.
export async function JsonLd({ data }: { data: unknown }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
