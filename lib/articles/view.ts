import 'server-only';
import { getSessionUser } from '@/lib/session';
import { can } from '@/lib/staff';
import { articleBySlug } from './queries';

// Článok pre verejnú stránku. S ?nahlad=1 a prihláseným redaktorom aj koncept / naplánovaný.
export async function loadArticle(slug: string, preview: boolean) {
  if (preview) {
    const me = await getSessionUser();
    if (me && can(me.role, 'articles.write')) {
      const a = await articleBySlug(slug, true);
      if (a) return { a, preview: true };
    }
  }
  try {
    const a = await articleBySlug(slug, false);
    return a ? { a, preview: false } : null;
  } catch {
    return null;
  }
}
