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

## Fáza 3 – rezervácie

- /rezervacia: výber plochy (celá / polovica), dňa a začiatku, 1 – N hodín, cena podľa cenníka.
- Obsadenie hodín chráni unikátny index (BookingSlot) – dvojitá rezervácia toho istého času nie je možná ani pri súbežných požiadavkách.
- Potvrdenie s QR kódom, e-mail, súbor do kalendára (.ics), Moje rezervácie, zrušenie online do X hodín vopred.
- Administrácia: Kalendár ľadu (deň, polovice A/B, blokovanie času), Rezervácie (filtre, hľadanie, detail:
  príchod, zaplatené, neprišiel, zrušenie s e-mailom), Cenník a nastavenia (uložené v DB, tabuľka Setting).
- Platba zatiaľ na recepcii alebo prevodom; online karta príde vo fáze 4.

## Kompletizácia (okrem platieb)

- Údaje o firme a hale, otváracie hodiny, IBAN – Administrácia → Nastavenia → Firma a kontakty (tabuľka Setting, kľúč `site`).
- Dopyty: formulár na /kontakt a /pre-kluby → Administrácia → Dopyty (stav, poznámka), e-mail hale aj odosielateľovi.
- Recepcia (/admin/recepcia): skenovanie QR kamerou (BarcodeDetector) alebo ručný kód, príchod a platba jedným klikom.
- Rezervácia zadaná recepciou (/admin/rezervacie/nova) – aj pre zákazníka bez účtu.
- Presun rezervácie zákazníkom (nezaplatená, do X hodín vopred).
- Platba prevodom: IBAN, variabilný symbol (Booking.number) a správa pre príjemcu.
- Denný cron /api/cron/denne (vercel.json, CRON_SECRET): pripomienky deň vopred, uzavretie odohraných, upratovanie.
- Obchodné podmienky a ochrana osobných údajov – pracovný návrh na kontrolu právnikom.
- Oprava histórie migrácií: `node scripts/baseline.mjs` (po `prisma db push`).

## Zabezpečenie (súhrn)

- Relácie: podpísaný JWT v HttpOnly cookie `__Host-` (HTTPS), odvolanie pri zmene hesla / „odhlásiť všade“, personál max. 12 h.
- Heslá: bcrypt, pravidlá, zoznam bežných hesiel, kontrola uniknutých hesiel (Have I Been Pwned, k-anonymita).
- Prihlásenie: limity na IP aj e-mail, zámok účtu po 5 chybách, CAPTCHA po 3 chybách z IP, žiadne prezradenie existencie účtu.
- 2FA (TOTP) povinné pre personál, šifrované tajomstvo, záložné kódy.
- Formuláre: CAPTCHA pri registrácii, skrytá pasca a časová pečiatka, limity, blokovanie dočasných e-mailov.
- Hlavičky: CSP s nonce, HSTS, X-Frame-Options, Permissions-Policy, COOP; security.txt, robots.txt.
- Administrácia: 404 pre neoprávnených, oprávnenia podľa roly, záznam zmien.
- Ochrana kalendára: max. počet nadchádzajúcich rezervácií na účet, databázová poistka proti dvojitej rezervácii.
- Režim bez e-mailov (kým nie je doména): aktiváciu účtu a obnovu hesla robí recepcia (jednorazový odkaz).
- Denný cron: mazanie starých záznamov a neaktivovaných účtov podľa zásad ochrany údajov.

## v3 – web celého komplexu
- Úvod: rez budovou komplexu (ľad, skyboxy, bufet, posilňovňa, wellness, ihrisko), stav ľadu naživo, rýchla rezervácia.
- Stránky: /ladova-plocha (namiesto /hala), /ihrisko, /fitness-wellness, /bufet-skyboxy.
- Rezervácia: len celá plocha + šatne (cena a počet v Nastaveniach), Booking.lockerRooms / lockerCents.
