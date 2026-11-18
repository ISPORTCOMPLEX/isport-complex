import { JsonLd } from '@/components/JsonLd';

// Časté otázky: rozbaľovacie odpovede bez JavaScriptu + údaje FAQPage pre Google.
export type FaqItem = [question: string, answer: string];

export function Faq({ items, title = 'Časté otázky', id = 'otazky' }: { items: FaqItem[]; title?: string; id?: string }) {
  if (!items.length) return null;
  return (
    <section className="wrap faq" id={id} aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`} className="disp sec-title">
        {title}
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
