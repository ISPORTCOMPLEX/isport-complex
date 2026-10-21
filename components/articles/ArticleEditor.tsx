'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CATEGORIES, sanitizeInline, youtubeIdFrom, type Block, type BlockType, type Cover } from '@/lib/articles/blocks';
import {
  listRevisionsAction,
  loadRevisionAction,
  publishArticleAction,
  saveArticleAction,
  trashArticleAction,
  unpublishArticleAction,
  type ArticleDraft,
  type RevisionRow,
} from '@/lib/actions/articles';
import { posterUrl, thumbUrl, uploadMedia, videoUrl } from './upload';

type Props = {
  id: string;
  canPublish: boolean;
  mediaReady: boolean;
  initial: ArticleDraft;
  status: string;
  publishAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

const uid = () => Math.random().toString(36).slice(2, 12);

const NEW: Record<BlockType, () => Block | null> = {
  text: () => ({ id: uid(), type: 'text', html: '' }),
  heading: () => ({ id: uid(), type: 'heading', text: '' }),
  image: () => null, // vytvorí sa po nahratí fotky
  gallery: () => null,
  video: () => null,
  youtube: () => ({ id: uid(), type: 'youtube', youtubeId: '', caption: '' }),
  quote: () => ({ id: uid(), type: 'quote', text: '', author: '' }),
  button: () => ({ id: uid(), type: 'button', label: 'Rezervovať ľad', href: '/rezervacia' }),
  divider: () => ({ id: uid(), type: 'divider' }),
};

const STATUS: Record<string, { t: string; c: string }> = {
  DRAFT: { t: 'Koncept', c: 'muted' },
  SCHEDULED: { t: 'Naplánovaný', c: 'blue' },
  PUBLISHED: { t: 'Zverejnený', c: 'ok' },
  ARCHIVED: { t: 'Stiahnutý', c: 'muted' },
};

const fmt = (iso: string) => new Date(iso).toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export function ArticleEditor({ id, canPublish, mediaReady, initial, status: status0, publishAt: publishAt0, publishedAt, updatedAt }: Props) {
  const [d, setD] = useState<ArticleDraft>(initial);
  const [status, setStatus] = useState(status0);
  const [publishAt, setPublishAt] = useState<string | null>(publishAt0);
  const [save, setSave] = useState<{ state: 'saved' | 'dirty' | 'saving' | 'error'; at: string; msg?: string }>({ state: 'saved', at: updatedAt });
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [when, setWhen] = useState('');
  const [revs, setRevs] = useState<RevisionRow[] | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const dirty = useRef(false);
  const latest = useRef(d);
  latest.current = d;

  const update = useCallback((patch: Partial<ArticleDraft>) => {
    dirty.current = true;
    setD((cur) => ({ ...cur, ...patch }));
    setSave((s) => ({ ...s, state: 'dirty' }));
  }, []);
  const setBlocks = (fn: (b: Block[]) => Block[]) => update({ blocks: fn(latest.current.blocks) });
  const patchBlock = (bid: string, patch: Partial<Block>) => setBlocks((bs) => bs.map((b) => (b.id === bid ? ({ ...b, ...patch } as Block) : b)));

  const doSave = useCallback(
    async (reason: 'autosave' | 'save') => {
      if (reason === 'autosave' && !dirty.current) return true;
      dirty.current = false;
      setSave((s) => ({ ...s, state: 'saving' }));
      try {
        const r = await saveArticleAction(id, latest.current, reason);
        if (!r.ok) {
          dirty.current = true;
          setSave((s) => ({ ...s, state: 'error', msg: r.error }));
          return false;
        }
        if (r.slug !== latest.current.slug) setD((cur) => ({ ...cur, slug: r.slug }));
        setSave((s) => (dirty.current ? { ...s, state: 'dirty' } : { state: 'saved', at: r.savedAt }));
        return true;
      } catch {
        dirty.current = true;
        setSave((s) => ({ ...s, state: 'error', msg: 'Uloženie zlyhalo – skontroluj internet.' }));
        return false;
      }
    },
    [id],
  );

  // automatické ukladanie 2,5 s po poslednej zmene
  useEffect(() => {
    if (save.state !== 'dirty') return;
    const t = window.setTimeout(() => void doSave('autosave'), 2500);
    return () => window.clearTimeout(t);
  }, [d, save.state, doSave]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 5000);
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('beforeunload', warn);
    };
  }, []);

  const ago = Math.max(0, Math.round((now - new Date(save.at).getTime()) / 1000));
  const saveLabel =
    save.state === 'saving' ? 'Ukladám…' : save.state === 'dirty' ? 'Neuložené zmeny' : save.state === 'error' ? save.msg ?? 'Chyba ukladania' : ago < 60 ? `Uložené pred ${Math.max(1, ago)} s` : `Uložené ${fmt(save.at)}`;

  async function publish(at: string | null) {
    setBusy('publish');
    setNotice(null);
    const okSave = await doSave('save');
    if (!okSave) {
      setBusy(null);
      return;
    }
    const r = await publishArticleAction(id, at ? new Date(at).toISOString() : null);
    setBusy(null);
    if (!r.ok) return setNotice({ ok: false, text: r.error });
    setStatus(r.status);
    setPublishAt(r.status === 'SCHEDULED' && at ? new Date(at).toISOString() : null);
    setNotice({ ok: true, text: r.status === 'SCHEDULED' ? 'Článok je naplánovaný.' : 'Článok je zverejnený na webe.' });
  }

  async function unpublish() {
    setBusy('unpublish');
    const r = await unpublishArticleAction(id);
    setBusy(null);
    if (!r.ok) return setNotice({ ok: false, text: r.error });
    setStatus('DRAFT');
    setPublishAt(null);
    setNotice({ ok: true, text: 'Článok je stiahnutý z webu a je znova koncept.' });
  }

  async function openRevisions() {
    setRevs(await listRevisionsAction(id));
  }

  async function restore(revId: string) {
    const r = await loadRevisionAction(revId);
    if (!r) return;
    update({ title: r.title, perex: r.perex, blocks: r.blocks, cover: r.cover });
    setRevs(null);
    setNotice({ ok: true, text: 'Verzia je obnovená v editore. Uloží sa automaticky.' });
  }

  const st = STATUS[status] ?? STATUS.DRAFT;
  const previewHref = `/aktuality/${d.slug}${status === 'PUBLISHED' ? '' : '?nahlad=1'}`;

  return (
    <div className="ed">
      <div className="ed__bar">
        <div className="ed__bar-l">
          <a href="/admin/clanky" className="ed__back">
            ← Články
          </a>
          <span className={`chip chip--${st.c}`}>
            {st.t}
            {status === 'SCHEDULED' && publishAt ? ` · ${fmt(publishAt)}` : ''}
          </span>
          <span className={`ed__saved ed__saved--${save.state}`} aria-live="polite">
            <i aria-hidden="true" />
            {saveLabel}
          </span>
        </div>
        <div className="ed__bar-r">
          <a href={previewHref} target="_blank" rel="noopener" className="btn btn--sm btn--ghost">
            Náhľad<span className="sr-only"> (otvorí sa v novom okne)</span>
          </a>
          <button type="button" className="btn btn--sm btn--ghost" onClick={openRevisions}>
            História verzií
          </button>
          <button type="button" className="btn btn--sm btn--ghost" onClick={() => void doSave('save')} disabled={save.state === 'saving'}>
            Uložiť
          </button>
          {canPublish ? (
            <button type="button" className="btn btn--sm" onClick={() => void publish(null)} disabled={busy !== null}>
              {status === 'PUBLISHED' ? 'Aktualizovať na webe' : 'Zverejniť'}
            </button>
          ) : null}
        </div>
      </div>
      {notice ? (
        <div className={`alert ${notice.ok ? 'alert--ok' : 'alert--error'} ed__notice`} role={notice.ok ? 'status' : 'alert'}>
          {notice.text}
        </div>
      ) : null}
      {!mediaReady ? <div className="alert alert--error ed__notice">Úložisko fotiek (Cloudinary) nie je nastavené – fotky a videá sa zatiaľ nedajú nahrať.</div> : null}

      <div className="ed__grid">
        <div className="ed__canvas">
          <label className="sr-only" htmlFor="ed-title">
            Nadpis článku
          </label>
          <textarea id="ed-title" className="ed__title" rows={1} value={d.title} maxLength={160} placeholder="Nadpis článku" onChange={(e) => update({ title: e.target.value })} />
          <label className="sr-only" htmlFor="ed-perex">
            Perex
          </label>
          <textarea id="ed-perex" className="ed__perex" rows={2} value={d.perex} maxLength={400} placeholder="Perex – krátke zhrnutie, zobrazí sa aj v zozname a pri zdieľaní." onChange={(e) => update({ perex: e.target.value })} />

          <div className="ed__blocks">
            {d.blocks.map((b, i) => (
              <BlockEditor
                key={b.id}
                block={b}
                first={i === 0}
                last={i === d.blocks.length - 1}
                onChange={(patch) => patchBlock(b.id, patch)}
                onMove={(dir) =>
                  setBlocks((bs) => {
                    const j = i + dir;
                    if (j < 0 || j >= bs.length) return bs;
                    const next = [...bs];
                    [next[i], next[j]] = [next[j], next[i]];
                    return next;
                  })
                }
                onRemove={() => setBlocks((bs) => bs.filter((x) => x.id !== b.id))}
              />
            ))}
          </div>
          <AddBlock
            mediaReady={mediaReady}
            onAdd={(b) => setBlocks((bs) => [...bs, b])}
            onError={(t) => setNotice({ ok: false, text: t })}
          />
        </div>

        <aside className="ed__side">
          <section className="ed__box">
            <h2>Zverejnenie</h2>
            {publishedAt && status === 'PUBLISHED' ? <p className="ed__muted">Zverejnené {fmt(publishedAt)}</p> : null}
            {canPublish ? (
              <>
                <label className="ed__lbl" htmlFor="ed-when">
                  Naplánovať na
                </label>
                <div className="ed__row">
                  <input id="ed-when" type="datetime-local" className="adm-input" value={when} min={localInput(new Date())} onChange={(e) => setWhen(e.target.value)} />
                  <button type="button" className="btn btn--sm btn--ghost" disabled={!when || busy !== null} onClick={() => void publish(when)}>
                    Naplánovať
                  </button>
                </div>
                {status !== 'DRAFT' ? (
                  <button type="button" className="ed__link" onClick={() => void unpublish()} disabled={busy !== null}>
                    Stiahnuť z webu
                  </button>
                ) : null}
                <label className="ed__switch">
                  <input type="checkbox" role="switch" className="rz-switch" checked={d.pinned} onChange={(e) => update({ pinned: e.target.checked })} />
                  <span>Pripnúť na úvod webu</span>
                </label>
              </>
            ) : (
              <p className="ed__muted">Zverejniť článok môže administrátor. Tvoje zmeny sa ukladajú automaticky.</p>
            )}
          </section>

          <section className="ed__box">
            <h2>Titulná fotka</h2>
            <CoverPicker cover={d.cover} mediaReady={mediaReady} onChange={(cover) => update({ cover })} onError={(t) => setNotice({ ok: false, text: t })} />
          </section>

          <section className="ed__box">
            <h2>Kategória a štítky</h2>
            <label className="ed__lbl" htmlFor="ed-cat">
              Kategória
            </label>
            <select id="ed-cat" className="adm-select ed__full" value={d.category} onChange={(e) => update({ category: e.target.value })}>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <label className="ed__lbl" htmlFor="ed-tags">
              Štítky (oddelené čiarkou)
            </label>
            <input
              id="ed-tags"
              className="adm-input ed__full"
              defaultValue={d.tags.join(', ')}
              maxLength={300}
              placeholder="hokej, nábor, turnaj"
              onBlur={(e) =>
                update({
                  tags: e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
            />
            <label className="ed__lbl" htmlFor="ed-author">
              Autor
            </label>
            <input id="ed-author" className="adm-input ed__full" value={d.authorName} maxLength={80} onChange={(e) => update({ authorName: e.target.value })} />
          </section>

          <section className="ed__box">
            <h2>Google a zdieľanie</h2>
            <div className="ed__gp" aria-hidden="true">
              <small>isport-complex › aktuality › {d.slug}</small>
              <b>{(d.seoTitle || d.title || 'Nadpis článku') + ' – I-SPORT COMPLEX'}</b>
              <p>{d.seoDescription || d.perex || 'Perex článku sa zobrazí tu, ak nenapíšeš vlastný popis.'}</p>
            </div>
            <label className="ed__lbl" htmlFor="ed-slug">
              Adresa článku
            </label>
            <div className="ed__slug">
              <span>/aktuality/</span>
              <input id="ed-slug" className="adm-input" value={d.slug} maxLength={80} onChange={(e) => update({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} />
            </div>
            <label className="ed__lbl" htmlFor="ed-seot">
              Nadpis pre Google (nepovinné)
            </label>
            <input id="ed-seot" className="adm-input ed__full" value={d.seoTitle} maxLength={70} onChange={(e) => update({ seoTitle: e.target.value })} />
            <label className="ed__lbl" htmlFor="ed-seod">
              Popis pre Google (nepovinné)
            </label>
            <textarea id="ed-seod" className="textarea ed__full ed__ta" value={d.seoDescription} maxLength={170} onChange={(e) => update({ seoDescription: e.target.value })} />
          </section>

          {canPublish ? (
            <form action={trashArticleAction} className="ed__trash">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="op" value="trash" />
              <button className="ed__link ed__link--red">Presunúť do koša</button>
            </form>
          ) : null}
        </aside>
      </div>

      {revs ? (
        <div className="ed__modal" role="dialog" aria-modal="true" aria-labelledby="ed-rev-t">
          <div className="ed__modal-in">
            <div className="ed__modal-h">
              <h2 id="ed-rev-t">História verzií</h2>
              <button type="button" className="btn btn--sm btn--ghost" onClick={() => setRevs(null)}>
                Zavrieť
              </button>
            </div>
            {revs.length === 0 ? (
              <p className="ed__muted">Zatiaľ žiadne uložené verzie.</p>
            ) : (
              <ul className="ed__revs">
                {revs.map((r) => (
                  <li key={r.id}>
                    <span>
                      <b>{fmt(r.createdAt)}</b>
                      <small>
                        {{ autosave: 'automaticky uložené', save: 'uložené', publish: 'zverejnené', restore: 'obnovené' }[r.reason] ?? r.reason} · {r.title || 'Bez názvu'}
                      </small>
                    </span>
                    <button type="button" className="btn btn--sm btn--ghost" onClick={() => void restore(r.id)}>
                      Obnoviť
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ───────────── Jeden blok ─────────────
function BlockEditor({ block, first, last, onChange, onMove, onRemove }: { block: Block; first: boolean; last: boolean; onChange: (p: Partial<Block>) => void; onMove: (dir: -1 | 1) => void; onRemove: () => void }) {
  return (
    <div className={`ed__block ed__block--${block.type}`}>
      <div className="ed__tools" role="group" aria-label="Blok">
        <button type="button" onClick={() => onMove(-1)} disabled={first} aria-label="Posunúť vyššie">
          ↑
        </button>
        <button type="button" onClick={() => onMove(1)} disabled={last} aria-label="Posunúť nižšie">
          ↓
        </button>
        <button type="button" onClick={onRemove} aria-label="Odstrániť blok" className="ed__tools-del">
          ✕
        </button>
      </div>
      {block.type === 'text' ? <RichText html={block.html} onChange={(html) => onChange({ html })} /> : null}
      {block.type === 'heading' ? (
        <input className="ed__h2" value={block.text} placeholder="Medzititulok" maxLength={300} aria-label="Medzititulok" onChange={(e) => onChange({ text: e.target.value })} />
      ) : null}
      {block.type === 'image' ? (
        <figure className="ed__fig">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumbUrl(block.img, 1200)} alt="" />
          <input className="adm-input" value={block.alt} placeholder="Čo je na fotke (pre nevidiacich a Google)" maxLength={200} aria-label="Popis obsahu fotky" onChange={(e) => onChange({ alt: e.target.value })} />
          <input className="adm-input" value={block.caption} placeholder="Popis pod fotkou (nepovinné)" maxLength={300} aria-label="Popis pod fotkou" onChange={(e) => onChange({ caption: e.target.value })} />
        </figure>
      ) : null}
      {block.type === 'gallery' ? <GalleryEditor block={block} onChange={onChange} /> : null}
      {block.type === 'video' ? (
        <figure className="ed__fig">
          <video src={videoUrl(block.video)} poster={posterUrl(block.video)} controls preload="metadata" className="ed__video" />
          <input className="adm-input" value={block.caption} placeholder="Popis videa (nepovinné)" maxLength={300} aria-label="Popis videa" onChange={(e) => onChange({ caption: e.target.value })} />
        </figure>
      ) : null}
      {block.type === 'youtube' ? (
        <div className="ed__fig">
          <input
            className="adm-input"
            defaultValue={block.youtubeId ? `https://youtu.be/${block.youtubeId}` : ''}
            placeholder="Odkaz na video z YouTube"
            aria-label="Odkaz na YouTube"
            onBlur={(e) => onChange({ youtubeId: youtubeIdFrom(e.target.value) ?? '' })}
          />
          {block.youtubeId ? <div className="ed__yt">YouTube · {block.youtubeId} – na webe sa prehrá po kliknutí</div> : <small className="ed__muted">Vlož odkaz typu youtube.com/watch?v=… alebo youtu.be/…</small>}
          <input className="adm-input" value={block.caption} placeholder="Popis videa (nepovinné)" maxLength={300} aria-label="Popis videa" onChange={(e) => onChange({ caption: e.target.value })} />
        </div>
      ) : null}
      {block.type === 'quote' ? (
        <div className="ed__quote">
          <textarea value={block.text} placeholder="Citát" rows={2} maxLength={1000} aria-label="Citát" onChange={(e) => onChange({ text: e.target.value })} />
          <input className="adm-input" value={block.author} placeholder="Meno, funkcia" maxLength={160} aria-label="Autor citátu" onChange={(e) => onChange({ author: e.target.value })} />
        </div>
      ) : null}
      {block.type === 'button' ? (
        <div className="ed__btnb">
          <span className="ed__btnprev">{block.label || 'Tlačidlo'} →</span>
          <input className="adm-input" value={block.label} placeholder="Text tlačidla" maxLength={80} aria-label="Text tlačidla" onChange={(e) => onChange({ label: e.target.value })} />
          <input className="adm-input" value={block.href} placeholder="/rezervacia alebo https://…" maxLength={500} aria-label="Adresa tlačidla" onChange={(e) => onChange({ href: e.target.value })} />
        </div>
      ) : null}
      {block.type === 'divider' ? <hr className="ed__hr" /> : null}
    </div>
  );
}

// Text s formátovaním. Obsah sa nastaví len raz (inak by kurzor skákal); zmeny idú von cez onInput.
function RichText({ html, onChange }: { html: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  // počiatočný obsah sa vloží len raz – React ho potom už neprepisuje (kurzor neskáče)
  const [init] = useState(html);
  const cmd = (c: string, v?: string) => {
    ref.current?.focus();
    document.execCommand(c, false, v);
    onChange(ref.current?.innerHTML ?? '');
  };
  const link = () => {
    const url = window.prompt('Adresa odkazu (https://… alebo /stranka)');
    if (url) cmd('createLink', url.trim());
  };
  return (
    <div className="ed__rt">
      <div className="ed__fmt" role="toolbar" aria-label="Formátovanie textu">
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('bold')} aria-label="Tučné">
          <b>B</b>
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('italic')} aria-label="Kurzíva">
          <i>I</i>
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={link} aria-label="Odkaz">
          Odkaz
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('insertUnorderedList')} aria-label="Zoznam">
          • Zoznam
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('removeFormat')} aria-label="Zrušiť formátovanie">
          Tx
        </button>
      </div>
      <div
        ref={ref}
        className="ed__text"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Text odstavca"
        data-placeholder="Píš text článku…"
        dangerouslySetInnerHTML={{ __html: sanitizeInline(init) }}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        onPaste={(e) => {
          // vloženie z Wordu/webu len ako čistý text – žiadne cudzie štýly
          e.preventDefault();
          document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
        }}
      />
    </div>
  );
}

function GalleryEditor({ block, onChange }: { block: Extract<Block, { type: 'gallery' }>; onChange: (p: Partial<Block>) => void }) {
  const [up, setUp] = useState<string | null>(null);
  async function add(files: File[]) {
    let images = [...block.images];
    for (const [i, f] of files.entries()) {
      setUp(`Nahrávam ${i + 1} z ${files.length}…`);
      try {
        const r = await uploadMedia('image', f);
        images = [...images, { publicId: r.publicId, version: r.version, width: r.width, height: r.height, alt: '' }];
        onChange({ images } as Partial<Block>);
      } catch (err) {
        setUp(err instanceof Error ? err.message : 'Nahrávanie zlyhalo.');
        return;
      }
    }
    setUp(null);
  }
  return (
    <div className="ed__gal">
      <div className="ed__galgrid">
        {block.images.map((im, i) => (
          <div key={im.publicId} className="ed__galit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbUrl(im, 480)} alt="" />
            <button type="button" aria-label={`Odstrániť fotku ${i + 1}`} onClick={() => onChange({ images: block.images.filter((x) => x.publicId !== im.publicId) } as Partial<Block>)}>
              ✕
            </button>
          </div>
        ))}
        <label className="ed__galadd">
          <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => void add(Array.from(e.target.files ?? []))} />+ Pridať fotky
        </label>
      </div>
      {up ? <small className="ed__muted">{up}</small> : null}
      <input className="adm-input" value={block.caption} placeholder="Popis galérie (nepovinné)" maxLength={300} aria-label="Popis galérie" onChange={(e) => onChange({ caption: e.target.value })} />
    </div>
  );
}

function CoverPicker({ cover, mediaReady, onChange, onError }: { cover: Cover | null; mediaReady: boolean; onChange: (c: Cover | null) => void; onError: (t: string) => void }) {
  const [p, setP] = useState<number | null>(null);
  async function pick(f: File | undefined) {
    if (!f) return;
    try {
      setP(0);
      const r = await uploadMedia('image', f, setP);
      onChange({ publicId: r.publicId, version: r.version, width: r.width, height: r.height, alt: cover?.alt ?? '', caption: cover?.caption ?? '' });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Nahrávanie zlyhalo.');
    } finally {
      setP(null);
    }
  }
  return (
    <div className="ed__cover">
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbUrl(cover, 800)} alt="" />
      ) : (
        <div className="ed__cover-empty">Bez titulnej fotky</div>
      )}
      {p !== null ? <div className="ed__prog">Nahrávam {Math.round(p * 100)} %</div> : null}
      <div className="ed__row">
        <label className={`btn btn--sm btn--ghost${mediaReady ? '' : ' is-off'}`}>
          <input type="file" accept="image/*" className="sr-only" disabled={!mediaReady} onChange={(e) => void pick(e.target.files?.[0])} />
          {cover ? 'Zmeniť' : 'Nahrať fotku'}
        </label>
        {cover ? (
          <button type="button" className="ed__link ed__link--red" onClick={() => onChange(null)}>
            Odstrániť
          </button>
        ) : null}
      </div>
      {cover ? (
        <>
          <input className="adm-input ed__full" value={cover.alt} placeholder="Čo je na fotke" maxLength={200} aria-label="Popis obsahu titulnej fotky" onChange={(e) => onChange({ ...cover, alt: e.target.value })} />
          <input className="adm-input ed__full" value={cover.caption} placeholder="Popis pod fotkou · Foto: autor" maxLength={300} aria-label="Popis pod titulnou fotkou" onChange={(e) => onChange({ ...cover, caption: e.target.value })} />
        </>
      ) : null}
    </div>
  );
}

// ───────────── Pridanie bloku ─────────────
function AddBlock({ mediaReady, onAdd, onError }: { mediaReady: boolean; onAdd: (b: Block) => void; onError: (t: string) => void }) {
  const [up, setUp] = useState<string | null>(null);
  async function upload(kind: 'image' | 'gallery' | 'video', files: File[]) {
    if (!files.length) return;
    try {
      if (kind === 'video') {
        setUp('Nahrávam video 0 %');
        const r = await uploadMedia('video', files[0], (p) => setUp(`Nahrávam video ${Math.round(p * 100)} %`));
        onAdd({ id: uid(), type: 'video', source: 'upload', video: { publicId: r.publicId, version: r.version, width: r.width, height: r.height, duration: r.duration }, caption: '' });
      } else if (kind === 'image') {
        setUp('Nahrávam fotku…');
        const r = await uploadMedia('image', files[0], (p) => setUp(`Nahrávam fotku ${Math.round(p * 100)} %`));
        onAdd({ id: uid(), type: 'image', img: { publicId: r.publicId, version: r.version, width: r.width, height: r.height }, alt: '', caption: '' });
      } else {
        const images: (Extract<Block, { type: 'gallery' }>['images'][number])[] = [];
        for (const [i, f] of files.entries()) {
          setUp(`Nahrávam ${i + 1} z ${files.length}…`);
          const r = await uploadMedia('image', f);
          images.push({ publicId: r.publicId, version: r.version, width: r.width, height: r.height, alt: '' });
        }
        onAdd({ id: uid(), type: 'gallery', images, caption: '' });
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Nahrávanie zlyhalo.');
    } finally {
      setUp(null);
    }
  }
  const simple = (t: BlockType) => {
    const b = NEW[t]();
    if (b) onAdd(b);
  };
  return (
    <div className="ed__add">
      <b>+ Pridať blok</b>
      <button type="button" onClick={() => simple('text')}>
        ¶ Text
      </button>
      <button type="button" onClick={() => simple('heading')}>
        H Medzititulok
      </button>
      <label className={mediaReady ? '' : 'is-off'}>
        <input type="file" accept="image/*" className="sr-only" disabled={!mediaReady || up !== null} onChange={(e) => void upload('image', Array.from(e.target.files ?? []))} />▣ Fotka
      </label>
      <label className={mediaReady ? '' : 'is-off'}>
        <input type="file" accept="image/*" multiple className="sr-only" disabled={!mediaReady || up !== null} onChange={(e) => void upload('gallery', Array.from(e.target.files ?? []))} />▦ Galéria
      </label>
      <label className={mediaReady ? '' : 'is-off'}>
        <input type="file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v" className="sr-only" disabled={!mediaReady || up !== null} onChange={(e) => void upload('video', Array.from(e.target.files ?? []))} />▶ Video
      </label>
      <button type="button" onClick={() => simple('youtube')}>
        ▶ YouTube
      </button>
      <button type="button" onClick={() => simple('quote')}>
        ❝ Citát
      </button>
      <button type="button" onClick={() => simple('button')}>
        ⬭ Tlačidlo
      </button>
      <button type="button" onClick={() => simple('divider')}>
        — Oddeľovač
      </button>
      {up ? (
        <span className="ed__up" aria-live="polite">
          {up}
        </span>
      ) : null}
    </div>
  );
}
