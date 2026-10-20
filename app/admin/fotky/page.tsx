import type { Metadata } from 'next';
import { requireStaff } from '@/lib/staff';
import { prisma } from '@/lib/prisma';
import { cloudinaryConfig } from '@/lib/cloudinary';
import { SLOTS, toWebPhoto } from '@/lib/media';
import { deletePhotoAction, updatePhotoAction } from '@/lib/actions/media';
import { AdmHead, Empty, Panel } from '@/components/admin/ui';
import { MediaUploader } from '@/components/admin/MediaUploader';

export const metadata: Metadata = { title: 'Fotky' };

const kb = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.round(b / 1024)} kB`);

export default async function FotkyPage() {
  await requireStaff('media.manage');
  const ready = Boolean(cloudinaryConfig());
  const rows = await prisma.photo.findMany({ orderBy: [{ slot: 'asc' }, { sort: 'asc' }, { createdAt: 'asc' }] });
  const total = rows.reduce((a, r) => a + r.bytes, 0);

  return (
    <div className="adm__stack">
      <AdmHead title="Fotky" sub={`${rows.length} fotiek · ${kb(total)} v Cloudinary · databáza ukladá len odkazy`} />

      {!ready ? (
        <Panel title="Cloudinary ešte nie je pripojené">
          <p className="adm-note">
            Na Verceli doplň premenné <code>CLOUDINARY_CLOUD_NAME</code>, <code>CLOUDINARY_API_KEY</code> a <code>CLOUDINARY_API_SECRET</code> (Cloudinary → Settings → API Keys) a sprav Redeploy. Potom tu pôjde nahrávať.
          </p>
        </Panel>
      ) : null}

      {SLOTS.map((slot) => {
        const list = rows.filter((r) => r.slot === slot.key);
        return (
          <Panel key={slot.key} title={`${slot.label} (${list.length})`}>
            <p className="adm-note muted">Zobrazí sa: {slot.where}. Prvá fotka je hlavná, ďalšie idú do galérie.</p>
            {ready ? <MediaUploader slot={slot.key} label={slot.label} /> : null}
            {list.length === 0 ? (
              <Empty>Zatiaľ bez fotiek – na webe je sivý zástupca.</Empty>
            ) : (
              <ul className="md-grid">
                {list.map((r, i) => {
                  const w = toWebPhoto(r, '4:3');
                  return (
                    <li key={r.id} className="md-item">
                      <div className="md-thumb">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {w ? <img src={w.src.replace('w_1200', 'w_480')} alt={r.alt} loading="lazy" /> : null}
                        {i === 0 ? <span className="md-badge">Hlavná</span> : null}
                      </div>
                      <form action={updatePhotoAction} className="md-alt">
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="op" value="alt" />
                        <label className="sr-only" htmlFor={`alt-${r.id}`}>
                          Popis fotky
                        </label>
                        <input id={`alt-${r.id}`} name="alt" defaultValue={r.alt} maxLength={200} placeholder="Popis (čo je na fotke)" className="adm-input" />
                        <button type="submit" className="btn btn--sm btn--ghost">
                          Uložiť
                        </button>
                      </form>
                      <div className="md-meta">
                        <span>
                          {r.width}×{r.height} · {kb(r.bytes)}
                        </span>
                        <div className="md-actions">
                          {i > 0 ? (
                            <form action={updatePhotoAction}>
                              <input type="hidden" name="id" value={r.id} />
                              <button name="op" value="first" className="md-btn" title="Nastaviť ako hlavnú">
                                ★
                              </button>
                              <button name="op" value="up" className="md-btn" aria-label="Posunúť dopredu">
                                ←
                              </button>
                            </form>
                          ) : null}
                          {i < list.length - 1 ? (
                            <form action={updatePhotoAction}>
                              <input type="hidden" name="id" value={r.id} />
                              <button name="op" value="down" className="md-btn" aria-label="Posunúť dozadu">
                                →
                              </button>
                            </form>
                          ) : null}
                          <details className="md-del">
                            <summary className="md-btn md-btn--red">Zmazať</summary>
                            <form action={deletePhotoAction}>
                              <input type="hidden" name="id" value={r.id} />
                              <button type="submit" className="btn btn--sm btn--danger">
                                Naozaj zmazať
                              </button>
                            </form>
                          </details>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        );
      })}
    </div>
  );
}
