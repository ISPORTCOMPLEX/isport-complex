# Platba kartou online – stav a odovzdanie

**Stav:** platobná brána je naprogramovaná a otestovaná, ale **vypnutá** (`PAYMENTS_PROVIDER=off`).
Zákazník pri rezervácii vidí „Kartou online – pripravujeme“. Rezervácie fungujú s platbou na recepcii a prevodom.

Pre programátora, ktorý projekt preberá: na spustenie netreba písať kód. Stačí účet v Stripe,
tri premenné prostredia a webhook (kroky nižšie). Zvyšok je kontrola a právne texty.

---

## 1. Ako to funguje

```
zákazník vyberie „Kartou online“
  → createBookingAction (lib/actions/booking.ts)
      rezervácia sa vytvorí so stavom PENDING, termín sa podrží (payDeadline ≈ 41 min)
  → startCheckout (lib/payments/service.ts)
      vytvorí Stripe Checkout Session, záznam Payment(state=CREATED), presmeruje na checkout.stripe.com
  → zákazník zaplatí (karta / Apple Pay / Google Pay)
  → Stripe pošle webhook na /api/platby/webhook   (overí sa podpis)
      → markPaid: Payment=SUCCEEDED, Booking=PAID, potvrdzujúci e-mail s QR kódom
  → zákazník sa vráti na /rezervacia/<kód>?platba=ok
      → reconcileBooking sa opýta Stripe priamo (ak webhook ešte neprišiel)

nezaplatí / zavrie stránku
  → relácia vyprší (31 min) → webhook checkout.session.expired → markUnsuccessful
      rezervácia sa zruší, čas sa uvoľní, zákazník dostane e-mail
  → poistka: sweepExpiredHolds (pri otvorení rezervácie, pri novej rezervácii a v dennom crone)

zrušenie zaplatenej rezervácie
  → zákazník v lehote zadarmo: automaticky celá suma späť (refundBooking)
  → recepcia: Admin → Rezervácia → „Zrušiť rezerváciu“ (zaškrtnuté Vrátiť na kartu)
             alebo „Platby kartou → Vrátiť peniaze“ (aj čiastočne)
  → vrátenie urobené priamo v Stripe sa zladí cez webhook charge.refunded
```

Všetky kroky sú idempotentné: opakovaný webhook, dvojklik ani súbežné volania nič nezdvoja
(tabuľka `PaymentEvent`, podmienené `updateMany`, Idempotency-Key pri volaniach Stripe).

Ak platba príde k rezervácii, ktorá už medzitým bola zrušená, peniaze sa automaticky vrátia (`payment.auto-refund`).

## 2. Súbory

| Súbor | Čo robí |
|---|---|
| `lib/payments/types.ts` | Spoločné rozhranie `PaymentProvider` – každá brána ho implementuje |
| `lib/payments/config.ts` | Výber brány z premenných prostredia + bezpečnostné poistky |
| `lib/payments/stripe.ts` | Stripe cez REST (bez npm balíka), overenie podpisu webhooku |
| `lib/payments/mock.ts` | Testovacia brána bez peňazí (`/platba/test/…`) |
| `lib/payments/service.ts` | Celý životný cyklus: checkout, zaplatené, vypršané, vrátenie, zladenie |
| `lib/payments/math.ts` | Čisté výpočty (stav vrátenia, parsovanie sumy) |
| `app/api/platby/webhook/route.ts` | Príjem webhookov |
| `app/platba/test/[ref]/page.tsx` + `lib/actions/mockPayment.ts` | Testovacia platobná stránka |
| `app/admin/nastavenia` → záložka **Platobná brána** | Stav brány a súhrn za 30 dní |
| `app/admin/rezervacie/[id]` | Tabuľka platieb, vrátenie peňazí |
| `prisma/schema.prisma` | Modely `Payment`, `Refund`, `PaymentEvent`; stavy `PENDING`, `PARTIALLY_REFUNDED`, `REFUNDED` |
| `tests/payments.test.ts` | Testy podpisu, mapovania udalostí, výberu brány a súm |

## 3. Bezpečnostné poistky (už zapnuté)

- Bez platných kľúčov sa brána **nezapne** – web ďalej funguje bez platby kartou.
- Ostrý kľúč `sk_live_…` sa **mimo produkcie ignoruje** (Preview nemôže účtovať skutočné peniaze).
- Testovacia brána `mock` sa **na produkcii nikdy nezapne**.
- Webhook bez platného podpisu alebo starší ako 5 minút sa odmietne (ochrana proti podvrhnutiu a replay).
- Číslo karty nikdy nejde cez náš server – platí sa na stránke Stripe (PCI DSS: SAQ A).
- Cena sa berie z databázy, nie z formulára. Nesúlad zaplatenej sumy sa zapíše do záznamu zmien.
- Kľúče sú len v premenných prostredia na Verceli, nikdy v kóde ani v databáze. Administrácia ich nezobrazuje.
- CSP: `form-action` povoľuje navyše len `https://checkout.stripe.com`.

