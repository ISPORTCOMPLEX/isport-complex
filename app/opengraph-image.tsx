import { ImageResponse } from 'next/og';

// Obrázok pri zdieľaní odkazu (Messenger, WhatsApp, Facebook) – 1200 × 630.
export const alt = 'I-SPORT COMPLEX – rezervuj si ľad online';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const ERB =
  'data:image/svg+xml;base64,' +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 116"><path d="M14 0H86L100 14V64C100 88 76 104 50 116C24 104 0 88 0 64V14Z" fill="#E3121B"/><path d="M18 8H82L92 18V63C92 83 72 97 50 107C28 97 8 83 8 63V18Z" fill="#08080A"/><path d="M6 69H94V77H6Z" fill="#E3121B"/><path d="M44 46H62L53 94H35Z" fill="#FFFFFF" stroke="#08080A" stroke-width="3" paint-order="stroke"/><path d="M45 29V34A11 6.5 0 0 0 67 34V29Z" fill="#FFFFFF"/><ellipse cx="56" cy="29" rx="11" ry="6.5" fill="#FFFFFF" stroke="#08080A" stroke-width="1.6"/></svg>',
  ).toString('base64');

const TEXT = 'I-SPORTCOMPLEXREZVUJSIĽADONLINETréningováhokejováhala·Košice ';

// Písmo Archivo (úzky šikmý rez) z Google Fonts. Keď sa nepodarí stiahnuť, použije sa predvolené.
async function loadArchivo(): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@1,62,900&text=${encodeURIComponent(TEXT)}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function OpenGraphImage() {
  const font = await loadArchivo();
  const display = font ? 'Archivo' : 'sans-serif';
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: '#000000', color: '#F4F6F7', position: 'relative' }}>
        <div style={{ position: 'absolute', right: -160, bottom: -260, width: 980, height: 620, borderRadius: 9999, backgroundImage: 'radial-gradient(closest-side, rgba(227,18,27,0.55), rgba(227,18,27,0))', display: 'flex' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ERB} width={92} height={107} alt="" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', fontFamily: display, fontStyle: 'italic', fontWeight: 900, fontSize: 64, lineHeight: 0.9 }}>
              I<span style={{ color: '#E3121B' }}>-</span>SPORT
            </div>
            <div style={{ display: 'flex', fontSize: 20, letterSpacing: 10, color: '#9AA1A8', fontWeight: 700 }}>COMPLEX</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', fontFamily: display, fontStyle: 'italic', fontWeight: 900, fontSize: 132, lineHeight: 0.88, textTransform: 'uppercase' }}>
            <span>Rezervuj si</span>
            <span style={{ color: '#E3121B' }}>ľad online</span>
          </div>
          <div style={{ display: 'flex', fontSize: 30, color: '#C8CDD2' }}>Tréningová hokejová hala · Košice</div>
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: 'Archivo', data: font, style: 'italic', weight: 900 }] : undefined },
  );
}
