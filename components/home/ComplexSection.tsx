import Link from 'next/link';

// Rez budovou komplexu – ilustračná schéma. Popisky sú odkazy na jednotlivé časti.
// Na menších obrazovkách sa popisky skryjú a zobrazí sa zoznam pod obrázkom.
const PARTS = [
  { href: '/ladova-plocha', name: 'Ľadová plocha', note: 'Prenájom celej plochy · rezervácia online', x: 13.6, y: 9.3, main: true },
  { href: '/bufet-skyboxy', name: 'Skyboxy', note: 'nad ľadom, pre rodiny a hostí', x: 63, y: 37.5 },
  { href: '/bufet-skyboxy', name: 'Bufet', note: '', x: 58.7, y: 88.2 },
  { href: '/fitness-wellness', name: 'Posilňovňa', note: 'pripravujeme', x: 77, y: 34.3, soon: true },
  { href: '/fitness-wellness', name: 'Wellness', note: 'pripravujeme', x: 77, y: 88.9, soon: true },
  { href: '/ihrisko', name: 'Ihrisko', note: 'vonku', x: 82.4, y: 62.9, right: true },
];

export function ComplexSection() {
  return (
    <div className="cx">
      <div className="cx__art">
        <svg viewBox="0 0 1440 560" role="img" aria-label="Schéma komplexu: ľadová plocha, nad ňou skyboxy, vedľa bufet, krídlo s posilňovňou a wellness, vonku futbalové ihrisko">
          <defs>
            <linearGradient id="cxIce" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#FFFFFF" />
              <stop offset="1" stopColor="#CFE2F0" />
            </linearGradient>
            <radialGradient id="cxGlow" cx="50%" cy="100%" r="70%">
              <stop offset="0" stopColor="#DDEEFF" stopOpacity=".35" />
              <stop offset="1" stopColor="#DDEEFF" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="cxBeam" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity=".22" />
              <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="cxGlass" x1="0" x2="1">
              <stop offset="0" stopColor="#1B3550" stopOpacity=".9" />
              <stop offset="1" stopColor="#0E1B29" stopOpacity=".9" />
            </linearGradient>
          </defs>
          <rect x="0" y="470" width="1440" height="90" fill="#0A0C0F" />
          <line x1="0" y1="470" x2="1440" y2="470" stroke="#2A3038" strokeWidth="1.5" />
          <path d="M150 470V190L560 120L970 190V470" fill="#0B0E12" stroke="#38414B" strokeWidth="2" />
          <path d="M150 190L560 120L970 190" fill="none" stroke="#56616C" strokeWidth="2" />
          <path d="M170 196L560 136L950 196" fill="none" stroke="#2C343D" strokeWidth="1.5" />
          <path
            d="M230 186L260 190M300 176L330 182M370 165L400 172M440 154L470 162M510 143L540 151M610 143L640 151M680 154L710 162M750 165L780 172M820 176L850 182M890 186L920 190"
            stroke="#2C343D"
            strokeWidth="1.2"
          />
          <g className="cx__beams">
            <path d="M290 186L240 420H380Z" fill="url(#cxBeam)" />
            <path d="M430 162L380 420H500Z" fill="url(#cxBeam)" />
            <path d="M560 140L510 420H630Z" fill="url(#cxBeam)" />
            <path d="M690 162L640 420H760Z" fill="url(#cxBeam)" />
          </g>
          <g fill="#FFFFFF">
            <rect x="282" y="184" width="16" height="5" rx="2" />
            <rect x="422" y="160" width="16" height="5" rx="2" />
            <rect x="552" y="138" width="16" height="5" rx="2" />
            <rect x="682" y="160" width="16" height="5" rx="2" />
          </g>
          <rect x="150" y="300" width="820" height="170" fill="url(#cxGlow)" />
          <rect x="200" y="438" width="560" height="14" rx="3" fill="url(#cxIce)" />
          <rect x="200" y="452" width="560" height="18" fill="#9FB6C8" opacity=".35" />
          <rect x="478" y="438" width="4" height="14" fill="#E3121B" />
          <rect x="390" y="438" width="4" height="14" fill="#2350C8" />
          <rect x="566" y="438" width="4" height="14" fill="#2350C8" />
          <path d="M200 438V418M760 438V418" stroke="#C8D3DC" strokeWidth="3" />
          <path d="M200 418V380M760 418V380" stroke="#C8D3DC" strokeWidth="1" opacity=".45" />
          <path d="M222 438V426H236" fill="none" stroke="#E3121B" strokeWidth="2.5" />
          <path d="M738 438V426H724" fill="none" stroke="#E3121B" strokeWidth="2.5" />
          <g fill="#0A0C0F">
            <circle cx="330" cy="430" r="5" />
            <circle cx="455" cy="428" r="5" />
            <circle cx="520" cy="430" r="5" />
            <circle cx="640" cy="429" r="5" />
          </g>
          <circle cx="492" cy="436" r="2.2" fill="#0A0C0F" />
          <path d="M770 470V300H970V470" fill="#0E1217" stroke="#38414B" strokeWidth="1.5" />
          <rect x="778" y="306" width="184" height="64" fill="url(#cxGlass)" stroke="#5B8DB8" strokeWidth="1.2" />
          <g fill="#F2F5F7" opacity=".9">
            <circle cx="812" cy="352" r="6" />
            <rect x="806" y="358" width="12" height="12" rx="3" />
            <circle cx="846" cy="350" r="6" />
            <rect x="840" y="356" width="12" height="14" rx="3" />
            <circle cx="900" cy="352" r="6" />
            <rect x="894" y="358" width="12" height="12" rx="3" />
          </g>
          <line x1="770" y1="378" x2="970" y2="378" stroke="#38414B" strokeWidth="2" />
          <rect x="786" y="398" width="168" height="56" fill="#12171D" stroke="#2C343D" />
          <rect x="800" y="420" width="140" height="10" rx="2" fill="#E3121B" />
          <g fill="#B9C1C8">
            <rect x="812" y="408" width="10" height="10" rx="2" />
            <rect x="836" y="406" width="12" height="12" rx="2" />
            <rect x="866" y="408" width="10" height="10" rx="2" />
            <rect x="890" y="406" width="12" height="12" rx="2" />
          </g>
          <path d="M970 470V250H1180V470" fill="#090B0E" stroke="#38414B" strokeWidth="1.5" strokeDasharray="6 6" />
          <line x1="970" y1="360" x2="1180" y2="360" stroke="#2C343D" strokeWidth="1.5" strokeDasharray="6 6" />
          <g stroke="#7C858E" strokeWidth="3" strokeLinecap="round">
            <path d="M1020 330H1090" />
            <path d="M1016 318V342M1094 318V342" />
            <path d="M1006 324V336M1104 324V336" />
          </g>
          <g fill="none" stroke="#7C858E" strokeWidth="2">
            <path d="M1030 440C1040 430 1050 450 1060 440S1080 430 1090 440S1110 450 1120 440" />
            <path d="M1030 425C1040 415 1050 435 1060 425S1080 415 1090 425S1110 435 1120 425" />
          </g>
          <path d="M1220 470L1250 452H1410L1440 470Z" fill="#163222" stroke="#2F6B48" strokeWidth="1.2" />
          <path d="M1330 452L1330 470" stroke="#7FC79A" strokeWidth="1.2" />
          <path d="M1258 466V448H1270M1402 466V448H1390" fill="none" stroke="#F2F5F7" strokeWidth="2" />
          <circle cx="1350" cy="462" r="3" fill="#F2F5F7" />
          <g fill="#10161B">
            <circle cx="70" cy="440" r="26" />
            <circle cx="110" cy="450" r="18" />
            <circle cx="1205" cy="446" r="20" />
          </g>
          <g className="cx__leaders" stroke="#F2F5F7" strokeOpacity=".55" strokeWidth="1" fill="none">
            <path d="M480 430V92H436" />
            <path d="M870 306V232H900" />
            <path d="M870 454V492" />
            <path d="M1075 300V214H1100" />
            <path d="M1075 410V520H1100" />
            <path d="M1330 452V380H1300" />
          </g>
          <g className="cx__leaders" fill="#F2F5F7">
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
          >
            <strong>{p.name}</strong>
            {p.note ? <span className={p.soon ? 'cx__soon' : undefined}>{p.note}</span> : null}
          </Link>
        ))}
        <span className="cx__note">Schéma je ilustračná</span>
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
