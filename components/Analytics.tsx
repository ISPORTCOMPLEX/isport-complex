'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

// Meranie návštevnosti bez cookies: pri každej zmene stránky pošle cestu a pri odchode čas na stránke.
export function Analytics() {
  const pathname = usePathname();
  const current = useRef<{ id: string | null; at: number; sent: boolean }>({ id: null, at: 0, sent: false });

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    const leave = () => {
      const c = current.current;
      if (!c.id || c.sent) return;
      c.sent = true;
      const data = JSON.stringify({ t: 'leave', id: c.id, d: Date.now() - c.at });
      if (navigator.sendBeacon) navigator.sendBeacon('/api/a', new Blob([data], { type: 'application/json' }));
      else void fetch('/api/a', { method: 'POST', body: data, keepalive: true, headers: { 'content-type': 'application/json' } });
    };
    leave();
    const params = new URLSearchParams(window.location.search);
    const first = current.current.at === 0;
    current.current = { id: null, at: Date.now(), sent: false };
    const ctrl = new AbortController();
    fetch('/api/a', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ t: 'view', p: pathname, r: first ? document.referrer : '', u: params.get('utm_source') ?? undefined }),
      signal: ctrl.signal,
      keepalive: true,
    })
      .then((r) => (r.status === 200 ? r.json() : null))
      .then((j: { id?: string } | null) => {
        if (j?.id) current.current.id = j.id;
      })
      .catch(() => {});
    const onHide = () => {
      if (document.visibilityState === 'hidden') leave();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', leave);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', leave);
    };
  }, [pathname]);

  return null;
}
