'use client';

import { useState, useTransition } from 'react';
import { reactAction } from '@/lib/actions/articleSocial';
import { useT } from '@/lib/i18n/client';

// Páči sa / nepáči sa pod článkom. Klik sa ukáže hneď, server potom pošle presné počty.
const Thumb = ({ down }: { down?: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className={down ? 'rx__down' : undefined}>
    <path d="M7 10v11H3V10h4zm2 11h8.2a2 2 0 0 0 2-1.6l1.6-7.4A2 2 0 0 0 18.8 9.6H14l.8-4.2a1.6 1.6 0 0 0-2.9-1.2L9 9.5V21z" fill="currentColor" />
  </svg>
);

export function Reactions({ articleId, likes, dislikes, mine }: { articleId: string; likes: number; dislikes: number; mine: -1 | 0 | 1 }) {
  const t = useT();
  const [s, setS] = useState({ likes, dislikes, mine });
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();

  const vote = (v: 1 | -1) => {
    const prev = s;
    // okamžitá odozva
    const off = s.mine === v;
    setS({
      mine: off ? 0 : v,
      likes: s.likes + (v === 1 ? (off ? -1 : 1) : s.mine === 1 ? -1 : 0),
      dislikes: s.dislikes + (v === -1 ? (off ? -1 : 1) : s.mine === -1 ? -1 : 0),
    });
    setErr('');
    start(async () => {
      try {
        const r = await reactAction(articleId, v);
        setS({ likes: r.likes, dislikes: r.dislikes, mine: r.mine });
        if (r.error) setErr(r.error);
      } catch {
        setS(prev);
        setErr(t('Nepodarilo sa uložiť. Skús to znova.'));
      }
    });
  };

  return (
    <div className="rx" role="group" aria-label={t('Hodnotenie článku')}>
      <span className="rx__q">{t('Páčil sa ti článok?')}</span>
      <div className="rx__btns">
        <button type="button" className={`rx__b rx__b--up${s.mine === 1 ? ' is-on' : ''}`} aria-pressed={s.mine === 1} onClick={() => vote(1)} disabled={pending}>
          <Thumb />
          <span className="sr-only">{t('Páči sa mi')}</span>
          <b>{s.likes}</b>
        </button>
        <button type="button" className={`rx__b rx__b--down${s.mine === -1 ? ' is-on' : ''}`} aria-pressed={s.mine === -1} onClick={() => vote(-1)} disabled={pending}>
          <Thumb down />
          <span className="sr-only">{t('Nepáči sa mi')}</span>
          <b>{s.dislikes}</b>
        </button>
      </div>
      {err ? (
        <p className="rx__err" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}
