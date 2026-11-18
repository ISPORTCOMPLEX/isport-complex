'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { commentAction, deleteCommentAction, type CommentState } from '@/lib/actions/articleSocial';
import { useT } from '@/lib/i18n/client';

export type CommentItem = { id: string; name: string; initial: string; body: string; date: string; mine: boolean };

// Diskusia pod článkom: zoznam komentárov (najnovšie hore) a formulár pre prihlásených.
export function Comments({ articleId, slug, items, signedIn, me, canModerate, max }: { articleId: string; slug: string; items: CommentItem[]; signedIn: boolean; me: string; canModerate: boolean; max: number }) {
  const t = useT();
  const router = useRouter();
  const [state, action, sending] = useActionState<CommentState, FormData>(commentAction, {});
  const [text, setText] = useState('');
  const [gone, setGone] = useState<string[]>([]);
  const [ask, setAsk] = useState<string | null>(null);
  const [, start] = useTransition();
  const lastOk = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (state.ok && state.ok !== lastOk.current) {
      lastOk.current = state.ok;
      setText('');
      router.refresh();
    } else if (state.body !== undefined) setText(state.body);
  }, [state, router]);

  const fmt = (iso: string) => new Intl.DateTimeFormat(t.intl, { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' }).format(new Date(iso));
  const list = items.filter((c) => !gone.includes(c.id));
  const next = encodeURIComponent(`/aktuality/${slug}#komentare`);

  const remove = (id: string) => {
    setGone((g) => [...g, id]);
    start(async () => {
      const r = await deleteCommentAction(id).catch(() => ({ ok: false }));
      if (!r.ok) setGone((g) => g.filter((x) => x !== id));
      else router.refresh();
    });
  };

  return (
    <section id="komentare" className="cm" aria-labelledby="cm-t">
      <h2 id="cm-t" className="cm__h">
        {t('Komentáre')} <span>{list.length}</span>
      </h2>

      {signedIn ? (
        <form action={action} className="cm__form">
          <input type="hidden" name="articleId" value={articleId} />
          <span className="cm__av" aria-hidden="true">
            {me.charAt(0).toUpperCase()}
          </span>
          <div className="cm__fx">
            <label htmlFor="cm-body" className="sr-only">
              {t('Tvoj komentár')}
            </label>
            <textarea id="cm-body" name="body" rows={3} maxLength={max} required minLength={2} placeholder={t('Napíš komentár…')} value={text} onChange={(e) => setText(e.target.value)} />
            <div className="cm__bar">
              <span className="cm__as">
                {t('Píšeš ako')} <b>{me}</b>
                <span className="cm__cnt">
                  {' · '}
                  {text.length}/{max}
                </span>
              </span>
              <button type="submit" className="cm__send" disabled={sending || text.trim().length < 2}>
                {sending ? t('Odosielam…') : t('Pridať komentár')}
              </button>
            </div>
            {state.error ? (
              <p className="cm__err" role="alert">
                {state.error}
              </p>
            ) : null}
          </div>
        </form>
      ) : (
        <div className="cm__login">
          <p>{t('Komentovať môžu prihlásení používatelia.')}</p>
          <div>
            <Link href={`/prihlasenie?next=${next}`} className="cm__send">
              {t('Prihlásiť sa')}
            </Link>
            <Link href={`/registracia?next=${next}`} className="cm__ghost">
              {t('Vytvoriť účet')}
            </Link>
          </div>
        </div>
      )}

      {list.length ? (
        <ol className="cm__list">
          {list.map((c) => (
            <li key={c.id} className="cm__it">
              <span className="cm__av" aria-hidden="true">
                {c.initial}
              </span>
              <div className="cm__bd">
                <div className="cm__meta">
                  <b>{c.name}</b>
                  <time dateTime={c.date}>{fmt(c.date)}</time>
                  {c.mine || canModerate ? (
                    ask === c.id ? (
                      <span className="cm__ask">
                        <button type="button" className="cm__del is-yes" onClick={() => remove(c.id)}>
                          {t('Áno, zmazať')}
                        </button>
                        <button type="button" className="cm__del" onClick={() => setAsk(null)}>
                          {t('Nie')}
                        </button>
                      </span>
                    ) : (
                      <button type="button" className="cm__del" onClick={() => setAsk(c.id)}>
                        {t('Zmazať')}
                      </button>
                    )
                  ) : null}
                </div>
                <p className="cm__txt">{c.body}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="cm__empty">{t('Zatiaľ bez komentárov. Buď prvý.')}</p>
      )}
    </section>
  );
}
