'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { savePhotoAction, signUploadAction } from '@/lib/actions/media';
import { Dyn } from '@/components/Dyn';

type Item = { name: string; progress: number; state: 'wait' | 'up' | 'ok' | 'err'; error?: string };

const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif'];

// Nahrávanie: prehliadač pošle súbor priamo do Cloudinary s podpisom od nášho servera.
// Cez náš server ani databázu súbor nejde – tam ide len odkaz na hotovú fotku.
function upload(url: string, fields: Record<string, string | number>, file: File, onProgress: (p: number) => void): Promise<{ public_id: string; version: number; signature: string }> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, String(v));
    fd.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      try {
        const j = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(j);
        else reject(new Error(j?.error?.message ?? `Chyba ${xhr.status}`));
      } catch {
        reject(new Error(`Chyba ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Spojenie s Cloudinary zlyhalo.'));
    xhr.send(fd);
  });
}

export function MediaUploader({ slot, label }: { slot: string; label: string }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  async function run(files: File[]) {
    if (!files.length || busy) return;
    setBusy(true);
    const list: Item[] = files.map((f) => ({ name: f.name, progress: 0, state: 'wait' }));
    setItems(list);
    const set = (i: number, patch: Partial<Item>) => setItems((cur) => cur.map((it, n) => (n === i ? { ...it, ...patch } : it)));
    for (const [i, file] of files.entries()) {
      if (!TYPES.includes(file.type)) {
        set(i, { state: 'err', error: 'Nepodporovaný formát (JPG, PNG, WebP, AVIF, HEIC).' });
        continue;
      }
      set(i, { state: 'up' });
      try {
        const sig = await signUploadAction(slot);
        if (!sig.ok) throw new Error(sig.error);
        if (file.size > sig.maxBytes) throw new Error(`Súbor je väčší ako ${Math.round(sig.maxBytes / 1024 / 1024)} MB.`);
        const r = await upload(sig.url, sig.fields, file, (p) => set(i, { progress: p }));
        const saved = await savePhotoAction({ slot, publicId: r.public_id, version: r.version, signature: r.signature, alt: '' });
        if (!saved.ok) throw new Error(saved.error);
        set(i, { state: 'ok', progress: 1 });
      } catch (err) {
        set(i, { state: 'err', error: err instanceof Error ? err.message : 'Nahrávanie zlyhalo.' });
      }
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="md-up">
      <label
        className={`md-drop${drag ? ' is-drag' : ''}${busy ? ' is-busy' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void run(Array.from(e.dataTransfer.files));
        }}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
          multiple
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            void run(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
          aria-label={`Nahrať fotky – ${label}`}
        />
        <strong>{busy ? 'Nahrávam…' : 'Pretiahni sem fotky alebo klikni'}</strong>
        <span>JPG, PNG, WebP, AVIF alebo HEIC z iPhonu, do 10 MB. Väčšie fotky sa automaticky zmenšia.</span>
      </label>
      {items.length ? (
        <ul className="md-progress" aria-live="polite">
          {items.map((it, i) => (
            <li key={i} className={`is-${it.state}`}>
              <span className="md-progress__name">{it.name}</span>
              <span className="md-progress__bar">
                <Dyn as="i" css={{ width: `${Math.round(it.progress * 100)}%` }} />
              </span>
              <span className="md-progress__st">{it.state === 'ok' ? 'Hotovo' : it.state === 'err' ? it.error : it.state === 'up' ? `${Math.round(it.progress * 100)} %` : 'Čaká'}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
