'use client';

import Link from 'next/link';
import { useActionState, useEffect, useRef, useState } from 'react';
import { receptionAction, type ReceptionState } from '@/lib/actions/reception';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

// Skenovanie QR kamerou (Chrome a Android, nové Safari). Kde to prehliadač nevie, kód sa zadá ručne.
export function ReceptionScanner() {
  const [state, action] = useActionState<ReceptionState, FormData>(receptionAction, {});
  const [scanning, setScanning] = useState(false);
  const [supported, setSupported] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia);
  }, []);

  useEffect(() => {
    if (!scanning) return;
    let stream: MediaStream | null = null;
    let stop = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const Ctor = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
        const detector = new Ctor({ formats: ['qr_code'] });
        while (!stop) {
          const codes = await detector.detect(video).catch(() => []);
          if (codes.length && inputRef.current && formRef.current) {
            inputRef.current.value = codes[0].rawValue;
            setScanning(false);
            formRef.current.requestSubmit();
            break;
          }
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch {
        setScanning(false);
        setSupported(false);
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [scanning]);

  const b = state.booking;

  return (
    <div className="adm-grid">
      <section className="adm-panel">
        <div className="adm-panel__head">
          <h2>Vstupenka</h2>
        </div>
        {scanning ? (
          <div className="scan">
            <video ref={videoRef} playsInline muted className="scan__video" />
            <div className="scan__frame" aria-hidden="true" />
            <button type="button" className="btn btn--sm btn--ghost" onClick={() => setScanning(false)}>
              Zastaviť kameru
            </button>
          </div>
        ) : supported ? (
          <button type="button" className="btn btn--icon" onClick={() => setScanning(true)} style={{ alignSelf: 'flex-start' }}>
            Skenovať QR kód kamerou
            <span className="btn__ic">⌁</span>
          </button>
        ) : (
          <p className="muted adm-note">Tento prehliadač nevie skenovať QR kód. Zadaj kód ručne alebo použi Chrome.</p>
        )}
        <form ref={formRef} action={action} className="adm-search" style={{ maxWidth: '100%' }}>
          <input type="hidden" name="op" value="lookup" />
          <input ref={inputRef} name="q" placeholder="ISP-XXXXXX" autoComplete="off" autoCapitalize="characters" aria-label="Kód rezervácie" maxLength={200} />
          <button className="btn btn--sm">Nájsť</button>
        </form>
      </section>

      <section className="adm-panel">
        <div className="adm-panel__head">
          <h2>Rezervácia</h2>
        </div>
        <FormAlert error={state.error} success={state.success} />
        {b ? (
          <div className="rcp">
            <strong className="rcp__who">{b.who}</strong>
            <span className="rcp__when">{b.when}</span>
            <span className="muted">
              {b.area} · {b.code} · {b.lockers ? `šatne: ${b.lockers}` : 'bez šatne'}
            </span>
            {!b.today && b.status === 'CONFIRMED' ? <span className="chip chip--warn">Pozor: rezervácia nie je na dnes</span> : null}
            {b.status !== 'CONFIRMED' ? <span className="chip chip--red">Rezervácia nie je aktívna</span> : null}
            <div className="rcp__row">
              <span>{b.paid ? <span className="chip chip--ok">Zaplatené</span> : <span className="chip chip--warn">Zaplatiť {b.price} ({b.method})</span>}</span>
              <span>{b.checkedIn ? <span className="chip chip--ok">Prišiel</span> : <span className="chip chip--blue">Čaká na príchod</span>}</span>
            </div>
            {b.note ? <p className="muted adm-note">Poznámka: {b.note}</p> : null}
            <div className="adm-actions">
              {!b.paid && b.status === 'CONFIRMED' ? (
                <form action={action}>
                  <input type="hidden" name="op" value="paid" />
                  <input type="hidden" name="q" value={b.code} />
                  <SubmitButton variant="ghost" full={false}>
                    Zaplatené {b.price}
                  </SubmitButton>
                </form>
              ) : null}
              {!b.checkedIn && b.status === 'CONFIRMED' ? (
                <form action={action}>
                  <input type="hidden" name="op" value="checkin" />
                  <input type="hidden" name="q" value={b.code} />
                  <SubmitButton full={false}>Potvrdiť príchod</SubmitButton>
                </form>
              ) : null}
              <Link href={`/admin/rezervacie/${b.id}`} className="btn btn--sm btn--ghost">
                Detail
              </Link>
            </div>
          </div>
        ) : (
          <p className="adm-empty">Naskenuj alebo zadaj kód.</p>
        )}
      </section>
    </div>
  );
}
