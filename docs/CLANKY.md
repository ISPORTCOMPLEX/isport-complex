# Redakčný systém – články

**Administrácia → Web → Články** (`/admin/clanky`)

## Kto čo môže
| | Recepcia | Administrátor |
|---|---|---|
| Písať a upravovať koncepty | ✔ | ✔ |
| Zverejniť, naplánovať, stiahnuť, pripnúť | – | ✔ |
| Kôš a trvalé zmazanie | – | ✔ |

## Editor
- Bloky: text (tučné, kurzíva, odkaz, zoznam), medzititulok, fotka, galéria, video (nahraté, do 100 MB), YouTube, citát, tlačidlo, oddeľovač.
- Ukladá sa automaticky 2,5 s po poslednej zmene. Verzia do histórie sa uloží pri ručnom uložení, zverejnení a najviac raz za 10 minút pri automatickom ukladaní (posledných 50).
- **Náhľad** otvorí článok tak, ako ho uvidí návštevník (koncept vidí len prihlásený redaktor, adresa má `?nahlad=1` a vyhľadávače ju neindexujú).
- **Naplánovať** – článok sa zobrazí sám v zadanom čase (netreba cron).
- **Pripnúť na úvod webu** – článok bude veľký navrchu úvodnej stránky (pripnutý môže byť len jeden).

## Na webe
- `/aktuality` – zoznam s kategóriami a stránkovaním
- `/aktuality/<adresa>` – článok, `/aktuality/<adresa>/fotky/<n>` – prehliadač fotiek z článku
- `/aktuality/rss.xml` – RSS, články sú aj v `sitemap.xml`
- Úvodná stránka: ak existuje aspoň jeden zverejnený článok, navrchu sú Novinky; inak ostáva pôvodný úvod.

## Bezpečnosť
- Text sa čistí na serveri pri uložení aj pri zobrazení (`sanitizeInline` – povolené len b, i, u, a, br, ul, ol, li). Testy: `tests/articles.test.ts`.
- Fotky a videá idú priamo do úložiska s podpisom servera; na webe sa zobrazujú cez `/obrazky/…` a `/videa/…` na našej doméne.
- YouTube sa načíta až po kliknutí (youtube-nocookie.com).
