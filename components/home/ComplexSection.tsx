'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

// Rez budovou komplexu, ktorý ožije: po prejdení myšou (alebo ťuknutí) sa v danej časti spustí animácia –
// hokej na ľade, fanúšikovia v skyboxoch, jedenie v bufete, činky v posilňovni, para vo wellness a futbal vonku.
// Popisky sú odkazy na jednotlivé časti; na menších obrazovkách sa skryjú a zobrazí sa zoznam pod obrázkom.
type Zone = 'ice' | 'sky' | 'food' | 'gym' | 'well' | 'pitch';

const PARTS: { href: string; name: string; note: string; x: number; y: number; zone: Zone; main?: boolean; soon?: boolean; right?: boolean }[] = [
  { href: '/ladova-plocha', name: 'Ľadová plocha', note: 'Prenájom celej plochy · rezervácia online', x: 13.6, y: 9.3, main: true, zone: 'ice' },
  { href: '/bufet-skyboxy', name: 'Skyboxy', note: 'nad ľadom, pre rodiny a hostí', x: 63, y: 37.5, zone: 'sky' },
  { href: '/bufet-skyboxy', name: 'Bufet', note: '', x: 58.7, y: 88.2, zone: 'food' },
  { href: '/fitness-wellness', name: 'Posilňovňa', note: 'pripravujeme', x: 77, y: 34.3, soon: true, zone: 'gym' },
  { href: '/fitness-wellness', name: 'Wellness', note: 'pripravujeme', x: 77, y: 88.9, soon: true, zone: 'well' },
  { href: '/ihrisko', name: 'Ihrisko', note: 'vonku', x: 82.4, y: 62.9, right: true, zone: 'pitch' },
];

const ZONES: { zone: Zone; label: string; x: number; y: number; w: number; h: number }[] = [
  { zone: 'ice', label: 'Ľadová plocha – hokej', x: 150, y: 190, w: 620, h: 280 },
  { zone: 'sky', label: 'Skyboxy – fanúšikovia', x: 770, y: 300, w: 200, h: 78 },
  { zone: 'food', label: 'Bufet – jedlo', x: 770, y: 378, w: 200, h: 92 },
  { zone: 'gym', label: 'Posilňovňa – činky', x: 970, y: 250, w: 210, h: 110 },
  { zone: 'well', label: 'Wellness – para', x: 970, y: 360, w: 210, h: 110 },
  { zone: 'pitch', label: 'Ihrisko – futbal', x: 1190, y: 400, w: 250, h: 75 },
];

