# Preklady webu – rozpracované (vetva preklady-rozpracovane)

Jazyky: slovenčina (zdroj), angličtina, čeština, nemčina, maďarčina.

Hotové:
- jadro prekladov `lib/i18n/*` (jazyk z cookie `isp_lang` / prehliadača, `t()`, `t.n()` pre množné číslo)
- prepínač jazykov v hlavičke, mobilnom menu a päte (`?lang=en` – spracuje proxy.ts)
- všetky texty webu, účtu, rezervácie, e-mailov a administrácie idú cez `t()`
- e-maily v jazyku zákazníka; automatické e-maily (pripomienky, platobná brána, recepcia) slovensky + anglicky
- právne stránky: poznámka „záväzná je slovenská verzia“

Zostáva:
- preložiť zvyšné texty (`keys.json` má ~1 800 kľúčov, hotové sú riadky 0–399 v `*.tsv`;
  stĺpce v 000/001: en cs de hu ru fr es it, od 002: en cs de hu)
- zlúčiť TSV do `lib/i18n/messages/*.json` a spustiť `node scripts/i18n.mjs`
- pridať test `scripts/i18n.mjs --check` do `npm test`
- náhľady v angličtine, kontrola buildu, zlúčenie do main
