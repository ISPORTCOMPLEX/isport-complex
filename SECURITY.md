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
