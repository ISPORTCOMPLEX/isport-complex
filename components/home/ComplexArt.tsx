// Ilustrácia areálu I-SPORT COMPLEX (viewBox 0 0 1600 700): hala 1 (ľad, skyboxy, bufet), ihrisko medzi halami, hala 2 (posilňovňa, wellness).
// Čisté SVG bez inline štýlov (CSP) – pohyb riadia triedy cxv-* v globals.css. Postavičky sú kreslené od chodidiel (0,0).
import type { ReactNode } from 'react';

const SKIN = '#F2C9A8';
const INK = '#1B2230';

type P = { x: number; c?: string; flip?: boolean; cls?: string };
const flipT = (flip?: boolean) => (flip ? 'scale(-1 1)' : undefined);

function Skater({ x, c = '#E30613', flip, cls }: P) {
  return (
    <g transform={`translate(${x} 520)`}>
      <g className={cls}>
        <g transform={flipT(flip)}>
          <path d="M-2 -24L-8 -3M3 -24L8 -4" stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M-14 -1H-3M3 -1H14" stroke="#E8EEF4" strokeWidth="2.6" strokeLinecap="round" />
          <g transform="rotate(14)">
            <rect x="-9.5" y="-50" width="19" height="28" rx="8" fill={c} />
            <rect x="-9.5" y="-34" width="19" height="3" fill="#FFFFFF" opacity=".85" />
            <circle cx="0" cy="-58" r="7.5" fill={SKIN} />
            <path d="M-8 -58a8 8.5 0 0 1 16 0Z" fill={c} />
            <path d="M4 -58h6" stroke="#CFE6FF" strokeWidth="2" strokeLinecap="round" />
          </g>
          <path d="M10 -42L22 -30" stroke={c} strokeWidth="5" strokeLinecap="round" />
          <path d="M21 -31L33 -3H44" stroke="#D6B07A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      </g>
    </g>
  );
}

function Goalie({ x }: P) {
  return (
    <g transform={`translate(${x} 520)`}>
      <g className="cxv-goalie">
        <rect x="-9" y="-26" width="9" height="26" rx="3" fill="#F4F7FA" />
        <rect x="1" y="-26" width="9" height="26" rx="3" fill="#F4F7FA" />
        <rect x="-12" y="-52" width="24" height="28" rx="9" fill="#2E6BE6" />
        <rect x="-12" y="-38" width="24" height="3" fill="#FFFFFF" opacity=".85" />
        <circle cx="-2" cy="-59" r="8.5" fill="#F4F7FA" />
        <path d="M-9 -60h8M-9 -56h8" stroke={INK} strokeWidth="1.4" />
        <rect x="-26" y="-40" width="12" height="15" rx="3" fill="#F4F7FA" />
        <path d="M-12 -14L-26 -2H-38" stroke="#D6B07A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    </g>
  );
}

function Fan({ x, c = '#E30613', kid }: P & { kid?: boolean }) {
  const s = kid ? 0.82 : 1;
  return (
    <g transform={`translate(${x} 447)`}>
      <path d="M-4 0V-16M-10 -16H8" stroke="#3A4656" strokeWidth="2.5" strokeLinecap="round" />
      <g transform={`scale(${s})`}>
        <g className="cxv-hop">
          <path d="M2 -19H-11V-2" stroke={INK} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <rect x="-6" y="-44" width="17" height="27" rx="7.5" fill={c} />
          <circle cx="2" cy="-52" r="7.5" fill={kid ? '#C68B5E' : SKIN} />
          <path d="M-5.5 -53a7.5 7.5 0 0 1 15 -1.5Q5 -58 -5.5 -53Z" fill={kid ? '#2A1E17' : '#6B4A2E'} />
          <g className="cxv-arms-dn">
            <path d="M-1 -37L-12 -28" stroke={c} strokeWidth="4.5" strokeLinecap="round" />
          </g>
          <g className="cxv-arms-up">
            <path d="M-2 -40L-10 -58M7 -40L13 -58" stroke={c} strokeWidth="4.5" strokeLinecap="round" />
            {kid ? <path d="M9 -58l4 -12 5 2 -3 11Z" fill="#E30613" /> : null}
          </g>
        </g>
      </g>
    </g>
  );
}

