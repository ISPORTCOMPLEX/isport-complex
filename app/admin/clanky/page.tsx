import type { Metadata } from 'next';
import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { can, requireStaff } from '@/lib/staff';
import { AdmHead, Empty, Panel } from '@/components/admin/ui';
import { FormAlert } from '@/components/forms/FormAlert';
import { createArticleAction, trashArticleAction } from '@/lib/actions/articles';
import { categoryLabel, normalizeCover } from '@/lib/articles/blocks';
import { articleImage, fmtShortDate } from '@/lib/articles/queries';

export const metadata: Metadata = { title: 'Články' };

const TABS = [
  { key: 'vsetky', label: 'Všetky' },
  { key: 'zverejnene', label: 'Zverejnené' },
  { key: 'naplanovane', label: 'Naplánované' },
  { key: 'koncepty', label: 'Koncepty' },
  { key: 'kos', label: 'Kôš' },
] as const;
type Tab = (typeof TABS)[number]['key'];

function whereFor(tab: Tab): Prisma.ArticleWhereInput {
  switch (tab) {
    case 'zverejnene':
      return { deletedAt: null, status: 'PUBLISHED' };
    case 'naplanovane':
      return { deletedAt: null, status: 'SCHEDULED' };
    case 'koncepty':
      return { deletedAt: null, status: { in: ['DRAFT', 'ARCHIVED'] } };
    case 'kos':
      return { deletedAt: { not: null } };
    default:
      return { deletedAt: null };
  }
}

const NOTICE: Record<string, { ok: boolean; text: string }> = {
  kos: { ok: true, text: 'Článok je v koši. Obnoviť ho môžeš v záložke Kôš.' },
  limit: { ok: false, text: 'Príliš veľa nových článkov za hodinu.' },
};

type Props = { searchParams: Promise<{ tab?: string; q?: string; stav?: string }> };

export default async function ClankyPage({ searchParams }: Props) {
  const me = await requireStaff('articles.write', '/admin/clanky');
  const sp = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as Tab) : 'vsetky';
  const q = (sp.q ?? '').trim().slice(0, 80);
  const publish = can(me.role, 'articles.publish');
  const since = new Date(Date.now() - 30 * 86400000);

  const [counts, rows, views] = await Promise.all([
    Promise.all(TABS.map((t) => prisma.article.count({ where: whereFor(t.key) }))),
    prisma.article.findMany({
      where: { ...whereFor(tab), ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { slug: { contains: q.toLowerCase() } }] } : {}) },
      orderBy: [{ updatedAt: 'desc' }],
      take: 100,
      select: { id: true, slug: true, title: true, category: true, status: true, publishedAt: true, publishAt: true, views: true, cover: true, pinned: true, deletedAt: true, updatedAt: true },
    }),
    prisma.article.aggregate({ where: { deletedAt: null, publishedAt: { gte: since } }, _sum: { views: true } }),
  ]);
  const notice = sp.stav ? NOTICE[sp.stav] : undefined;

  return (
    <div className="adm__stack">
      <AdmHead title="Články" sub="Novinky, turnaje, kempy a oznamy na webe.">
        <form action={createArticleAction}>
          <button className="btn btn--sm">+ Nový článok</button>
        </form>
      </AdmHead>
      {notice ? <FormAlert error={notice.ok ? undefined : notice.text} success={notice.ok ? notice.text : undefined} /> : null}

      <div className="cms-stats">
        <div className="adm-panel cms-stat">
          <span>Zverejnené</span>
          <b className="cond">{counts[1]}</b>
        </div>
        <div className="adm-panel cms-stat">
          <span>Naplánované</span>
          <b className="cond">{counts[2]}</b>
        </div>
        <div className="adm-panel cms-stat">
          <span>Koncepty</span>
          <b className="cond">{counts[3]}</b>
        </div>
        <div className="adm-panel cms-stat">
          <span>Zobrazenia za 30 dní</span>
          <b className="cond">{(views._sum.views ?? 0).toLocaleString('sk-SK')}</b>
        </div>
      </div>

      <Panel>
        <div className="cms-bar">
          <nav className="cms-tabs" aria-label="Stav článkov">
            {TABS.map((t, i) => (
              <Link key={t.key} href={t.key === 'vsetky' ? '/admin/clanky' : `/admin/clanky?tab=${t.key}`} aria-current={tab === t.key ? 'page' : undefined}>
                {t.label} <small>{counts[i]}</small>
              </Link>
            ))}
          </nav>
          <form className="cms-search" role="search">
            {tab !== 'vsetky' ? <input type="hidden" name="tab" value={tab} /> : null}
            <input type="search" name="q" defaultValue={q} placeholder="Hľadať článok…" aria-label="Hľadať článok" className="adm-input" maxLength={80} />
          </form>
        </div>
        {rows.length === 0 ? (
          <Empty>{tab === 'kos' ? 'Kôš je prázdny.' : 'Zatiaľ žiadne články. Začni tlačidlom „Nový článok“.'}</Empty>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table cms-table">
              <caption className="sr-only">Zoznam článkov</caption>
              <thead>
                <tr>
                  <th scope="col">Článok</th>
                  <th scope="col">Kategória</th>
                  <th scope="col">Stav</th>
                  <th scope="col">Zverejnené</th>
                  <th scope="col" className="r">
                    Zobrazenia
                  </th>
                  <th scope="col">
                    <span className="sr-only">Akcie</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const cover = normalizeCover(a.cover);
                  const img = cover ? articleImage(cover, '4:3') : null;
                  const st = a.deletedAt
                    ? { t: 'V koši', c: 'muted' }
                    : a.status === 'PUBLISHED'
                      ? { t: 'Zverejnený', c: 'ok' }
                      : a.status === 'SCHEDULED'
                        ? { t: `Naplánovaný · ${a.publishAt ? fmtShortDate(a.publishAt) : ''}`, c: 'blue' }
                        : { t: 'Koncept', c: 'muted' };
                  return (
                    <tr key={a.id}>
                      <td>
                        <a href={`/admin/clanky/${a.id}`} className="cms-row">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {img ? <img src={img.thumb} alt="" className="cms-thumb" /> : <span className="cms-thumb cms-thumb--empty" aria-hidden="true" />}
                          <span>
                            <b>
                              {a.title || 'Bez názvu'}
                              {a.pinned ? <em className="cms-pin"> · pripnutý</em> : null}
                            </b>
                            <small>/aktuality/{a.slug}</small>
                          </span>
                        </a>
                      </td>
                      <td>{categoryLabel(a.category)}</td>
                      <td>
                        <span className={`chip chip--${st.c}`}>{st.t}</span>
                      </td>
                      <td>{a.publishedAt ? fmtShortDate(a.publishedAt) : '—'}</td>
                      <td className="r">{a.status === 'PUBLISHED' ? a.views.toLocaleString('sk-SK') : '—'}</td>
                      <td className="r">
                        {publish && a.deletedAt ? (
                          <div className="cms-acts">
                            <form action={trashArticleAction}>
                              <input type="hidden" name="id" value={a.id} />
                              <button name="op" value="restore" className="btn btn--sm btn--ghost">
                                Obnoviť
                              </button>
                            </form>
                            <form action={trashArticleAction}>
                              <input type="hidden" name="id" value={a.id} />
                              <button name="op" value="delete" className="btn btn--sm btn--danger">
                                Zmazať natrvalo
                              </button>
                            </form>
                          </div>
                        ) : (
                          <a href={`/admin/clanky/${a.id}`} className="link-red">
                            Upraviť
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
