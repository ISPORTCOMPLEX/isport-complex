'use client';

import { useEffect, useState } from 'react';

// Ponuka „Pridať na plochu“ na mobile. Android/Chrome: systémové okno inštalácie.
// iPhone (Safari): krátky návod, lebo Apple systémové okno neponúka.
// Ukáže sa až pri druhej návšteve, nie v nainštalovanej verzii, a po zatvorení sa 60 dní neopakuje.
type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const KEY = 'isp-install';

function read(k: string): string | null {
  try {
    return window.localStorage.getItem(k);
  } catch {
    return null;
  }
}
function write(k: string, v: string) {
  try {
    window.localStorage.setItem(k, v);
  } catch {
    /* súkromné okno – nevadí */
  }
}

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIP | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone || !window.matchMedia('(max-width: 1000px)').matches) return;
    const until = Number(read(`${KEY}-off`) ?? 0);
    if (until > Date.now()) return;
    const visits = Number(read(`${KEY}-visits`) ?? 0) + 1;
    write(`${KEY}-visits`, String(visits));
    if (visits < 2) return;
    const onBip = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIP);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && /safari/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    let t = 0;
    if (isIos) {
      setIos(true);
      t = window.setTimeout(() => setShow(true), 4000);
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.clearTimeout(t);
    };
  }, []);

  const close = () => {
    setShow(false);
    write(`${KEY}-off`, String(Date.now() + 60 * 86400000));
  };
  if (!show) return null;
  return (
    <div className="pwa" role="dialog" aria-label="Pridať I-SPORT na plochu">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/icon-192.png" width={52} height={52} alt="" />
      <div className="pwa__tx">
        <b>I-SPORT do mobilu</b>
        <small>{ios ? 'Ťukni na Zdieľať a potom „Pridať na plochu“.' : 'Rezervácie a QR kód jedným ťuknutím.'}</small>
      </div>
      {evt ? (
        <button
          type="button"
          className="sbtn sbtn--md"
          onClick={async () => {
            await evt.prompt();
            await evt.userChoice.catch(() => null);
            close();
          }}
        >
          Pridať
        </button>
      ) : null}
      <button type="button" className="pwa__x" aria-label="Zavrieť" onClick={close}>
        ✕
      </button>
    </div>
  );
}
