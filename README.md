# I-SPORT COMPLEX – web

Rezervačný web tréningovej hokejovej haly v Košiciach. Prevádzkovateľ: I - SPORT COMPLEX s.r.o.

**Stack:** Next.js 16 · React 19 · Prisma 6 · PostgreSQL (Neon) · Vercel

## Fázy

| Fáza | Obsah | Stav |
| --- | --- | --- |
| 1 | Základ, bezpečnostné hlavičky, dizajn, verejné stránky | ✔ |
| 2 | Účty: registrácia, overenie e-mailu, prihlásenie, 2FA | |
| 3 | Rezervačný systém | |
| 4 | Platby a QR vstupenky | |
| 5 | Administrácia a recepcia | |
| 6 | Mobilná appka (Expo) | |

## Spustenie u seba

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
# doplň DATABASE_URL a DIRECT_URL z Neonu
npx prisma migrate dev --name init
npm run dev               # http://localhost:3000
```

## Kde čo upraviť

- **Údaje o firme, hale, cenách a hodinách:** `lib/site.ts`. Prázdna hodnota sa na webe zobrazí ako „Doplníme“.
- **Farby a písmo:** `app/globals.css` (premenné v `:root`).
- **Bezpečnostné hlavičky a CSP:** `lib/securityHeaders.ts`, `proxy.ts`.
- **Databáza:** `prisma/schema.prisma`.

## Bezpečnosť

Podľa špecifikácie I-SPORT (prevzaté z KrálFilmu, bez QR prihlásenia). Vo fáze 1:

- Content-Security-Policy s nonce a `strict-dynamic` (proxy.ts)
- X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP, HSTS
- `.env` nikdy v gite, kľúče len vo Verceli

## Fáza 2 – účty

- Registrácia: CAPTCHA (vlastná), honeypot, časová pasca, limity na IP, blokovanie dočasných e-mailov (zoznam + MX), 16+ a súhlas s podmienkami.
- Overenie e-mailu jednorazovým odkazom (24 h), v DB len odtlačok tokenu.
- Prihlásenie: limity na IP aj e-mail, zámok účtu po 5 chybách na 15 min, rovnaká odpoveď a čas pre neexistujúci účet.
- 2FA (TOTP, RFC 6238) s QR kódom, šifrované tajomstvo (AES-256-GCM), 8 záložných kódov, ochrana proti opakovaniu kódu.
- Zabudnuté heslo / obnova (1 h, jednorazové), po zmene hesla odhlásenie všetkých zariadení.
- Môj účet: prehľad, osobné údaje, zmena hesla, 2FA, história prihlásení, odhlásenie ostatných zariadení, export údajov (JSON), zmazanie účtu (anonymizácia).

Premenné: `AUTH_SECRET`, `APP_URL`, `RESEND_API_KEY`, `EMAIL_FROM` (pozri `.env.example`). Bez `RESEND_API_KEY` sa pri vývoji e-maily vypíšu do terminálu.

## Administrácia (/admin)

- Prístup len pre personál (ADMIN, RECEPTION, ACCOUNTANT) so zapnutým 2FA; ostatní dostanú 404.
- Prehľad (štatistiky účtov, nové registrácie, čo vyžaduje pozornosť), Zákazníci (hľadanie, filtre, detail),
  Bezpečnosť (udalosti, podozrivé IP), Záznam zmien (kto čo zmenil).
- Zásahy administrátora: overiť e-mail, odomknúť, zablokovať/odblokovať, odhlásiť všade, poslať obnovu hesla,
  zrušiť 2FA, zmeniť rolu. Nedajú sa robiť na vlastnom účte, posledný administrátor sa nedá odobrať.
- Prvý administrátor: `node --env-file=.env scripts/ucet.mjs admin`.
