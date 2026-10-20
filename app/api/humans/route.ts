// humans.txt – kto stojí za webom (humanstxt.org). Statický súbor, CDN ho drží v cache.
export const dynamic = 'force-static';

const BODY = `
  ___      ____  ____    ___   ____  _____
 |_ _|    / ___||  _ \\  / _ \\ |  _ \\|_   _|
  | |_____\\___ \\| |_) || | | || |_) | | |
  | |_____|___) |  __/ | |_| ||  _ <  | |
 |___|    |____/|_|     \\___/ |_| \\_\\ |_|
                 C O M P L E X  ·  K O Š I C E

/* TEAM */

  Návrh, dizajn a vývoj:  Matúš Bereš
  E-mail:                 matusvanberes@gmail.com
  Krajina:                Slovensko

/* ĎAKUJEME */

  Hokejistom, trénerom a všetkým, ktorí chodia na ľad.

/* SITE */

  Jazyk:          slovenčina
  Písmo:          ISport Display (vlastné), Archivo
  Štandardy:      HTML5, CSS3, WCAG 2.2 AA, OWASP ASVS
  Vlastné logo, písmo a ilustrácie: Matúš Bereš

            Navrhnuté a vytvorené s láskou k hokeju.
`;

export function GET() {
  return new Response(BODY.replace(/^\n/, ''), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' },
  });
}
