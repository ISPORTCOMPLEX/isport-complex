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
