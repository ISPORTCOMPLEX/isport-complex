// Vlastná sada ikon I-SPORT: rovné rezy, rovnaká hrúbka čiary, jeden červený akcent.
// Mriežka 24 × 24; sivá časť má farbu textu (currentColor), akcent je vždy červený.
const PATHS = {
  satna: ['M12 6.5a2 2 0 1 1 2 2c-1.1 0-2 .7-2 1.7V10.5M12 10.5L3 17v1.5h18V17z', 'M12 6.5a2 2 0 1 1 2 2'], // Šatňa
  sprchy: ['M5 21V6.5A2.5 2.5 0 0 1 7.5 4h3A2.5 2.5 0 0 1 13 6.5V8M9 8h8', 'M10.5 12v2M13.5 12v2M16.5 12v2M12 16.5v2M15 16.5v2'], // Sprchy
  parkovanie: ['M7 3h13v15l-3 3H4V6z', 'M10 16V8h3.5a2.5 2.5 0 0 1 0 5H10'], // Parkovanie
  bufet: ['M5 10h11v4.5a5.5 5.5 0 0 1-5.5 5.5A5.5 5.5 0 0 1 5 14.5zM16 11.5h1.5a2.5 2.5 0 0 1 0 5H16', 'M8.5 3c1 1 1 2 0 3.5M12.5 3c1 1 1 2 0 3.5'], // Bufet
  qr: ['M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM6 6h1M17 6h1M6 17h1', 'M14 14h3v3M21 14v2M14 21h2M18 18h3v3'], // QR potvrdenie
  kalendar: ['M3 5h18v16H3zM3 10h18M8 2.5v4M16 2.5v4', 'M7 13.5h4v4H7z'], // Kalendár
  cas: ['M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM9 2.5h6', 'M12 9v4l3 2'], // Čas
  korcule: ['M6 3.5h5v6l7.3 3a2 2 0 0 1 1.2 1.8V17H6zM9 6.5h2', 'M3.5 20.5h17M8 17v3.5M17 17v3.5'], // Korčule
  hokej: ['M17.5 2.5L10.5 17H3.5v3h7.8l8.2-17.5', 'M14 18.5c0-1 1.6-1.6 3.5-1.6s3.5.6 3.5 1.6-1.6 1.7-3.5 1.7-3.5-.7-3.5-1.7z'], // Hokej
  skybox: ['M3 4h18v12H3zM3 12.5h18M12 16v4.5M8.5 20.5h7', 'M15 6.5l-4.5 4'], // Skybox
  wellness: ['M3 18h18M5.5 21h13', 'M8 14.5c-2-2 2-4 0-6.5M12 14.5c-2-2 2-4 0-6.5M16 14.5c-2-2 2-4 0-6.5'], // Wellness
  posilnovna: ['M7 7.5v9M17 7.5v9M4 10v4M20 10v4M4 12h3M17 12h3', 'M7 12h10'], // Posilňovňa
  ihrisko: ['M3 5h18v14H3zM12 5v14M3 9.5h2.5v5H3M21 9.5h-2.5v5H21', 'M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'], // Ihrisko
  adresa: ['M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z', 'M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'], // Adresa
  karta: ['M2.5 5h19v14h-19zM2.5 9.5h19', 'M6 15h5'], // Platba kartou
  storno: ['M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4v4h4', 'M10 10l4 4M14 10l-4 4'], // Storno
  tim: ['M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6', 'M16 11.5a2.5 2.5 0 1 0 0-5M16.5 14.5c2.6.3 4.5 2.5 4.5 5.5'], // Tím
  telefon: ['M7 2.5h10v19H7z', 'M11 18h2'], // Telefón
  email: ['M3 5h18v14H3z', 'M3 7l9 6 9-6'], // E-mail
  novinky: ['M4 4h13v16H6a2 2 0 0 1-2-2zM17 8h3v10a2 2 0 0 1-2 2M7.5 12h6M7.5 15.5h6', 'M7.5 7.5h6'], // Novinky
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 24, className, label }: { name: IconName; size?: number; className?: string; label?: string }) {
  const [base, accent] = PATHS[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={className ? `ico ${className}` : 'ico'}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path d={base} stroke="currentColor" strokeWidth="2" />
      <path d={accent} stroke="#E30613" strokeWidth="2.2" />
    </svg>
  );
}
