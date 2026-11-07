import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

/** Posts publicados, do mais novo para o mais antigo. Rascunhos só aparecem no `npm run dev`. */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.rascunho);
  return posts.sort((a, b) => b.data.data.valueOf() - a.data.data.valueOf());
}

export function slugTag(tag: string): string {
  return tag
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function todasAsTags(posts: Post[]): { tag: string; slug: string; total: number }[] {
  const mapa = new Map<string, { tag: string; total: number }>();
  for (const p of posts)
    for (const t of p.data.tags) {
      const s = slugTag(t);
      const atual = mapa.get(s);
      mapa.set(s, { tag: atual?.tag ?? t, total: (atual?.total ?? 0) + 1 });
    }
  return [...mapa.entries()]
    .map(([slug, v]) => ({ slug, ...v }))
    .sort((a, b) => b.total - a.total || a.tag.localeCompare(b.tag, 'pt-BR'));
}

export function formataData(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
