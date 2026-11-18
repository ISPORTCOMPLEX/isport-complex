import { JsonLd } from '@/components/JsonLd';
import { getT } from '@/lib/i18n/server';

// Časté otázky: rozbaľovacie odpovede bez JavaScriptu + údaje FAQPage pre Google.
export type FaqItem = [question: string, answer: string];

export async function Faq({ items, title, id = 'otazky' }: { items: FaqItem[]; title?: string; id?: string }) {
  if (!items.length) return null;
  const t = await getT();
  return (
    <section className="wrap faq" id={id} aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`} className="disp sec-title">
        {title ?? t('Časté otázky')}
      </h2>
      <div className="faq__list">
        {items.map(([q, a]) => (
          <details key={q} className="faq__item">
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }} />
    </section>
  );
}
