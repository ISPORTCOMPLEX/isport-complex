// Malé ilustrácie v štýle areálu pre prázdne stavy a chybové stránky (čisté SVG, bez inline štýlov).

export function ZamboniArt() {
  return (
    <svg className="es__art" width="190" height="120" viewBox="0 0 190 120" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="es-ice" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F6FBFF" />
          <stop offset="1" stopColor="#B9D3E8" />
        </linearGradient>
      </defs>
      <rect x="0" y="96" width="190" height="10" rx="3" fill="url(#es-ice)" />
      <g className="es__roll">
        <rect x="30" y="50" width="120" height="40" rx="8" fill="#E30613" />
        <rect x="38" y="30" width="54" height="26" rx="5" fill="#BFE3FF" opacity=".6" stroke="#E7EEF4" strokeWidth="2" />
        <rect x="100" y="40" width="50" height="16" rx="3" fill="#E7EEF4" />
        <circle cx="60" cy="92" r="9" fill="#1B2230" />
        <circle cx="125" cy="92" r="9" fill="#1B2230" />
        <rect x="150" y="70" width="24" height="18" rx="3" fill="#7C8794" />
        <circle cx="62" cy="40" r="6" fill="#F2C9A8" />
      </g>
      <path d="M4 98h20M8 92h14" stroke="#FFFFFF" strokeWidth="2.5" opacity=".6" />
    </svg>
  );
}

export function CalendarArt() {
  return (
    <svg className="es__art" width="190" height="120" viewBox="0 0 190 120" aria-hidden="true" focusable="false">
      <rect x="40" y="18" width="110" height="84" fill="#17171C" stroke="#3A4656" strokeWidth="2" />
      <rect x="40" y="18" width="110" height="20" fill="#E30613" />
      <path d="M60 10v16M130 10v16" stroke="#E7EEF4" strokeWidth="5" strokeLinecap="round" />
      <path d="M70 66l14 14 30-30" stroke="#3DDC84" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity=".35" />
      <path d="M58 52h20M58 66h10M120 86h14" stroke="#3A4656" strokeWidth="4" />
    </svg>
  );
}

// 404: puk letí mimo bránky, na tabuli svieti 404
export function MissArt() {
  return (
    <svg className="nf2__art" viewBox="0 0 600 420" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="nf-net" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M0 0L8 8M8 0L0 8" stroke="#C9D4DE" strokeWidth=".6" opacity=".35" />
        </pattern>
        <linearGradient id="nf-ice" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F6FBFF" />
          <stop offset="1" stopColor="#B9D3E8" />
        </linearGradient>
        <linearGradient id="nf-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#DCEBFA" stopOpacity=".2" />
          <stop offset="1" stopColor="#DCEBFA" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M240 40L190 330H390L340 40Z" fill="url(#nf-beam)" />
      <rect x="262" y="34" width="76" height="8" rx="4" fill="#EAF2F9" />
      <path d="M100 60V20M170 60V20" stroke="#2C394C" strokeWidth="2" />
      <rect x="60" y="60" width="150" height="74" rx="6" fill="#0A0E14" stroke="#3A4656" strokeWidth="3" />
      <text x="135" y="112" textAnchor="middle" className="nf2__score">
        404
      </text>
      <rect x="20" y="250" width="560" height="44" rx="8" fill="#E7EEF4" />
      <rect x="40" y="258" width="90" height="22" rx="3" fill="#E30613" />
      <rect x="146" y="258" width="90" height="22" rx="3" fill="#2E6BE6" />
      <rect x="430" y="258" width="90" height="22" rx="3" fill="#E30613" />
      <rect x="20" y="284" width="560" height="10" fill="#F2C230" />
      <rect x="0" y="294" width="600" height="22" rx="4" fill="url(#nf-ice)" />
      <rect x="0" y="316" width="600" height="40" fill="#1A2230" />
      <rect x="250" y="226" width="96" height="68" fill="url(#nf-net)" />
      <path d="M250 294V226H346V294" stroke="#E30613" strokeWidth="6" fill="none" strokeLinejoin="round" />
      <path d="M200 300C300 300 380 250 470 150" stroke="#E7EEF4" strokeWidth="2" strokeDasharray="6 8" fill="none" opacity=".6" />
      <g className="nf2__puck">
        <path d="M430 178l60-52M445 192l52-46M418 168l44-38" stroke="#FF3D45" strokeWidth="3" strokeLinecap="round" opacity=".7" />
        <g transform="translate(505 118) rotate(-38)">
          <ellipse rx="22" ry="9" fill="#0A0E14" stroke="#3A4656" strokeWidth="2" />
          <rect x="-22" y="-9" width="44" height="7" fill="#0A0E14" />
          <ellipse cy="-9" rx="22" ry="9" fill="#1B2230" stroke="#3A4656" strokeWidth="2" />
        </g>
      </g>
      <g transform="translate(150 294)">
        <path d="M-2 -40L-10 -4M4 -40L10 -5" stroke="#1B2230" strokeWidth="7" strokeLinecap="round" />
        <path d="M-18 -1H-4M4 -1H18" stroke="#E8EEF4" strokeWidth="3.4" strokeLinecap="round" />
        <g transform="rotate(16)">
          <rect x="-14" y="-78" width="28" height="42" rx="12" fill="#E30613" />
          <rect x="-14" y="-54" width="28" height="4" fill="#FFFFFF" opacity=".85" />
          <circle cy="-90" r="11" fill="#F2C9A8" />
          <path d="M-12 -90a12 12.5 0 0 1 24 0Z" fill="#E30613" />
        </g>
        <path d="M18 -62L36 -44" stroke="#E30613" strokeWidth="7" strokeLinecap="round" />
        <path d="M34 -46L54 -4H70" stroke="#D6B07A" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M-6 -70L-22 -88" stroke="#E30613" strokeWidth="7" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function EmptyState({ art, title, text, children }: { art: React.ReactNode; title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="es">
      {art}
      <div className="es__tx">
        <h3 className="es__h">{title}</h3>
        <p className="es__p">{text}</p>
        {children ? <div className="es__btns">{children}</div> : null}
      </div>
    </div>
  );
}