function Barista({ x }: P) {
  return (
    <g transform={`translate(${x} 560)`}>
      <rect x="-10" y="-74" width="20" height="40" rx="8" fill="#E7EEF4" />
      <rect x="-8" y="-62" width="16" height="30" rx="4" fill={INK} />
      <circle cx="0" cy="-82" r="8" fill="#C68B5E" />
      <path d="M-8.5 -84a8.5 7 0 0 1 17 0H11V-81H-8.5Z" fill="#E30613" />
      <g className="cxv-serve">
        <path d="M-8 -62L-22 -52" stroke="#E7EEF4" strokeWidth="5" strokeLinecap="round" />
        <rect x="-30" y="-58" width="8" height="10" rx="2" fill="#FFFFFF" />
      </g>
    </g>
  );
}

function Kid({ x }: P) {
  return (
    <g transform={`translate(${x} 560)`}>
      <path d="M-3 -18V0M4 -18V0" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <rect x="-9" y="-40" width="18" height="25" rx="7" fill="#E30613" />
      <rect x="-9" y="-30" width="18" height="3" fill="#FFFFFF" opacity=".85" />
      <circle cx="1" cy="-47" r="7" fill={SKIN} />
      <path d="M-6 -48a7 7 0 0 1 14 -1Q3 -53 -6 -48Z" fill="#D9B26F" />
      <path d="M6 -34L15 -30" stroke="#E30613" strokeWidth="4.5" strokeLinecap="round" />
      <rect x="14" y="-36" width="7" height="9" rx="1.5" fill="#FFFFFF" />
      <circle cx="17" cy="-42" r="2.4" fill="#E4ECF4" className="cxv-steam cxv-d0" />
      <circle cx="19" cy="-47" r="2" fill="#E4ECF4" className="cxv-steam cxv-d2" />
    </g>
  );
}

function Footballer({ x, c = '#E30613', flip, cls, kick }: P & { kick?: boolean }) {
  return (
    <g transform={`translate(${x} 556)`}>
      <g className={cls}>
        <g transform={flipT(flip)}>
          <path d="M-3 -20L-6 -1" stroke={SKIN} strokeWidth="4" strokeLinecap="round" />
          <g className={kick ? 'cxv-kick' : undefined}>
            <path d="M3 -20L7 -1" stroke={SKIN} strokeWidth="4" strokeLinecap="round" />
            <path d="M5 -1H11" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          </g>
          <path d="M-9 -1H-3" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <rect x="-7.5" y="-27" width="15" height="9" rx="3" fill={INK} />
          <rect x="-8.5" y="-47" width="17" height="23" rx="7" fill={c} />
          <path d="M-6 -42L-12 -30M6 -42L12 -32" stroke={SKIN} strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="1" cy="-54" r="7" fill={flip ? '#C68B5E' : SKIN} />
          <path d="M-6 -55a7 7 0 0 1 14 -1Q3 -60 -6 -55Z" fill="#2A1E17" />
        </g>
      </g>
    </g>
  );
}

function Keeper({ x }: P) {
  return (
    <g transform={`translate(${x} 556)`}>
      <g className="cxv-keeper">
        <path d="M-3 -20L-6 -1M3 -20L6 -1" stroke={SKIN} strokeWidth="4" strokeLinecap="round" />
        <rect x="-7.5" y="-27" width="15" height="9" rx="3" fill={INK} />
        <rect x="-8.5" y="-47" width="17" height="23" rx="7" fill="#F2C230" />
        <path d="M-6 -42L-15 -50M6 -42L13 -50" stroke="#F2C230" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="-15" cy="-51" r="3" fill="#E7EEF4" /><circle cx="13" cy="-51" r="3" fill="#E7EEF4" />
        <circle cx="-1" cy="-54" r="7" fill={SKIN} />
        <path d="M-8 -55a7 7 0 0 1 14 -1Q-3 -60 -8 -55Z" fill="#6B4A2E" />
      </g>
    </g>
  );
}

function Lifter({ x }: P) {
  return (
    <g transform={`translate(${x} 420)`}>
      <g className="cxv-squat-legs">
        <path d="M-5 -26L-7 0M5 -26L7 0" stroke="#5A6B80" strokeWidth="6" strokeLinecap="round" />
      </g>
      <g className="cxv-squat-up">
        <rect x="-10" y="-54" width="20" height="30" rx="8" fill="#2E6BE6" />
        <circle cx="0" cy="-62" r="8" fill={SKIN} />
        <path d="M-8 -63a8 8 0 0 1 16 -1Q2 -68 -8 -63Z" fill="#2A1E17" />
        <path d="M-9 -50L-16 -66M9 -50L16 -66" stroke={SKIN} strokeWidth="4" strokeLinecap="round" />
        <path d="M-44 -68H44" stroke="#C9D1DA" strokeWidth="3.5" strokeLinecap="round" />
        <rect x="-44" y="-80" width="8" height="24" rx="3" fill="#E30613" />
        <rect x="36" y="-80" width="8" height="24" rx="3" fill="#E30613" />
      </g>
    </g>
  );
}

