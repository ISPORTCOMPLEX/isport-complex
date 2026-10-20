import Link from 'next/link';
import { LOCKUP, MARK } from './brandPaths';

// Logo v3 – monogram IS (červené „I“ so špicom, „S“) a nápis I-SPORT / COMPLEX.
// Všetko ako krivky, takže logo vyzerá rovnako bez ohľadu na načítané písmo.
const RED = '#E30613';

export function LogoMark({ size = 36, tone = 'dark' }: { size?: number; tone?: 'dark' | 'light' | 'white' }) {
  const s = tone === 'light' ? '#0A0A0A' : '#FFFFFF';
  const i = tone === 'white' ? '#FFFFFF' : RED;
  const w = Math.round((size * MARK.w) / MARK.h);
  return (
    <svg width={w} height={size} viewBox={`0 0 ${MARK.w} ${MARK.h}`} aria-hidden="true" className="logo__mark">
      <path d={MARK.i} fill={i} />
      <path d={MARK.s} fill={s} />
    </svg>
  );
}

// Vodorovné logo: znak | I-SPORT nad COMPLEX. `height` = výška znaku v px.
export function LogoLockup({ height = 40, tone = 'dark', title = 'I-SPORT COMPLEX' }: { height?: number; tone?: 'dark' | 'light'; title?: string }) {
  const ink = tone === 'light' ? '#0A0A0A' : '#FFFFFF';
  const fill: Record<string, string> = { I: RED, S: ink, T: ink, K: RED, R: RED };
  const w = Math.round((height * LOCKUP.w) / LOCKUP.h);
  return (
    <svg width={w} height={height} viewBox={`0 0 ${LOCKUP.w} ${LOCKUP.h}`} role="img" aria-label={title} className="logo__lockup">
      {LOCKUP.parts.map(([k, d], n) => (
        <path key={n} d={d} fill={fill[k]} />
      ))}
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="I-SPORT COMPLEX, domov">
      <LogoLockup />
    </Link>
  );
}
