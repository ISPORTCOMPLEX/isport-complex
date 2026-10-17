import Link from 'next/link';
import { site } from '@/lib/site';

// Logo v2 – hokejový erb: štít, šikmé „i“, bodka ako puk a dresový pruh.
// Pod 28 px sa erb zjednoduší (bez pruhu a puku), aby ostal čitateľný.
export function LogoMark({ size = 36, inverted = false }: { size?: number; inverted?: boolean }) {
  const red = '#E3121B';
  const shield = inverted ? '#FFFFFF' : red;
  const mark = inverted ? red : '#FFFFFF';
  const height = Math.round((size * 116) / 100);
  if (size < 28) {
    return (
      <svg width={size} height={height} viewBox="0 0 100 116" aria-hidden="true" className="logo__mark">
        <path d="M14 0H86L100 14V64C100 88 76 104 50 116C24 104 0 88 0 64V14Z" fill={shield} />
        <path d="M19 9H81L91 19V63C91 82 72 96 50 106C28 96 9 82 9 63V19Z" fill="#08080A" />
        <path d="M43 40H65L54 98H32Z" fill={mark} />
      </svg>
    );
  }
  return (
    <svg width={size} height={height} viewBox="0 0 100 116" aria-hidden="true" className="logo__mark">
      <path d="M14 0H86L100 14V64C100 88 76 104 50 116C24 104 0 88 0 64V14Z" fill={shield} />
      <path d="M18 8H82L92 18V63C92 83 72 97 50 107C28 97 8 83 8 63V18Z" fill="#08080A" />
      <path d="M6 69H94V77H6Z" fill={shield} />
      <path d="M44 46H62L53 94H35Z" fill={mark} stroke="#08080A" strokeWidth="3" paintOrder="stroke" />
      <path d="M45 29V34A11 6.5 0 0 0 67 34V29Z" fill={mark} />
      <ellipse cx="56" cy="29" rx="11" ry="6.5" fill={mark} stroke="#08080A" strokeWidth="1.6" />
    </svg>
  );
}

// Nápis I-SPORT s červeným spojovníkom.
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`logo__brand ${className}`}>
      I<span className="logo__dash">-</span>SPORT
    </span>
  );
}

export function Logo({ sub = site.brandSub }: { sub?: string }) {
  return (
    <Link href="/" className="logo" aria-label={`${site.brand} ${site.brandSub}, domov`}>
      <LogoMark />
      <span className="logo__words">
        <Wordmark />
        <span className="logo__sub">{sub}</span>
      </span>
    </Link>
  );
}
