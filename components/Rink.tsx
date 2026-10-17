// Ilustrácie ľadovej plochy (SVG, bez obrázkov).

export function RinkPerspective() {
  return (
    <svg viewBox="0 0 1000 440" aria-hidden="true" style={{ width: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id="ice" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#B9CCDA" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="992" height="432" rx="150" fill="#0B0B0D" stroke="#E3121B" strokeWidth="6" />
      <rect x="14" y="14" width="972" height="412" rx="140" fill="url(#ice)" />
      <line x1="500" y1="14" x2="500" y2="426" stroke="#E3121B" strokeWidth="10" />
      <line x1="355" y1="14" x2="355" y2="426" stroke="#2C5BC8" strokeWidth="12" />
      <line x1="645" y1="14" x2="645" y2="426" stroke="#2C5BC8" strokeWidth="12" />
      <line x1="76" y1="40" x2="76" y2="400" stroke="#E3121B" strokeWidth="3" />
      <line x1="924" y1="40" x2="924" y2="400" stroke="#E3121B" strokeWidth="3" />
      <circle cx="500" cy="220" r="70" fill="none" stroke="#2C5BC8" strokeWidth="4" />
      {[
        [200, 120],
        [200, 320],
        [800, 120],
        [800, 320],
      ].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r="56" fill="none" stroke="#E3121B" strokeWidth="3" />
          <circle cx={cx} cy={cy} r="5" fill="#E3121B" />
        </g>
      ))}
    </svg>
  );
}

export function RinkPlan({ highlight = 'none', muted = false }: { highlight?: 'full' | 'half' | 'none'; muted?: boolean }) {
  const line = muted ? '#5A5F66' : '#F4F6F7';
  return (
    <svg viewBox="0 0 500 240" role="img" aria-label={highlight === 'half' ? 'Polovica plochy' : 'Ľadová plocha'}>
      {highlight === 'full' && <rect x="3" y="3" width="494" height="234" rx="70" fill="#E3121B" fillOpacity="0.2" />}
      {highlight === 'half' && (
        <path d="M250 3 H427 A70 70 0 0 1 497 73 V167 A70 70 0 0 1 427 237 H250 Z" fill="#E3121B" fillOpacity="0.35" stroke="#E3121B" strokeWidth="3" />
      )}
      <rect x="3" y="3" width="494" height="234" rx="70" fill="none" stroke={line} strokeWidth="2.5" />
      {!muted && (
        <>
          <line x1="250" y1="3" x2="250" y2="237" stroke="#E3121B" strokeWidth="4" />
          <line x1="175" y1="3" x2="175" y2="237" stroke="#2C5BC8" strokeWidth="4" />
          <line x1="325" y1="3" x2="325" y2="237" stroke="#2C5BC8" strokeWidth="4" />
          <circle cx="250" cy="120" r="34" fill="none" stroke="#2C5BC8" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}
