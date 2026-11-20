'use client';

import { useRef, useState } from 'react';
import { useT } from '@/lib/i18n/client';

export type Uploaded = { img: { publicId: string; version: number; width: number; height: number }; url: string };

// Zmenšenie v prehliadači (rýchlejšie nahranie, menej dát): logo do 800 px (PNG zostane PNG kvôli priehľadnosti), fotka do 900 px.
async function shrink(file: File, max: number): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  const png = file.type === 'image/png';
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('blob'))), png ? 'image/png' : 'image/jpeg', 0.88));
}

// Nahranie loga tímu / fotky hráča. Bez fotky sa ukáže `empty` (silueta, prázdne logo).
export function ImageUpload({ kind, value, onChange, label, empty, compact = false }: { kind: 'logo' | 'player'; value: Uploaded | null; onChange: (v: Uploaded | null) => void; label: string; empty: React.ReactNode; compact?: boolean }) {
  const t = useT();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setErr('');
    setBusy(true);
    try {
      let blob: Blob;
      try {
        blob = await shrink(file, kind === 'logo' ? 800 : 900);
      } catch {
        throw new Error(t('Tento obrázok sa nedá načítať – použi JPG alebo PNG.'));
      }
      const fd = new FormData();
      fd.set('file', blob, kind === 'logo' ? 'logo' : 'hrac');
      fd.set('kind', kind);
      const res = await fetch('/api/sutaz/obrazok', { method: 'POST', body: fd });
      const j = (await res.json().catch(() => ({}))) as Partial<Uploaded> & { error?: string };
      if (!res.ok || !j.img || !j.url) throw new Error(j.error ? t(j.error) : t('Obrázok sa nepodarilo nahrať.'));
      onChange({ img: j.img, url: j.url });
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('Obrázok sa nepodarilo nahrať.'));
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };

  return (
    <div className={`lgup lgup--${kind}${compact ? ' lgup--compact' : ''}`}>
      <span className="lgup__prev">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.url} alt="" />
        ) : (
          empty
        )}
        {busy ? <span className="lgup__busy" aria-hidden="true" /> : null}
      </span>
      <span className="lgup__acts">
        <button type="button" className="lgup__btn" onClick={() => ref.current?.click()} disabled={busy} aria-label={compact ? label : undefined}>
          {busy ? t('Nahrávam…') : value ? t('Zmeniť') : compact ? t('Fotka') : label}
        </button>
        {value && !busy ? (
          <button type="button" className="lgup__rm" onClick={() => onChange(null)}>
            {t('Odstrániť')}
          </button>
        ) : null}
        <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,image/heic" hidden onChange={(e) => pick(e.target.files?.[0])} />
      </span>
      {err ? (
        <span className="lgup__err" role="alert">
          {err}
        </span>
      ) : null}
    </div>
  );
}