## 4. Vyskúšanie bez Stripe (testovacia brána)

Na localhoste v súbore `.env`:

```
PAYMENTS_PROVIDER="mock"
```

`npm run dev` → rezervácia → „Kartou online (testovací režim)“ → testovacia stránka s tlačidlami
**Zaplatiť (test)** / **Platba zlyhá** / **Späť bez platby**. Funguje to aj na Vercel Preview.

## 5. Spustenie so Stripe – krok za krokom

### 5.1 Testovací režim (najprv vždy tento)

1. Účet na **dashboard.stripe.com** (firma I - SPORT COMPLEX s.r.o., IČO, IBAN). Zapnúť 2FA.
2. Prepnúť na **Test mode**. **Developers → API keys** → skopírovať **Secret key** (`sk_test_…`).
   Lepšie: **Create restricted key** s právami *Checkout Sessions: Write*, *Refunds: Write*, *PaymentIntents: Read* (`rk_test_…`).
3. **Developers → Webhooks → Add endpoint**
   - URL: `https://<doména>/api/platby/webhook`
   - udalosti: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
     `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`
   - skopírovať **Signing secret** (`whsec_…`)
4. **Vercel → Settings → Environment Variables** (prostredie **Preview**, nie Production):
   - `PAYMENTS_PROVIDER` = `stripe`
   - `STRIPE_SECRET_KEY` = `sk_test_…` (Sensitive)
   - `STRIPE_WEBHOOK_SECRET` = `whsec_…` (Sensitive)
5. Redeploy Preview. Admin → Nastavenia → Platobná brána má ukázať **Zapnutá · Testovací režim**.
6. Testovacie karty: `4242 4242 4242 4242` (úspech), `4000 0000 0000 0002` (zamietnutá),
   `4000 0025 0000 3155` (3-D Secure). Ľubovoľný budúci dátum a CVC.

### 5.2 Kontrolný zoznam pred ostrou prevádzkou

- [ ] Úspešná platba → rezervácia „Zaplatená“, prišiel e-mail s QR kódom
- [ ] Zavretie platobnej stránky → po 30–40 min sa termín uvoľní a príde e-mail
- [ ] Zamietnutá karta → dá sa skúsiť znova („Zaplatiť … kartou“ na detaile rezervácie)
- [ ] Zrušenie zákazníkom v lehote → peniaze späť automaticky
- [ ] Čiastočné vrátenie z administrácie → stav „Čiastočne vrátená“
- [ ] Vrátenie priamo v Stripe → stav v administrácii sa zladí
- [ ] Stripe → Webhooks → endpoint nemá chyby (všetky 2xx)
- [ ] Obchodné podmienky (bod 3 sa doplní sám, keď je brána zapnutá) a ochrana osobných údajov – skontrolovať právnikom
- [ ] Stripe → Settings → Payment methods: zapnuté Cards, Apple Pay, Google Pay
- [ ] Stripe → Settings → Branding: logo a farby (`public/brand/`)
- [ ] Stripe → Settings → Emails: vypnúť alebo zapnúť potvrdenky od Stripe (web posiela vlastné)

### 5.3 Ostrá prevádzka

1. V Stripe dokončiť **Activate account** (overenie firmy).
2. Prepnúť na **Live mode**, vytvoriť nový kľúč (`sk_live_…` / `rk_live_…`) a **nový webhook** (live má vlastný `whsec_…`).
3. Vercel → **Production**: `PAYMENTS_PROVIDER=stripe`, `STRIPE_SECRET_KEY=sk_live_…`, `STRIPE_WEBHOOK_SECRET=whsec_…`
4. Redeploy Production. Jedna skutočná platba malou sumou a jej vrátenie.

## 6. Pridanie inej brány (GoPay, Comgate, …)

1. Nový súbor `lib/payments/<brána>.ts`, ktorý vráti objekt typu `PaymentProvider` (pozri `stripe.ts` ako vzor).
2. Doplniť `ProviderId` v `types.ts`, `resolveProvider` a `providerDiagnosis` v `config.ts`, `getProvider` v `index.ts`.
3. Webhook: brány s notifikáciou cez GET (GoPay) potrebujú vlastnú routu – výsledok overiť dotazom
   na stav platby (`getSession`), nie dôverovať parametrom v URL.
4. Doplniť doménu brány do `form-action` v `lib/securityHeaders.ts`.
5. Testy do `tests/payments.test.ts`.

## 7. Čo ešte nie je (vedome)

- Faktúra/daňový doklad PDF – dnes potvrdenie e-mailom. Pri ostrej prevádzke rozhodne účtovník
  (Stripe Invoicing alebo vlastný generátor). Hala je platiteľ DPH? → doplniť do e-mailu.
- Platba kartou pri **presune** rezervácie – zámerne vypnutá (presun ide cez recepciu alebo prevod).
- eKasa: či a ako sa platby kartou online evidujú v eKase, treba overiť s účtovníkom pred spustením.
