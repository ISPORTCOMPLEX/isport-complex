import Link from 'next/link';
import { site } from '@/lib/site';

// Symbol smeru A: šikmý blok (rez korčule) a „i“, ktorého bodka je puk.
export function LogoMark({ size = 40, inverted = false }: { size?: number; inverted?: boolean }) {
  const block = inverted ? '#FFFFFF' : '#E3121B';
  const cut = inverted ? '#E3121B' : '#FFFFFF';
  return (
    <svg width={size} height={(size * 56) / 64} viewBox="0 0 64 56" aria-hidden="true">
      <path d="M12 0H64L52 56H0Z" fill={block} />
      <path d="M26.5 22H37L31.5 48H21Z" fill={cut} />
      <rect x="30.5" y="8" width="12" height="8" rx="4" transform="skewX(-12)" fill={cut} />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label={`${site.brand} ${site.brandSub}, domov`}>
      <LogoMark />
      <span className="logo__words">
        <span className="logo__brand">{site.brand}</span>
        <span className="logo__sub">{site.brandSub}</span>
      </span>
    </Link>
  );
}
