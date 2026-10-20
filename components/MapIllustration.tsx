// Ilustračná mapa – len náhľad pod tlačidlom „Zobraziť presnú mapu“.
export function MapIllustration() {
  return (
    <svg viewBox="0 0 700 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g stroke="#FFFFFF" strokeWidth="16" fill="none">
        <path d="M-20 120L720 60" />
        <path d="M140 -20L260 600" />
        <path d="M-20 420L720 380" />
        <path d="M520 -20L470 600" />
      </g>
      <g stroke="#FFFFFF" strokeWidth="6" fill="none" opacity=".8">
        <path d="M-20 260L720 230" />
        <path d="M360 -20L380 600" />
      </g>
      <rect x="300" y="250" width="140" height="90" rx="6" fill="#0B0F14" />
      <g transform="translate(348 190) scale(.44)">
        <path d="M14 0H86L100 14V64C100 88 76 104 50 116C24 104 0 88 0 64V14Z" fill="#E3121B" />
        <path d="M18 8H82L92 18V63C92 83 72 97 50 107C28 97 8 83 8 63V18Z" fill="#08080A" />
        <path d="M44 46H62L53 94H35Z" fill="#FFFFFF" />
      </g>
    </svg>
  );
}
