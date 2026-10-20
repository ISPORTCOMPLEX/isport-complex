# Prístupnosť – WCAG 2.2 AA

Zákon č. 351/2022 Z. z. (Európsky akt o prístupnosti) platí od 28. 6. 2025 pre služby uzatvárané online so spotrebiteľom,
napríklad online rezerváciu. Výnimku má mikropodnik (menej ako 10 zamestnancov a obrat alebo súvaha do 2 mil. €),
ale aj vtedy sa oplatí štandard dodržať. Dozor vykonáva SOI, pokuta môže byť až 30 000 €.

Verejné vyhlásenie je na stránke `/vyhlasenie-o-pristupnosti` (`app/vyhlasenie-o-pristupnosti/page.tsx`).
**Pri každej väčšej zmene webu ho aktualizuj.** Treba zmeniť časti 3 a 4 a dátum.

## Čo je urobené (v9)

| Kritérium | Riešenie |
|---|---|
| 1.1.1 Alternatívny text | Fotky z Cloudinary majú vždy `alt`. Ak ho personál nevyplní, doplní sa všeobecný popis podľa sekcie (`slotAlt`). Dekoratívne SVG majú `aria-hidden`. |
| 1.3.1 Štruktúra | Jeden `h1` na stránku (RzBand alebo hero), `nav` s `aria-label`, omrvinky s `aria-current`, tabuľka platieb s `caption` a `scope` (ostatné tabuľky v administrácii doplniť). |
| 1.4.1 Farba | Obsadené hodiny majú text „obsadené“, chyby majú text, odkazy v texte sú podčiarknuté. |
| 1.4.3 a 1.4.11 Kontrast | Blok „Prístupnosť – WCAG 2.2 AA (v9)“ na konci `app/globals.css`: text ≥ 4,5 : 1, rámčeky polí, prepínačov a rádiových tlačidiel ≥ 3 : 1. |
| 2.1.1 Klávesnica | Všetko je dostupné klávesnicou. Interaktívne zóny v ilustrácii sú len pre myš a dotyk, klávesnica používa odkazy s názvami. |
| 2.1.2 a 2.4.3 | Mobilné menu sa zatvára klávesom Escape a fokus sa vracia na tlačidlo. |
| 2.3.3 Pohyb | `prefers-reduced-motion` vypne všetky animácie. |
| 2.4.1 Preskočenie | Odkaz „Preskočiť na obsah“ (`#obsah`). |
| 2.4.7 a 2.4.11 Fokus | Viditeľný obrys aj na poliach. `scroll-padding` zabezpečí, že fokus neskryje lepiaca hlavička ani spodná lišta rezervácie. |
| 3.3.1 a 3.3.3 Chyby | Pole má `aria-invalid` a `aria-describedby` odkazujúce na chybu, súhrn je v `role="alert"`. |
| 3.3.8 Prihlásenie | Žiadne hádanky. Heslo aj kód 2FA sa dajú vložiť (`autocomplete` je nastavené). |
| 4.1.2 Názov a rola | Prepínač spŕch má `role="switch"`, ikonové tlačidlá majú `aria-label`, odkazy do nového okna to oznamujú čítačke. |
| 4.1.3 Stavové správy | Úspech je v `role="status"`, celková cena v rezervácii je v `aria-live="polite"`. |
| Vysoký kontrast | `@media (forced-colors: active)` zachová rámčeky tlačidiel. |

## Ručný test pred spustením

Tento test sa ešte nerobil. Kontrola kódu a výpočet kontrastu ho nenahradia.

1. **Len klávesnica** (Tab, Shift+Tab, Enter, medzerník, Escape): úvod → rezervácia → údaje → potvrdenie → Môj účet → zrušenie rezervácie.
   Fokus musí byť stále viditeľný a nikde nesmie zostať zaseknutý.
2. **NVDA + Firefox** (Windows, zadarmo) a **VoiceOver + Safari** (iPhone): rovnaký postup. Čítačka musí prečítať
   názov každého poľa, chybu aj celkovú cenu.
3. **Zväčšenie 200 %** a **šírka 320 px** (DevTools): nič sa nesmie prekrývať ani posúvať do strany (okrem ilustrácie komplexu).
4. **Lighthouse → Accessibility** a **axe DevTools** (rozšírenie Chrome) na každej verejnej stránke. Cieľ: 0 chýb.
5. Windows → **Kontrastné motívy**: tlačidlá a polia musia byť viditeľné.

Výsledky zapíš do časti 5 vyhlásenia a zmeň stav na „plne v súlade“ až vtedy, keď prejdú všetky body.

## Pravidlá pre nový kód

- Farby textu nikdy nevyberaj od oka. Over ich kontrast (napr. webaim.org/resources/contrastchecker).
- Každý `<input>` musí mať `<label>`. Použi `Field` alebo `Check` z `components/forms`.
- Klikateľný prvok je vždy `<button>` alebo `<a>`, nikdy `<div onClick>`.
- Fotky vkladaj cez `CloudImage` (alt sa doplní sám). Ikony a dekorácie označ `aria-hidden="true"`.
- Animáciu spúšťaj len na hover alebo focus a rešpektuj `prefers-reduced-motion`.
