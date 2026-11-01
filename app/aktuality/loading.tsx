// Kým sa novinky načítajú: obrysy kariet namiesto prázdnej stránky.
export default function Loading() {
  return (
    <section className="wrap sk2" aria-busy="true" aria-label="Načítavam novinky">
      <i className="sk2__title" />
      <div className="sk2__grid">
        {[0, 1, 2].map((i) => (
          <div key={i} className="sk2__card">
            <i className="sk2__img" />
            <i className="sk2__l1" />
            <i className="sk2__l2" />
            <i className="sk2__l3" />
          </div>
        ))}
      </div>
    </section>
  );
}
