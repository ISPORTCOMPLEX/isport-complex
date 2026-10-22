# Bezpečnosť – I-SPORT COMPLEX

Prevádzková príručka: čo je zabezpečené, ako nasadzovať, zálohovať a čo robiť pri incidente.
Hlásenie zraniteľností: kontakt v `/.well-known/security.txt`.

## Kontroly (spúšťaj pred každým nasadením)

| Príkaz (PowerShell, v priečinku projektu) | Čo overí |
|---|---|
| `npm audit --omit=dev` | známe zraniteľnosti knižníc |
| `npm run audit:static` | nebezpečné API, chýbajúce overenie prihlásenia, tajomstvá v kóde, minimálne verzie |
| `npm test` | jadro zabezpečenia: presmerovania, 2FA, šifrovanie, podpisy, formuláre, hlavičky |
| `npm run typecheck` | typová kontrola |
| `node scripts/security-check.mjs https://isport-complex.vercel.app` | nasadený web: HTTPS, hlavičky, administrácia a API bez prihlásenia |

To isté beží automaticky v GitHube (`.github/workflows/security.yml`) pri každom pushi a raz týždenne.

## Premenné prostredia (Vercel → Settings → Environment Variables, prostredie Production)

| Premenná | Povinná | Poznámka |
|---|---|---|
| `DATABASE_URL` | áno | Neon, s `-pooler`, rola `isport_app` (pozri `docs/db-roly.sql`) |
| `DIRECT_URL` | áno | na Verceli môže byť rovnaká ako `DATABASE_URL` (migrácie sa robia len lokálne) |
| `AUTH_SECRET` | áno | min. 32 náhodných znakov, **iný ako lokálne** |
| `APP_URL` | áno | `https://isport-complex.vercel.app` (neskôr vlastná doména) |
| `CRON_SECRET` | áno | min. 16 znakov – bez neho nebeží denná údržba ani pripomienky |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | pre fotky | `API_SECRET` nikdy do prehliadača ani do gitu; pri úniku Cloudinary → API Keys → nový kľúč |
| `RESEND_API_KEY`, `EMAIL_FROM` | po doméne | bez nich web e-maily neposiela (aktivácie rieši recepcia) |

Nový náhodný kľúč (PowerShell, kryptograficky bezpečný generátor):
```powershell
$b = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
```

## Nasadenie
1. `npm audit --omit=dev`, `npm run audit:static`, `npm test` – bez chýb.
2. Zmena databázy: `.\node_modules\.bin\prisma db push` **proti vývojovej vetve Neonu**, po overení proti produkcii.
3. `git add -A`, `git commit`, `git push` → Vercel nasadí.
4. Po nasadení: `node scripts/security-check.mjs https://isport-complex.vercel.app` a prihlásenie do administrácie.
5. Návrat: Vercel → Deployments → predchádzajúce nasadenie → **Promote to Production** (okamžite).

## Zálohy a obnova
- **Neon (automaticky):** okamžitá obnova do 6 hodín dozadu (Free plán). Neon → Branches → Restore.
- **Denná šifrovaná záloha:** `.github/workflows/backup.yml` (30 dní v GitHube). Potrebuje tajomstvá `BACKUP_DATABASE_URL` a `BACKUP_PASSPHRASE`.
- **Test obnovy (1× mesačne):** stiahni zálohu z GitHub → Actions → Záloha databázy → Artifacts a obnov ju do **novej** vetvy Neonu, nikdy nie do produkcie:
  ```powershell
  gpg --decrypt isport-RRRR-MM-DD.dump.gpg > db.dump
  pg_restore --no-owner --no-privileges -d "<pripojenie k testovacej vetve>" db.dump
  ```
- Cieľ: strata najviac 24 h údajov (RPO), obnova do 2 h (RTO).

