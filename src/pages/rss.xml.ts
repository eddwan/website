import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPosts } from '../lib/posts';
import { SITE } from '../consts';

export async function GET(context: APIContext) {
  const posts = await getPosts();
  return rss({
    trailingSlash: false,
    title: SITE.titulo,
    description: SITE.descricao,
    site: context.site!,
    customData: '<language>pt-BR</language>',
    items: posts.map((p) => ({
      title: p.data.titulo,
      description: p.data.descricao,
      pubDate: p.data.data,
      link: `/blog/${p.id}`,
      categories: p.data.tags,
    })),
  });
}
