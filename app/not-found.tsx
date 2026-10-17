import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="soon">
      <div className="wrap soon__in">
        <span className="kicker">Chyba 404</span>
        <h1 className="display h2">Táto stránka neexistuje</h1>
        <p className="lead">Odkaz je nesprávny alebo stránka bola presunutá.</p>
        <div>
          <Link href="/" className="btn">
            Späť na úvod
          </Link>
        </div>
      </div>
    </section>
  );
}
