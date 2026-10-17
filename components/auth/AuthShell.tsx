
// Rozloženie pre prihlásenie, registráciu a obnovu hesla: vľavo značka, vpravo sklenená karta s formulárom.
export function AuthShell({
  kicker,
  title,
  word = 'I-SPORT',
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
    <section className="auth">
      <div className="auth__word outline-word" aria-hidden="true">
        {word}
      </div>
      <div className="wrap auth__in">
        <div className="auth__side">
          <span className="kicker">{kicker}</span>
          <h1 className="display auth__title">{title}</h1>
          {aside ?? (
            <ul className="auth__points">
              <li>
                <strong>Rezervácia ľadu online</strong>
                <span>Voľné termíny, platba a potvrdenie na pár klikov.</span>
              </li>
              <li>
                <strong>Prehľad rezervácií</strong>
                <span>História, faktúry a QR vstup na jednom mieste.</span>
              </li>
              <li>
                <strong>Chránený účet</strong>
                <span>Šifrované spojenie a voliteľné dvojstupňové overenie.</span>
              </li>
            </ul>
          )}
        </div>
        <div className="auth__card glass">{children}</div>
      </div>
    </section>
  );
}

export function AuthFoot({ children }: { children: React.ReactNode }) {
  return <p className="auth__foot">{children}</p>;
}

