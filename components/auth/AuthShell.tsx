// Prihlásenie, registrácia a obnova hesla: vľavo tmavá aréna s nadpisom, vpravo ľad s bielou kartou formulára.
export function AuthShell({
  kicker,
  title,
  children,
  aside,
}: {
  kicker: string;
  title: React.ReactNode;
  word?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="au">
      <div className="au__dark">
        <div className="au__dark-in">
          <span className="au__kicker">{kicker}</span>
          <h1 className="cond au__title">{title}</h1>
          {aside ?? (
            <ul className="au__points">
              <li>
                <strong>Rezervácia ľadu online</strong>
                <span>Voľné termíny, cena a potvrdenie s QR kódom na pár klikov.</span>
              </li>
              <li>
                <strong>Prehľad rezervácií</strong>
                <span>Presun, zrušenie a história na jednom mieste.</span>
              </li>
              <li>
                <strong>Chránený účet</strong>
                <span>Šifrované spojenie a voliteľné dvojstupňové overenie.</span>
              </li>
            </ul>
          )}
        </div>
      </div>
      <div className="au__ice ice">
        <div className="au__card">{children}</div>
      </div>
    </section>
  );
}

export function AuthFoot({ children }: { children: React.ReactNode }) {
  return <p className="auth__foot">{children}</p>;
}