function Curler({ x }: P) {
  return (
    <g transform={`translate(${x} 420)`}>
      <rect x="-22" y="-20" width="44" height="6" rx="3" fill="#3A4656" />
      <path d="M-16 -14V0M16 -14V0" stroke="#3A4656" strokeWidth="3" />
      <path d="M-4 -20H12V0" stroke="#5A6B80" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="-12" y="-48" width="18" height="29" rx="7.5" fill="#E30613" />
      <circle cx="-3" cy="-56" r="7.5" fill="#C68B5E" />
      <path d="M-10.5 -57a7.5 7.5 0 0 1 15 -1Q-1 -62 -10.5 -57Z" fill="#2A1E17" />
      <path d="M2 -42L8 -30" stroke="#C68B5E" strokeWidth="4" strokeLinecap="round" />
      <g className="cxv-curl">
        <path d="M8 -30L20 -30" stroke="#C68B5E" strokeWidth="4" strokeLinecap="round" />
        <rect x="18" y="-36" width="6" height="12" rx="2" fill="#7C8794" />
      </g>
    </g>
  );
}

function Runner({ x }: P) {
  return (
    <g transform={`translate(${x} 408)`}>
      <g className="cxv-bob">
        <g className="cxv-run-a"><path d="M0 -26L-6 -1" stroke="#5A6B80" strokeWidth="5" strokeLinecap="round" /></g>
        <g className="cxv-run-b"><path d="M0 -26L7 -2" stroke="#5A6B80" strokeWidth="5" strokeLinecap="round" /></g>
        <rect x="-8" y="-52" width="17" height="28" rx="7.5" fill="#F2C230" />
        <circle cx="3" cy="-60" r="7.5" fill={SKIN} />
        <path d="M-4.5 -61a7.5 7.5 0 0 1 15 -1Q5 -66 -4.5 -61ZM-6 -62l-8 6" stroke="#D9B26F" fill="#D9B26F" strokeWidth="3" strokeLinecap="round" />
        <g className="cxv-run-b"><path d="M2 -46L-8 -36" stroke={SKIN} strokeWidth="4" strokeLinecap="round" /></g>
        <g className="cxv-run-a"><path d="M4 -46L13 -36" stroke={SKIN} strokeWidth="4" strokeLinecap="round" /></g>
      </g>
    </g>
  );
}

function Tree({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <g transform={`translate(${x} 560) scale(${s})`}>
      <rect x="-3" y="-30" width="6" height="30" fill="#2A2018" />
      <circle cx="0" cy="-46" r="22" fill="#163A29" />
      <circle cx="-12" cy="-34" r="14" fill="#1B4732" />
      <circle cx="12" cy="-36" r="15" fill="#1A4330" />
      <circle cx="4" cy="-60" r="12" fill="#1E4E37" />
    </g>
  );
}

