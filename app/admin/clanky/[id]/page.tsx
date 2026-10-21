import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { can, requireStaff } from '@/lib/staff';
import { cloudName } from '@/lib/cloudinary';
import { normalizeBlocks, normalizeCover } from '@/lib/articles/blocks';
import { ArticleEditor } from '@/components/articles/ArticleEditor';

export const metadata: Metadata = { title: 'Úprava článku' };

type Props = { params: Promise<{ id: string }> };

export default async function EditArticlePage({ params }: Props) {
  const { id } = await params;
  const me = await requireStaff('articles.write', `/admin/clanky/${id}`);
  if (!/^[a-z0-9]{10,40}$/i.test(id)) notFound();
  const a = await prisma.article.findUnique({ where: { id } });
  if (!a || a.deletedAt) notFound();
  return (
    <ArticleEditor
      id={a.id}
      canPublish={can(me.role, 'articles.publish')}
      mediaReady={cloudName() !== null}
      initial={{
        title: a.title,
        perex: a.perex,
        category: a.category,
        tags: a.tags,
        slug: a.slug,
        cover: normalizeCover(a.cover),
        blocks: normalizeBlocks(a.body),
        seoTitle: a.seoTitle ?? '',
        seoDescription: a.seoDescription ?? '',
        pinned: a.pinned,
        authorName: a.authorName,
      }}
      status={a.status}
      publishAt={a.publishAt?.toISOString() ?? null}
      publishedAt={a.publishedAt?.toISOString() ?? null}
      updatedAt={a.updatedAt.toISOString()}
    />
  );
}