## Incident – čo robiť
1. **Podozrenie na únik tajomstva** (heslo k DB, `AUTH_SECRET`, API kľúč):
   - Neon → Roles → **Reset password**; nový reťazec do Vercelu a `.env`.
   - nový `AUTH_SECRET` na Verceli → všetci sa odhlásia; 2FA si personál nastaví znova.
   - Redeploy. Ak bol kľúč v gite, nestačí ho zmazať – vždy ho **zmeň**.
2. **Napadnutý účet personálu:** administrácia → Zákazníci → účet → Odhlásiť zo všetkých zariadení, zrušiť 2FA, zablokovať; skontrolovať Záznam zmien.
3. **Napadnutý web:** Vercel → predchádzajúce nasadenie → Promote; zmeniť všetky tajomstvá; prejsť Bezpečnosť a Záznam zmien v administrácii.
4. **Únik osobných údajov:** zdokumentovať (čo, kedy, koho sa týka) a do **72 hodín** oznámiť Úradu na ochranu osobných údajov SR; pri vysokom riziku informovať aj dotknutých. Postup s právnikom.

## Pravidlá
- `.env` nikdy do gitu ani do chatu. Repozitár na GitHube musí byť **súkromný**.
- 2FA zapnuté na GitHube, Verceli, Neone, Gmaile a pre všetok personál webu (web ho vyžaduje).
- Vývoj používa **vlastnú vetvu databázy**, nie produkčnú.

## v9c – nálezy externého skenera (20. 10. 2026)

| Nález | Riešenie |
|---|---|
| CSP s `unsafe-inline` | v9d: CSP neobsahuje `unsafe-inline` ani `unsafe-eval`. Skripty: nonce + `strict-dynamic`. Štýly: `style-src 'self'`, `style-src-elem 'self' 'nonce-…'`, `style-src-attr 'none'`. Inline `style={…}` sú z kódu odstránené (triedy `u-*` v globals.css, vypočítané hodnoty cez `components/Dyn.tsx`). Statická kontrola hlási každý nový `style={…}`. |
| Citlivé cesty v robots.txt | robots.txt už nevypisuje neverejné cesty. Ochranu zabezpečuje `X-Robots-Tag: noindex` (next.config.ts) a prihlásenie. |
| Verejná administrácia | `/admin*` bez prihlásenia vráti 404 (proxy.ts aj requireStaff). Personál vstupuje cez Môj účet. |
| Chýba security.txt | `/.well-known/security.txt` sa zobrazí vždy. Bez e-mailu v nastaveniach odkazuje na /kontakt. |
| HSTS preload, MTA-STS, DNSSEC | Dajú sa nastaviť až na vlastnej doméne, na vercel.app nie. |
| Odhalené technológie | `X-Powered-By` je vypnutá. Hlavičky `server: Vercel` a `x-vercel-*` pridáva hosting a nedajú sa odstrániť. |

## Dočasné e-maily pri registrácii

Registrácia odmietne dočasné schránky (mailinator, yopmail, 10minutemail, temp-mail…):

1. **Vstavaný zoznam ~100 000 domén** (`lib/disposable/data.ts`) – spojenie 4 komunitných zoznamov, funguje aj bez internetu.
   Kontroluje sa aj každá subdoména (`abc.mailinator.com`). Bežní poskytovatelia (gmail, azet, centrum, seznam…) sú v `lib/disposable/allow.mjs` a nikdy sa neblokujú.
2. **Živý zoznam** – každých 12 hodín sa doplní najnovší verejný zoznam.
3. **Poštový server (MX)** – ak doména posiela poštu na server dočasnej služby, zablokuje sa aj úplne nová doména.
4. **Doména musí prijímať poštu** – vymyslené a preklepnuté adresy neprejdú.

Aktualizácia vstavaného zoznamu (raz za pár mesiacov): `npm run disposable:update`, potom `git add`, `commit`, `push`.
Vlastné domény na zablokovanie: premenná `DISPOSABLE_EXTRA="domena1.sk,domena2.com"` vo Verceli.