export function ComplexArt({ sky, front }: { sky: ReactNode; front: ReactNode }) {
  return (
    <>
        <defs>
          <linearGradient id="cxv-hall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#141C29" /><stop offset="1" stopColor="#0C1018" /></linearGradient>
          <linearGradient id="cxv-roof" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#3A4657" /><stop offset=".5" stopColor="#5A6B80" /><stop offset="1" stopColor="#3A4657" /></linearGradient>
          <linearGradient id="cxv-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#DCEBFA" stopOpacity=".22" /><stop offset="1" stopColor="#DCEBFA" stopOpacity="0" /></linearGradient>
          <linearGradient id="cxv-ice" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F6FBFF" /><stop offset="1" stopColor="#B9D3E8" /></linearGradient>
          <linearGradient id="cxv-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#BFE3FF" stopOpacity=".16" /><stop offset="1" stopColor="#BFE3FF" stopOpacity=".04" /></linearGradient>
          <radialGradient id="cxv-warm" cx=".5" cy=".2" r=".8"><stop offset="0" stopColor="#FFB020" stopOpacity=".26" /><stop offset="1" stopColor="#FFB020" stopOpacity="0" /></radialGradient>
          <linearGradient id="cxv-room" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1F2634" /><stop offset="1" stopColor="#161C27" /></linearGradient>
          <linearGradient id="cxv-turf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1E7A45" /><stop offset="1" stopColor="#15603A" /></linearGradient>
          <linearGradient id="cxv-flood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF4CF" stopOpacity=".26" /><stop offset="1" stopColor="#FFF4CF" stopOpacity="0" /></linearGradient>
          <linearGradient id="cxv-h2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#151D2A" /><stop offset="1" stopColor="#0E131B" /></linearGradient>
          <linearGradient id="cxv-mirror" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#33445A" /><stop offset="1" stopColor="#1C2533" /></linearGradient>
          <linearGradient id="cxv-wood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#B07642" /><stop offset="1" stopColor="#8A5830" /></linearGradient>
          <linearGradient id="cxv-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#47CFD6" /><stop offset="1" stopColor="#1A7C97" /></linearGradient>
          <linearGradient id="cxv-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#121720" /><stop offset="1" stopColor="#08090D" /></linearGradient>
          <radialGradient id="cxv-glow"><stop offset="0" stopColor="#FFF6DA" stopOpacity=".38" /><stop offset="1" stopColor="#FFF6DA" stopOpacity="0" /></radialGradient>
          <pattern id="cxv-net" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 0L8 8M8 0L0 8" stroke="#C9D4DE" strokeWidth=".6" opacity=".35" /></pattern>
        </defs>

        {sky}

        {/* ===== HALA 1 ===== */}
        <path d="M40 560V300C200 120 700 120 860 300V560Z" fill="url(#cxv-hall)" />
        <path d="M77 275.6L123.6 264.6M111.5 252.2L90.2 286.8M150.9 232L203.7 229M194.4 214.9L161.7 245.3M241.4 200.9L297 205.3M291.1 190L249 215.7M342.9 182.2L398.1 193.5M396.1 177.6L346.9 197.9M450 176L501.9 193.5M503.9 177.6L450 192M557.1 182.2L603 205.3M608.9 190L553.1 197.9M658.6 200.9L696.3 229M705.6 214.9L651 215.7M749.1 232L776.4 264.6M788.5 252.2L738.3 245.3M823 275.6L838 312" stroke="#263244" strokeWidth="1.4" fill="none" />
        <path d="M62 312C214 152 686 152 838 312" stroke="#2C394C" strokeWidth="2" fill="none" />
        <path d="M30 305C194 113 706 113 870 305" stroke="url(#cxv-roof)" strokeWidth="13" strokeLinecap="round" fill="none" />
        <path d="M40 300V560M860 300V560" stroke="#2C3747" strokeWidth="3" />
        <text x="450" y="100" textAnchor="middle" className="cxv-sign">I-SPORT COMPLEX</text>
        <rect x="374" y="108" width="152" height="3" fill="#E30613" />
        <text x="62" y="350" className="cxe__tag">HALA 1</text>

        <g className="cxv-z cxv-z-ice">
          <path d="M150 250.7V266M262 212.5V266M478 192.4V266M590 203.1V266M352 197.3V296M388 194.1V296" stroke="#2C394C" strokeWidth="1.5" />
          <path d="M130 274L170 274L214 520H86Z" fill="url(#cxv-beam)" />
  <path d="M242 274L282 274L326 520H198Z" fill="url(#cxv-beam)" />
  <path d="M458 274L498 274L542 520H414Z" fill="url(#cxv-beam)" />
  <path d="M570 274L610 274L654 520H526Z" fill="url(#cxv-beam)" />
          <rect x="128" y="266" width="44" height="7" rx="3.5" fill="#EAF2F9" /><rect x="128" y="272" width="44" height="2" fill="#9FD3FF" opacity=".7" />
  <rect x="240" y="266" width="44" height="7" rx="3.5" fill="#EAF2F9" /><rect x="240" y="272" width="44" height="2" fill="#9FD3FF" opacity=".7" />
  <rect x="456" y="266" width="44" height="7" rx="3.5" fill="#EAF2F9" /><rect x="456" y="272" width="44" height="2" fill="#9FD3FF" opacity=".7" />
  <rect x="568" y="266" width="44" height="7" rx="3.5" fill="#EAF2F9" /><rect x="568" y="272" width="44" height="2" fill="#9FD3FF" opacity=".7" />
          <rect x="330" y="296" width="80" height="44" rx="5" fill="#0A0E14" stroke="#3A4656" strokeWidth="2" />
          <text x="370" y="326" textAnchor="middle" className="cxv-score cxv-score-a">2 : 1</text>
          <text x="370" y="326" textAnchor="middle" className="cxv-score cxv-score-b">GÓL!</text>
          {/* zavesený dres pod strechou – meno a číslo */}
          <path d="M520 195V206M548 197V206" stroke="#7C8794" strokeWidth="1.2" />
          <g transform="translate(534 206)">
            <g className="cxv-jersey">
              <path d="M-20 0H20" stroke="#7C8794" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M-13 1L-29 7L-37 27L-27 31L-21 22V59H21V22L27 31L37 27L29 7L13 1Q0 6 -13 1Z" fill="#AF1E2D" stroke="#7E1420" strokeWidth="1" />
              <path d="M-33.6 19.5L-23 23.6M33.6 19.5L23 23.6" stroke="#FFFFFF" strokeWidth="1.4" />
              <path d="M-32.2 22.6L-22.6 26.4M32.2 22.6L22.6 26.4" stroke="#1D3A8A" strokeWidth="3" />
              <path d="M-31 25.8L-22.2 29.2M31 25.8L22.2 29.2" stroke="#FFFFFF" strokeWidth="1.4" />
              <rect x="-21" y="31" width="42" height="1.6" fill="#FFFFFF" />
              <rect x="-21" y="32.6" width="42" height="7" fill="#1D3A8A" />
              <rect x="-21" y="39.6" width="42" height="1.6" fill="#FFFFFF" />
              <rect x="-21" y="51" width="42" height="1.4" fill="#FFFFFF" />
              <rect x="-21" y="52.4" width="42" height="4" fill="#1D3A8A" />
              <rect x="-21" y="56.4" width="42" height="1.4" fill="#FFFFFF" />
              <text x="0" y="14.5" textAnchor="middle" className="cxv-jersey-name">SLAFKOVSKY</text>
              <text x="0" y="45" textAnchor="middle" className="cxv-jersey-num">20</text>
            </g>
          </g>
          <rect x="90" y="430" width="560" height="58" fill="url(#cxv-glass)" />
          <path d="M90 430V488M146 430V488M202 430V488M258 430V488M314 430V488M370 430V488M426 430V488M482 430V488M538 430V488M594 430V488M650 430V488" stroke="#BFE3FF" strokeWidth="1.2" opacity=".28" />
          <path d="M90 430H650" stroke="#BFE3FF" strokeWidth="1.5" opacity=".35" />
          <circle cx="622" cy="424" r="5" fill="#FF2A33" className="cxv-lamp" />
          <rect x="88" y="487" width="564" height="34" rx="6" fill="#E7EEF4" />
          <rect x="96" y="493" width="60" height="16" rx="2" fill="#E30613" opacity=".95" /><rect x="104" y="499" width="34" height="3" rx="1.5" fill="#FFFFFF" opacity=".8" /><rect x="164" y="493" width="60" height="16" rx="2" fill="#2E6BE6" opacity=".95" /><rect x="172" y="499" width="24" height="3" rx="1.5" fill="#FFFFFF" opacity=".8" /><rect x="232" y="493" width="60" height="16" rx="2" fill="#F4F7FA" opacity=".55" /><rect x="240" y="499" width="34" height="3" rx="1.5" fill="#1B2230" opacity=".8" /><rect x="300" y="493" width="60" height="16" rx="2" fill="#E30613" opacity=".95" /><rect x="308" y="499" width="24" height="3" rx="1.5" fill="#FFFFFF" opacity=".8" /><rect x="368" y="493" width="60" height="16" rx="2" fill="#1B2230" opacity=".95" /><rect x="376" y="499" width="34" height="3" rx="1.5" fill="#FFFFFF" opacity=".8" /><rect x="436" y="493" width="60" height="16" rx="2" fill="#2E6BE6" opacity=".95" /><rect x="444" y="499" width="24" height="3" rx="1.5" fill="#FFFFFF" opacity=".8" /><rect x="504" y="493" width="60" height="16" rx="2" fill="#F4F7FA" opacity=".55" /><rect x="512" y="499" width="34" height="3" rx="1.5" fill="#1B2230" opacity=".8" /><rect x="572" y="493" width="60" height="16" rx="2" fill="#E30613" opacity=".95" /><rect x="580" y="499" width="24" height="3" rx="1.5" fill="#FFFFFF" opacity=".8" />
          <rect x="88" y="513" width="564" height="7" fill="#F2C230" opacity=".9" />
          <rect x="70" y="520" width="600" height="14" rx="3" fill="url(#cxv-ice)" />
          <rect x="70" y="534" width="600" height="26" fill="#1A2230" />
          <rect x="300" y="520" width="4" height="14" fill="#2E6BE6" /><rect x="368" y="520" width="5" height="14" fill="#E30613" /><rect x="436" y="520" width="4" height="14" fill="#2E6BE6" />
          <g>
            <rect x="104" y="498" width="24" height="22" fill="url(#cxv-net)" />
            <path d="M128 520V498H104V520" stroke="#E30613" strokeWidth="3" fill="none" strokeLinejoin="round" />
          </g>
          <g className="cxv-net-r">
            <rect x="612" y="498" width="24" height="22" fill="url(#cxv-net)" />
            <path d="M612 520V498H636V520" stroke="#E30613" strokeWidth="3" fill="none" strokeLinejoin="round" />
          </g>
          <Skater x={214} c="#E30613" cls="cxv-ga" />
          <Skater x={318} c="#E30613" cls="cxv-gb" />
          <ellipse cx="356" cy="518" rx="5.5" ry="2.2" fill="#0A0E14" className="cxv-puck" />
          <Skater x={452} c="#2E6BE6" flip cls="cxv-gc" />
          <Skater x={530} c="#2E6BE6" flip cls="cxv-gd" />
          <Goalie x={596} />
        </g>

        {/* skybox (poschodie) */}
        <g className="cxv-z cxv-z-sky">
          <rect x="652" y="344" width="208" height="7" fill="#2C3747" />
          <rect x="660" y="351" width="200" height="96" fill="url(#cxv-room)" />
          <rect x="660" y="351" width="200" height="96" fill="url(#cxv-warm)" />
          <rect x="660" y="351" width="9" height="96" fill="#9FD3FF" opacity=".32" />
          <rect x="806" y="364" width="38" height="24" rx="2" fill="#0A0E14" stroke="#3A4656" />
          <rect x="810" y="368" width="30" height="16" fill="#BFE3FF" opacity=".55" />
          <path d="M720 351V362M800 351V362" stroke="#3A4656" strokeWidth="1.5" />
          <path d="M712 368a8 8 0 0 1 16 0Z" fill="#FFB020" /><path d="M792 368a8 8 0 0 1 16 0Z" fill="#FFB020" />
          <rect x="668" y="414" width="150" height="5" rx="2" fill="#3A4656" />
          <rect x="684" y="406" width="6" height="8" rx="1.5" fill="#FFB020" opacity=".9" />
          <rect x="742" y="406" width="6" height="8" rx="1.5" fill="#E7EEF4" />
          <Fan x={706} c="#E30613" />
          <Fan x={752} c="#2E6BE6" kid />
          <Fan x={796} c="#E7EEF4" />
          <g className="cxv-bubble">
            <rect x="700" y="364" width="74" height="24" rx="12" fill="#FFB020" />
            <path d="M716 388L712 396L726 388Z" fill="#FFB020" />
            <text x="737" y="381" textAnchor="middle" className="cxv-bubble-t">GÓÓÓL!</text>
          </g>
          <rect x="652" y="447" width="208" height="9" fill="#2C3747" />
        </g>

        {/* bufet (prízemie) */}
        <g className="cxv-z cxv-z-food">
          <rect x="660" y="456" width="200" height="104" fill="#18202C" />
          <rect x="660" y="456" width="200" height="104" fill="url(#cxv-warm)" />
          <rect x="684" y="468" width="64" height="30" rx="3" fill="#0A0E14" stroke="#3A4656" />
          <text x="716" y="481" textAnchor="middle" className="cxv-menu">BUFET</text>
          <path d="M692 487H722M692 492H714M728 487H740M728 492H740" stroke="#7C8794" strokeWidth="1.5" />
          <rect x="766" y="476" width="54" height="3" rx="1.5" fill="#3A4656" />
          <rect x="770" y="466" width="7" height="10" rx="1.5" fill="#E7EEF4" /><rect x="781" y="466" width="7" height="10" rx="1.5" fill="#FFB020" /><rect x="792" y="466" width="7" height="10" rx="1.5" fill="#E30613" />
          <rect x="826" y="482" width="22" height="34" rx="3" fill="#C9D1DA" />
          <rect x="830" y="488" width="14" height="8" rx="1.5" fill="#1B2230" />
          <circle cx="837" cy="503" r="2.2" fill="#3DDC84" className="cxv-coffee" />
          <Barista x={796} />
          <rect x="716" y="514" width="138" height="6" rx="2" fill="#EEF2F5" />
          <rect x="720" y="520" width="130" height="40" fill="#E30613" />
          <path d="M732 540H780" stroke="#FFFFFF" strokeWidth="3" opacity=".85" />
          <path d="M728 514a14 10 0 0 1 28 0" fill="#BFE3FF" opacity=".35" stroke="#BFE3FF" strokeWidth="1" />
          <circle cx="736" cy="511" r="3" fill="#D9A15A" /><circle cx="745" cy="510" r="3" fill="#B97A3E" />
          <Kid x={694} />
        </g>

        {/* ===== IHRISKO (medzi halami) ===== */}
        <g className="cxv-z cxv-z-pitch">
          <path d="M892 334L944 515H1060Z" fill="url(#cxv-flood)" className="cxv-floodbeam" />
          <path d="M1188 334L1136 515H1020Z" fill="url(#cxv-flood)" className="cxv-floodbeam" />
          <rect x="912" y="462" width="256" height="53" fill="url(#cxv-net)" />
          <path d="M912 462V515M944 462V515M976 462V515M1008 462V515M1040 462V515M1072 462V515M1104 462V515M1136 462V515M1168 462V515M912 462H1168" stroke="#4A5868" strokeWidth="1.6" />
          <path d="M912 515L1168 515L1196 560L884 560Z" fill="url(#cxv-turf)" />
          <path d="M912 515L944 515L923 560L884 560Z" fill="#FFFFFF" opacity=".05" /><path d="M976 515L1008 515L1001 560L962 560Z" fill="#FFFFFF" opacity=".05" /><path d="M1040 515L1072 515L1079 560L1040 560Z" fill="#FFFFFF" opacity=".05" /><path d="M1104 515L1136 515L1157 560L1118 560Z" fill="#FFFFFF" opacity=".05" />
          <path d="M920 519L1160 519L1184 556L896 556Z" stroke="#FFFFFF" strokeWidth="1.5" fill="none" opacity=".75" />
          <path d="M1040 519V556" stroke="#FFFFFF" strokeWidth="1.5" opacity=".75" />
          <ellipse cx="1040" cy="537" rx="26" ry="8" stroke="#FFFFFF" strokeWidth="1.5" fill="none" opacity=".75" />
          <g>
            <rect x="892" y="526" width="16" height="30" fill="url(#cxv-net)" />
            <path d="M908 556V526H892" stroke="#FFFFFF" strokeWidth="2.6" fill="none" />
          </g>
          <g className="cxv-net-p">
            <rect x="1172" y="526" width="16" height="30" fill="url(#cxv-net)" />
            <path d="M1172 556V526H1188" stroke="#FFFFFF" strokeWidth="2.6" fill="none" />
          </g>
          <Footballer x={990} c="#E30613" cls="cxv-fa" kick />
          <circle cx="1006" cy="553" r="5" fill="#FFFFFF" className="cxv-ball" />
          <Footballer x={1094} c="#2E6BE6" flip cls="cxv-fb" />
          <Keeper x={1162} />
        </g>
        {/* stožiare svetiel */}
        <path d="M892 560V330M1188 560V330" stroke="#3A4656" strokeWidth="4" />
        <rect x="878" y="320" width="28" height="12" rx="2" fill="#E4ECF4" /><rect x="1174" y="320" width="28" height="12" rx="2" fill="#E4ECF4" />
        <g className="cxv-floodbeam"><circle cx="892" cy="328" r="34" fill="url(#cxv-glow)" /><circle cx="1188" cy="328" r="34" fill="url(#cxv-glow)" /></g>

        {/* ===== HALA 2 ===== */}
        <rect x="1220" y="300" width="340" height="260" fill="url(#cxv-h2)" />
        <rect x="1206" y="286" width="368" height="15" rx="3" fill="url(#cxv-roof)" />
        <rect x="1214" y="301" width="7" height="259" fill="#E30613" />
        <path d="M1560 301V560" stroke="#2C3747" strokeWidth="3" />
        <text x="1224" y="276" className="cxe__tag">HALA 2</text>

        <g className="cxv-z cxv-z-gym">
          <rect x="1238" y="306" width="304" height="3" rx="1.5" fill="#E4ECF4" opacity=".75" />
          <rect x="1240" y="318" width="300" height="62" fill="url(#cxv-mirror)" opacity=".75" />
          <path d="M1270 380L1310 318M1300 380L1340 318M1420 380L1460 318" stroke="#FFFFFF" strokeWidth="6" opacity=".04" />
          <circle cx="1356" cy="334" r="9" fill="#0A0E14" stroke="#7C8794" strokeWidth="1.5" />
          <path d="M1356 334V327" stroke="#E4ECF4" strokeWidth="1.5" strokeLinecap="round" className="cxv-clock" />
          <rect x="1220" y="420" width="340" height="9" fill="#1A1F28" />
          <path d="M1262 420V346M1318 420V346" stroke="#7C8794" strokeWidth="4" strokeLinecap="round" />
          <path d="M1258 420H1266M1314 420H1322" stroke="#7C8794" strokeWidth="4" strokeLinecap="round" />
          <Lifter x={1290} />
          <Curler x={1392} />
          <rect x="1440" y="408" width="78" height="12" rx="4" fill="#2C3747" />
          <path d="M1512 408L1506 368" stroke="#7C8794" strokeWidth="3.5" strokeLinecap="round" />
          <rect x="1496" y="360" width="20" height="10" rx="2" fill="#1B2230" stroke="#7C8794" />
          <rect x="1499" y="363" width="9" height="4" fill="#3DDC84" opacity=".8" />
          <Runner x={1472} />
          <path d="M1530 420a6 6 0 1 1 12 0Z" fill="#E30613" /><path d="M1546 420a5 5 0 1 1 10 0Z" fill="#2E6BE6" />
        </g>

        <g className="cxv-z cxv-z-well">
          <rect x="1220" y="429" width="340" height="7" fill="#2C3747" />
          <rect x="1221" y="436" width="339" height="124" fill="url(#cxv-warm)" />
          <path d="M1376 444a10 6 0 0 1 20 0M1478 444a10 6 0 0 1 20 0" fill="#FFB020" opacity=".85" />
          <rect x="1240" y="478" width="100" height="82" rx="4" fill="url(#cxv-wood)" />
          <path d="M1244 488H1336M1244 497H1336M1244 506H1336M1244 515H1336M1244 524H1336M1244 533H1336M1244 542H1336M1244 551H1336" stroke="#6E4526" strokeWidth="1" opacity=".45" />
          <rect x="1236" y="472" width="108" height="8" rx="3" fill="#7A4C29" />
          <rect x="1254" y="492" width="26" height="20" rx="3" fill="#FFB020" opacity=".6" className="cxv-sauna" />
          <rect x="1296" y="488" width="32" height="72" rx="3" fill="#9A6438" stroke="#6E4526" />
          <rect x="1301" y="495" width="22" height="24" rx="2" fill="#FFB020" opacity=".35" className="cxv-sauna" />
          <circle cx="1323" cy="528" r="2" fill="#E4ECF4" />
          <circle cx="1262" cy="462" r="7" fill="#E4ECF4" className="cxv-steam cxv-d0" />
          <circle cx="1284" cy="458" r="9" fill="#E4ECF4" className="cxv-steam cxv-d1" />
          <circle cx="1304" cy="463" r="6" fill="#E4ECF4" className="cxv-steam cxv-d2" />
          <rect x="1366" y="498" width="140" height="62" rx="8" fill="#D5DEE6" />
          <rect x="1372" y="508" width="128" height="52" rx="5" fill="url(#cxv-water)" />
          <g className="cxv-swim">
            <circle cx="1432" cy="504" r="8" fill="#F2C9A8" />
            <path d="M1424 500a8 8 0 0 1 16 0Z" fill="#E4ECF4" />
            <path d="M1420 512a12 6 0 0 1 24 0" fill="#F2C9A8" />
          </g>
          <path d="M1372 510q8 -5 16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0" stroke="#BFF4F6" strokeWidth="2" fill="none" className="cxv-wave" />
          <circle cx="1396" cy="540" r="2.5" fill="#E4FBFC" className="cxv-bub cxv-d0" />
          <circle cx="1460" cy="546" r="2" fill="#E4FBFC" className="cxv-bub cxv-d1" />
          <circle cx="1484" cy="536" r="2.5" fill="#E4FBFC" className="cxv-bub cxv-d2" />
          <rect x="1524" y="540" width="20" height="20" rx="3" fill="#C9D1DA" />
          <path d="M1534 540C1520 520 1526 506 1534 500C1542 506 1548 520 1534 540ZM1534 540C1518 530 1512 522 1514 512C1526 516 1532 528 1534 540ZM1534 540C1550 530 1556 522 1554 512C1542 516 1536 528 1534 540Z" fill="#2F8F5B" />
        </g>

        {/* zem, chodník, stromy */}
        <rect x="-200" y="560" width="2000" height="240" fill="url(#cxv-ground)" />
        <rect x="-200" y="560" width="2000" height="5" fill="#1C2430" />
        <rect x="-200" y="604" width="2000" height="34" fill="#0C1017" />
        <path d="M-200 621H1800" stroke="#2A3442" strokeWidth="2" strokeDasharray="22 18" />
        <Tree x={16} s={1.1} />
        <Tree x={872} s={0.75} />
        <Tree x={1203} s={0.8} />
        <Tree x={1588} s={1} />

        {front}
    </>
  );
}
