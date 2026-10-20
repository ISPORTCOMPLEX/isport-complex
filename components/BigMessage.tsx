// Veľká správa na tmavom pozadí s čiarami ihriska (404, chyba, pripravujeme).
export function BigMessage({ kicker, title, text, children }: { kicker: string; title: React.ReactNode; text?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="nf">
      <i className="nf__blue" aria-hidden="true" />
      <i className="nf__red" aria-hidden="true" />
      <i className="nf__circle" aria-hidden="true" />
      <div className="wrap nf__in">
        <span className="au__kicker">{kicker}</span>
        <h1 className="cond nf__title">{title}</h1>
        {text ? <p className="nf__text">{text}</p> : null}
        {children}
      </div>
    </section>
  );
}