export function ComplexSection() {
  const [active, setActive] = useState<Zone | null>(null);
  const touch = useRef(false);
  const on = (z: Zone) => () => {
    if (!touch.current) setActive(z);
  };
  const off = () => {
    if (!touch.current) setActive(null);
  };
  // Dotyk: prvé ťuknutie spustí animáciu, ďalšie na tú istú časť ju zastaví.
  const tap = (z: Zone) => (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') {
      touch.current = false;
      return;
    }
    touch.current = true;
    setActive((cur) => (cur === z ? null : z));
  };
  // Popisok na dotykovej obrazovke: prvé ťuknutie = animácia, druhé = otvorí stránku.
  const labelClick = (z: Zone) => (e: React.MouseEvent) => {
    if (touch.current && active !== z) {
      e.preventDefault();
      setActive(z);
    }
  };

  return (
    <div className="cx">
      <div className={`cx__art${active ? ` is-${active}` : ''}`}>
        <svg viewBox="0 0 1440 560" role="img" aria-label="Schéma komplexu: ľadová plocha, nad ňou skyboxy, vedľa bufet, krídlo s posilňovňou a wellness, vonku futbalové ihrisko">

          <defs>
          <linearGradient id="cxIce" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#CFE2F0" /></linearGradient>
          <radialGradient id="cxGlow" cx="50%" cy="100%" r="70%"><stop offset="0" stopColor="#DDEEFF" stopOpacity=".35" /><stop offset="1" stopColor="#DDEEFF" stopOpacity="0" /></radialGradient>
          <linearGradient id="cxBeam" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#FFFFFF" stopOpacity=".22" /><stop offset="1" stopColor="#FFFFFF" stopOpacity="0" /></linearGradient>
          <linearGradient id="cxGlass" x1="0" x2="1"><stop offset="0" stopColor="#1B3550" stopOpacity=".9" /><stop offset="1" stopColor="#0E1B29" stopOpacity=".9" /></linearGradient>
          </defs>

          {/* budova (rovnaká ako na webe) */}
          <rect x="0" y="470" width="1440" height="90" fill="#0A0C0F" />
          <line x1="0" y1="470" x2="1440" y2="470" stroke="#2A3038" strokeWidth="1.5" />
          <path d="M150 470V190L560 120L970 190V470" fill="#0B0E12" stroke="#38414B" strokeWidth="2" />
          <path d="M150 190L560 120L970 190" fill="none" stroke="#56616C" strokeWidth="2" />
          <path d="M170 196L560 136L950 196" fill="none" stroke="#2C343D" strokeWidth="1.5" />
          <path d="M230 186L260 190M300 176L330 182M370 165L400 172M440 154L470 162M510 143L540 151M610 143L640 151M680 154L710 162M750 165L780 172M820 176L850 182M890 186L920 190" stroke="#2C343D" strokeWidth="1.2" />
          <g className="cx__beams">
          <path d="M290 186L240 420H380Z" fill="url(#cxBeam)" />
          <path d="M430 162L380 420H500Z" fill="url(#cxBeam)" />
          <path d="M560 140L510 420H630Z" fill="url(#cxBeam)" />
          <path d="M690 162L640 420H760Z" fill="url(#cxBeam)" />
          </g>
          <g fill="#FFFFFF"><rect x="282" y="184" width="16" height="5" rx="2" /><rect x="422" y="160" width="16" height="5" rx="2" /><rect x="552" y="138" width="16" height="5" rx="2" /><rect x="682" y="160" width="16" height="5" rx="2" /></g>
          <rect x="150" y="300" width="820" height="170" fill="url(#cxGlow)" />
          <rect x="200" y="438" width="560" height="14" rx="3" fill="url(#cxIce)" />
          <rect x="200" y="452" width="560" height="18" fill="#9FB6C8" opacity=".35" />
          <rect x="478" y="438" width="4" height="14" fill="#E3121B" />
          <rect x="390" y="438" width="4" height="14" fill="#2350C8" />
          <rect x="566" y="438" width="4" height="14" fill="#2350C8" />
          <path d="M200 438V418M760 438V418" stroke="#C8D3DC" strokeWidth="3" />
          <path d="M200 418V380M760 418V380" stroke="#C8D3DC" strokeWidth="1" opacity=".45" />
          {/* bránky */}
          <path d="M222 438V420H238V438" fill="none" stroke="#E3121B" strokeWidth="2.5" />
          <path d="M722 438V420H738V438" fill="none" stroke="#E3121B" strokeWidth="2.5" />
          <path d="M724 422L736 436M736 422L724 436" stroke="#E3121B" strokeWidth=".8" opacity=".6" />
          <rect className="a-lamp" x="726" y="410" width="8" height="6" rx="2" fill="#3A1013" />

          {/* pokojný stav ľadu: bodky */}
          <g className="a-dots" fill="#0A0C0F"><circle cx="330" cy="430" r="5" /><circle cx="455" cy="428" r="5" /><circle cx="520" cy="430" r="5" /><circle cx="640" cy="429" r="5" /></g>

          {/* hokejisti */}
          <g className="a-fx a-fx-ice">
          <g className="a-pl1"><g transform="translate(300 438)"><g className="a-bob">
          <circle cx="3" cy="-29" r="5" fill="#F2F5F7" />
          <path d="M-3 -24H8L10 -11H-5Z" fill="#E3121B" />
          <path d="M-3 -11L-8 -2L-12 0M7 -11L10 -4L14 0" fill="none" stroke="#0A0C0F" strokeWidth="3" strokeLinecap="round" />
          <path d="M-16 0H-8M10 0H18" stroke="#B9C1C8" strokeWidth="2" />
          <g className="a-stk"><path d="M7 -20L19 -2H27" fill="none" stroke="#D9B48A" strokeWidth="2.2" strokeLinecap="round" /></g>
          </g></g></g>
          <g className="a-pl2"><g transform="translate(560 438) scale(-1 1)"><g className="a-bob">
          <circle cx="3" cy="-29" r="5" fill="#F2F5F7" />
          <path d="M-3 -24H8L10 -11H-5Z" fill="#2350C8" />
          <path d="M-3 -11L-8 -2L-12 0M7 -11L10 -4L14 0" fill="none" stroke="#0A0C0F" strokeWidth="3" strokeLinecap="round" />
          <path d="M-16 0H-8M10 0H18" stroke="#B9C1C8" strokeWidth="2" />
          <g className="a-stk"><path d="M7 -20L19 -2H27" fill="none" stroke="#D9B48A" strokeWidth="2.2" strokeLinecap="round" /></g>
          </g></g></g>
          <g className="a-pl3"><g transform="translate(420 438)"><g className="a-bob">
          <circle cx="3" cy="-29" r="5" fill="#F2F5F7" />
          <path d="M-3 -24H8L10 -11H-5Z" fill="#E3121B" />
          <path d="M-3 -11L-8 -2L-12 0M7 -11L10 -4L14 0" fill="none" stroke="#0A0C0F" strokeWidth="3" strokeLinecap="round" />
          <path d="M-16 0H-8M10 0H18" stroke="#B9C1C8" strokeWidth="2" />
          <g className="a-stk"><path d="M7 -20L19 -2H27" fill="none" stroke="#D9B48A" strokeWidth="2.2" strokeLinecap="round" /></g>
          </g></g></g>
          {/* brankár */}
          <g className="a-pl4"><g transform="translate(716 438) scale(-1 1)">
          <circle cx="2" cy="-27" r="5.5" fill="#F2F5F7" />
          <path d="M-6 -22H10L11 -8H-7Z" fill="#2350C8" />
          <rect x="-9" y="-9" width="7" height="9" fill="#F2F5F7" /><rect x="5" y="-9" width="7" height="9" fill="#F2F5F7" />
          <path d="M10 -16H16V-6H10Z" fill="#F2F5F7" />
          <path d="M-6 -12L-2 0H8" fill="none" stroke="#D9B48A" strokeWidth="2.4" />
          </g></g>
          {/* puk */}
          <g className="a-puck"><ellipse cx="318" cy="443" rx="4.5" ry="2" fill="#0A0C0F" /></g>
          {/* GÓL */}
          <g className="a-gol"><text x="690" y="396" textAnchor="middle" className="a-goltext" fill="#E3121B">GÓÓÓL!</text></g>
          </g>

          {/* skyboxy */}
          <path d="M770 470V300H970V470" fill="#0E1217" stroke="#38414B" strokeWidth="1.5" />
          <rect x="778" y="306" width="184" height="64" fill="url(#cxGlass)" stroke="#5B8DB8" strokeWidth="1.2" />
          <g fill="#F2F5F7">
          <g className="a-fan"><circle cx="812" cy="352" r="6" /><rect x="806" y="358" width="12" height="12" rx="3" /><path className="a-arm-up" d="M807 360L801 346M817 360L823 346" stroke="#F2F5F7" strokeWidth="2.4" strokeLinecap="round" /></g>
          <g className="a-fan"><circle cx="846" cy="350" r="6" /><rect x="840" y="356" width="12" height="14" rx="3" /><path className="a-arm-up" d="M841 358L835 344M851 358L857 344" stroke="#F2F5F7" strokeWidth="2.4" strokeLinecap="round" /></g>
          <g className="a-fan"><circle cx="900" cy="352" r="6" /><rect x="894" y="358" width="12" height="12" rx="3" /><path className="a-arm-up" d="M895 360L889 346M905 360L911 346" stroke="#F2F5F7" strokeWidth="2.4" strokeLinecap="round" /><path className="a-arm-up" d="M911 346L919 338L913 334" fill="#E3121B" stroke="#E3121B" strokeWidth="1.5" /></g>
          </g>
          <g className="a-fx a-fx-sky"><text x="940" y="330" textAnchor="end" className="a-say" fill="#FFB020">HÓÓÓ!</text></g>
          <line x1="770" y1="378" x2="970" y2="378" stroke="#38414B" strokeWidth="2" />

          {/* bufet */}
          <rect x="786" y="398" width="168" height="56" fill="#12171D" stroke="#2C343D" />
          <rect x="880" y="420" width="62" height="10" rx="2" fill="#E3121B" />
          <g fill="#B9C1C8"><rect x="890" y="408" width="10" height="10" rx="2" /><rect x="914" y="406" width="12" height="12" rx="2" /></g>
          {/* zákazník, ktorý je */}
          <g transform="translate(838 452)">
          <rect x="-24" y="-12" width="44" height="4" rx="2" fill="#2C343D" />
          <path d="M-18 -8V0M14 -8V0" stroke="#2C343D" strokeWidth="2" />
          <g className="a-chew"><circle cx="-2" cy="-40" r="7" fill="#F2F5F7" /><circle cx="1" cy="-41" r="1.1" fill="#0A0C0F" /></g>
          <rect x="-8" y="-33" width="11" height="22" rx="4" fill="#E3121B" />
          <ellipse className="a-belly" cx="2" cy="-21" rx="5" ry="7" fill="#E3121B" />
          <path d="M-6 -11L-6 0M0 -11L2 0" stroke="#0A0C0F" strokeWidth="3" strokeLinecap="round" />
          <g className="a-eatarm">
          <path d="M-2 -29L10 -22" stroke="#F2F5F7" strokeWidth="3" strokeLinecap="round" />
          <g className="a-burger"><rect x="8" y="-27" width="10" height="3" rx="1.5" fill="#E0A458" /><rect x="8" y="-24" width="10" height="2" fill="#6B3E26" /><rect x="8" y="-22" width="10" height="2.4" rx="1.2" fill="#E0A458" /></g>
          </g>
          <g className="a-fx a-fx-food">
          <text className="a-mnam a-say a-say--sm" x="-8" y="-66" fill="#FFB020">mňam</text>
          <text className="a-mnam2 a-say a-say--sm" x="12" y="-58" fill="#F2F5F7">plné brucho!</text>
          </g>
          </g>

          {/* krídlo: posilňovňa + wellness */}
          <path d="M970 470V250H1180V470" fill="#090B0E" stroke="#38414B" strokeWidth="1.5" strokeDasharray="6 6" />
          <line x1="970" y1="360" x2="1180" y2="360" stroke="#2C343D" strokeWidth="1.5" strokeDasharray="6 6" />
          <g className="a-gym-static" stroke="#7C858E" strokeWidth="3" strokeLinecap="round"><path d="M1020 330H1090" /><path d="M1016 318V342M1094 318V342" /><path d="M1006 324V336M1104 324V336" /></g>
          <g className="a-fx a-fx-gym">
          {/* vzpierač */}
          <g className="a-lifter" transform="translate(0 0)">
          <g className="a-bar">
          <path d="M1036 300V332M1062 300V332" stroke="#F2F5F7" strokeWidth="3" strokeLinecap="round" />
          <path d="M1018 300H1080" stroke="#B9C1C8" strokeWidth="3" strokeLinecap="round" />
          <rect x="1012" y="292" width="6" height="16" rx="2" fill="#E3121B" /><rect x="1080" y="292" width="6" height="16" rx="2" fill="#E3121B" />
          </g>
          <circle cx="1049" cy="312" r="6.5" fill="#F2F5F7" />
          <rect x="1040" y="319" width="18" height="20" rx="5" fill="#2350C8" />
          <circle className="a-sweat" cx="1058" cy="308" r="1.6" fill="#8EC5FF" />
          </g>
          <path d="M1043 339L1040 358M1055 339L1058 358" stroke="#B9C1C8" strokeWidth="4" strokeLinecap="round" />
          
          {/* druhý cvičí s jednoručkou */}
          <g className="a-lifter2">
          <circle cx="1132" cy="322" r="5.5" fill="#F2F5F7" />
          <rect x="1125" y="328" width="14" height="17" rx="4" fill="#E3121B" />
          <path d="M1128 345L1127 358M1136 345L1137 358" stroke="#B9C1C8" strokeWidth="3" strokeLinecap="round" />
          <g className="a-db"><path d="M1138 332L1146 344" stroke="#F2F5F7" strokeWidth="2.6" strokeLinecap="round" /><rect x="1142" y="342" width="9" height="4" rx="1.5" fill="#B9C1C8" /></g>
          </g>
          </g>
          {/* wellness */}
          <g fill="none" stroke="#7C858E" strokeWidth="2">
          <path className="a-wave" d="M1030 440C1040 430 1050 450 1060 440S1080 430 1090 440S1110 450 1120 440" />
          <path className="a-wave" d="M1030 425C1040 415 1050 435 1060 425S1080 415 1090 425S1110 435 1120 425" />
          </g>
          <g className="a-fx a-fx-well" fill="none" stroke="#B9C1C8" strokeWidth="2" strokeLinecap="round">
          <path className="a-steam" d="M1050 410C1046 402 1054 396 1050 388" />
          <path className="a-steam" d="M1075 410C1071 402 1079 396 1075 388" />
          <path className="a-steam" d="M1100 410C1096 402 1104 396 1100 388" />
          <g stroke="none"><circle cx="1076" cy="432" r="6" fill="#F2F5F7" /><path d="M1068 446C1068 440 1084 440 1084 446Z" fill="#F2F5F7" /></g>
          </g>

          {/* ihrisko */}
          <path d="M1220 470L1250 452H1410L1440 470Z" fill="#163222" stroke="#2F6B48" strokeWidth="1.2" />
          <path d="M1330 452L1330 470" stroke="#7FC79A" strokeWidth="1.2" />
          <path d="M1258 466V448H1270M1402 466V448H1390" fill="none" stroke="#F2F5F7" strokeWidth="2" />
          <circle className="a-ball-static" cx="1350" cy="462" r="3" fill="#F2F5F7" />
          <g className="a-fx a-fx-pitch">
          <g className="a-fb1"><g transform="translate(1282 462)">
          <circle cx="1" cy="-27" r="5" fill="#F2F5F7" />
          <rect x="-4" y="-22" width="10" height="13" rx="3" fill="#E3121B" />
          <path d="M-1 -9L-3 0" stroke="#F2F5F7" strokeWidth="2.6" strokeLinecap="round" />
          <g className="a-kick1"><path d="M3 -9L9 -1" stroke="#F2F5F7" strokeWidth="2.6" strokeLinecap="round" /></g>
          </g></g>
          <g className="a-fb2"><g transform="translate(1392 462) scale(-1 1)">
          <circle cx="1" cy="-27" r="5" fill="#F2F5F7" />
          <rect x="-4" y="-22" width="10" height="13" rx="3" fill="#2350C8" />
          <path d="M-1 -9L-3 0" stroke="#F2F5F7" strokeWidth="2.6" strokeLinecap="round" />
          <g className="a-kick2"><path d="M3 -9L9 -1" stroke="#F2F5F7" strokeWidth="2.6" strokeLinecap="round" /></g>
          </g></g>
          <g className="a-ballx"><g className="a-bally"><circle cx="1292" cy="460" r="3.4" fill="#F2F5F7" stroke="#0A0C0F" strokeWidth=".8" /></g></g>
          </g>

          <g fill="#10161B"><circle cx="70" cy="440" r="26" /><circle cx="110" cy="450" r="18" /><circle cx="1205" cy="446" r="20" /></g>


          {ZONES.map((z) => (
            <rect
              key={z.zone}
              className="a-hit"
              x={z.x}
              y={z.y}
              width={z.w}
              height={z.h}
              tabIndex={0}
              role="button"
              aria-label={z.label}
              aria-pressed={active === z.zone}
              onMouseEnter={on(z.zone)}
              onMouseLeave={off}
              onFocus={() => setActive(z.zone)}
              onBlur={() => setActive(null)}
              onPointerDown={tap(z.zone)}
            />
          ))}
          <g className="cx__leaders" stroke="#F2F5F7" strokeOpacity=".55" strokeWidth="1" fill="none" pointerEvents="none">
            <path d="M480 430V92H436" />
            <path d="M870 306V232H900" />
            <path d="M870 454V492" />
            <path d="M1075 300V214H1100" />
            <path d="M1075 410V520H1100" />
            <path d="M1330 452V380H1300" />
          </g>
          <g className="cx__leaders" fill="#F2F5F7" pointerEvents="none">
            <circle cx="480" cy="430" r="3.5" />
            <circle cx="870" cy="306" r="3.5" />
            <circle cx="870" cy="454" r="3.5" />
            <circle cx="1075" cy="300" r="3.5" />
            <circle cx="1075" cy="410" r="3.5" />
            <circle cx="1330" cy="452" r="3.5" />
          </g>
        </svg>
        {PARTS.map((p) => (
          <Link
            key={p.name}
            href={p.href}
            className={`cx__label${p.main ? ' cx__label--main' : ''}${p.right ? ' cx__label--right' : ''}`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            onMouseEnter={on(p.zone)}
            onMouseLeave={off}
            onFocus={() => setActive(p.zone)}
            onBlur={() => setActive(null)}
            onPointerDown={(e) => {
              touch.current = e.pointerType !== 'mouse';
            }}
            onClick={labelClick(p.zone)}
          >
            <strong>{p.name}</strong>
            {p.note ? <span className={p.soon ? 'cx__soon' : undefined}>{p.note}</span> : null}
          </Link>
        ))}
        <span className="cx__note">
          <i aria-hidden="true" />
          <span className="cx__note-mouse">Prejdi myšou po budove – každá časť ožije</span>
          <span className="cx__note-touch">Ťukni na časť budovy – ožije</span>
        </span>
      </div>
      <ul className="cx__list">
        {PARTS.map((p) => (
          <li key={p.name}>
            <Link href={p.href}>
              <strong>{p.name}</strong>
              {p.note ? <span className={p.soon ? 'cx__soon' : undefined}>{p.note}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
