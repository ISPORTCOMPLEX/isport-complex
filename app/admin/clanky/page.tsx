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
import { getT } from '@/lib/i18n/server';
import { msg } from '@/lib/i18n/translate';

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr('Články') };
}

const TABS = [
  { key: 'vsetky', label: msg('Všetky') },
  { key: 'zverejnene', label: msg('Zverejnené') },
  { key: 'naplanovane', label: msg('Naplánované') },
  { key: 'koncepty', label: msg('Koncepty') },
  { key: 'kos', label: msg('Kôš') },
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
  kos: { ok: true, text: msg('Článok je v koši. Obnoviť ho môžeš v záložke Kôš.') },
  limit: { ok: false, text: msg('Príliš veľa nových článkov za hodinu.') },
};

type Props = { searchParams: Promise<{ tab?: string; q?: string; stav?: string }> };

export default async function ClankyPage({ searchParams }: Props) {
  const tr = await getT();
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
  const notice = sp.stav && NOTICE[sp.stav] ? { ...NOTICE[sp.stav], text: tr(NOTICE[sp.stav].text) } : undefined;

  return (
    <div className="adm__stack">
      <AdmHead title={tr('Články')} sub={tr('Novinky, turnaje, kempy a oznamy na webe.')}>
        <form action={createArticleAction}>
          <button className="btn btn--sm">{tr('+ Nový článok')}</button>
        </form>
      </AdmHead>
      {notice ? <FormAlert error={notice.ok ? undefined : notice.text} success={notice.ok ? notice.text : undefined} /> : null}

      <div className="cms-stats">
        <div className="adm-panel cms-stat">
          <span>{tr('Zverejnené')}</span>
          <b className="cond">{counts[1]}</b>
        </div>
        <div className="adm-panel cms-stat">
          <span>{tr('Naplánované')}</span>
          <b className="cond">{counts[2]}</b>
        </div>
        <div className="adm-panel cms-stat">
          <span>{tr('Koncepty')}</span>
          <b className="cond">{counts[3]}</b>
        </div>
        <div className="adm-panel cms-stat">
          <span>{tr('Zobrazenia za 30 dní')}</span>
          <b className="cond">{(views._sum.views ?? 0).toLocaleString('sk-SK')}</b>
        </div>
      </div>

      <Panel>
        <div className="cms-bar">
          <nav className="cms-tabs" aria-label={tr('Stav článkov')}>
            {TABS.map((t, i) => (
              <Link key={t.key} href={t.key === 'vsetky' ? '/admin/clanky' : `/admin/clanky?tab=${t.key}`} aria-current={tab === t.key ? 'page' : undefined}>
                {tr(t.label)} <small>{counts[i]}</small>
              </Link>
            ))}
          </nav>
          <form className="cms-search" role="search">
            {tab !== 'vsetky' ? <input type="hidden" name="tab" value={tab} /> : null}
            <input type="search" name="q" defaultValue={q} placeholder={tr('Hľadať článok…')} aria-label={tr('Hľadať článok')} className="adm-input" maxLength={80} />
          </form>
        </div>
        {rows.length === 0 ? (
          <Empty>{tab === 'kos' ? tr('Kôš je prázdny.') : tr('Zatiaľ žiadne články. Začni tlačidlom „Nový článok“.')}</Empty>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table cms-table">
              <caption className="sr-only">{tr('Zoznam článkov')}</caption>
              <thead>
                <tr>
                  <th scope="col">{tr('Článok')}</th>
                  <th scope="col">{tr('Kategória')}</th>
                  <th scope="col">{tr('Stav')}</th>
                  <th scope="col">{tr('Zverejnené')}</th>
                  <th scope="col" className="r">
                    {tr('Zobrazenia')}
                  </th>
                  <th scope="col">
                    <span className="sr-only">{tr('Akcie')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const cover = normalizeCover(a.cover);
                  const img = cover ? articleImage(cover, '4:3') : null;
                  const st = a.deletedAt
                    ? { t: tr('V koši'), c: 'muted' }
                    : a.status === 'PUBLISHED'
                      ? { t: tr('Zverejnený'), c: 'ok' }
                      : a.status === 'SCHEDULED'
                        ? { t: tr('Naplánovaný · {v}', { v: a.publishAt ? fmtShortDate(a.publishAt, tr) : '' }), c: 'blue' }
                        : { t: 'Koncept', c: 'muted' };
                  return (
                    <tr key={a.id}>
                      <td>
                        <a href={`/admin/clanky/${a.id}`} className="cms-row">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {img ? <img src={img.thumb} alt="" className="cms-thumb" /> : <span className="cms-thumb cms-thumb--empty" aria-hidden="true" />}
                          <span>
                            <b>
                              {a.title || tr('Bez názvu')}
                              {a.pinned ? <em className="cms-pin"> {' '}{tr('· pripnutý')}</em> : null}
                            </b>
                            <small>/aktuality/{a.slug}</small>
                          </span>
                        </a>
                      </td>
                      <td>{tr(categoryLabel(a.category))}</td>
                      <td>
                        <span className={`chip chip--${st.c}`}>{st.t}</span>
                      </td>
                      <td>{a.publishedAt ? fmtShortDate(a.publishedAt, tr) : '—'}</td>
                      <td className="r">{a.status === 'PUBLISHED' ? a.views.toLocaleString('sk-SK') : '—'}</td>
                      <td className="r">
                        {publish && a.deletedAt ? (
                          <div className="cms-acts">
                            <form action={trashArticleAction}>
                              <input type="hidden" name="id" value={a.id} />
                              <button name="op" value="restore" className="btn btn--sm btn--ghost">
                                {tr('Obnoviť')}
                              </button>
                            </form>
                            <form action={trashArticleAction}>
                              <input type="hidden" name="id" value={a.id} />
                              <button name="op" value="delete" className="btn btn--sm btn--danger">
                                {tr('Zmazať natrvalo')}
                              </button>
                            </form>
                          </div>
                        ) : (
                          <a href={`/admin/clanky/${a.id}`} className="link-red">
                            {tr('Upraviť')}
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
