// Kým sa nová stránka pripravuje: obrys úvodného pásu a obsahu – klik reaguje okamžite.
export default function Loading() {
  return (
    <div className="pgload" aria-busy="true" aria-label="Načítavam stránku">
      <div className="wrap pgload__band">
        <i className="pgload__crumb" />
        <i className="pgload__title" />
        <i className="pgload__lead" />
      </div>
      <div className="wrap pgload__body">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
