import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { getPosts } from '../../lib/posts';
import { TIPOS } from '../../consts';

const host = () => new URL(import.meta.env.SITE).host;

// As imagens só são geradas no CI (o GitHub Actions define CI=true), porque o satori + resvg
// deixam o build local bem mais lento. Para gerar na sua máquina: OG_IMAGENS=1 npm run build
const gerarImagens = process.env.CI === 'true' || process.env.OG_IMAGENS === '1';

export const getStaticPaths = (async () => {
  if (!gerarImagens) return [];
  const posts = await getPosts();
  const repos = await getCollection('repositorios');
  return [
    ...posts.map((p) => ({ params: { slug: p.id }, props: { titulo: p.data.titulo, rotulo: TIPOS[p.data.tipo] } })),
    // /og/repositorios/<dono>/<repo>.png
    ...repos.map((r) => ({ params: { slug: `repositorios/${r.id}` }, props: { titulo: r.data.nome, rotulo: 'Repositório' } })),
    { params: { slug: 'site' }, props: { titulo: 'Tecnologia, open source e segurança, em português', rotulo: undefined } },
  ];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  // Import dinâmico: sem as imagens, o satori, o resvg e as fontes nem chegam a carregar
  const { imagemOg } = await import('../../lib/og');
  const png = await imagemOg({ titulo: props.titulo, rotulo: props.rotulo, rodape: host() });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
