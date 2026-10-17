// Len pri vývoji bez Resendu: odkaz, ktorý by inak prišiel e-mailom.
export function DevLink({ href }: { href?: string }) {
  if (!href) return null;
  return (
    <div className="devlink">
      <strong>Vývojový režim – e-mail sa neposiela</strong>
      <span>Toto okno vidíš len na svojom počítači. Na ostrom webe sa odkaz pošle e-mailom.</span>
      <a href={href} className="link-red">
        Otvoriť odkaz z e-mailu →
      </a>
    </div>
  );
}
