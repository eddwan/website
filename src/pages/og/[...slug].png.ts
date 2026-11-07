import type { APIRoute, GetStaticPaths } from 'astro';
import { getPosts } from '../../lib/posts';
import { imagemOg } from '../../lib/og';
import { TIPOS } from '../../consts';

const host = () => new URL(import.meta.env.SITE).host;

export const getStaticPaths = (async () => {
  const posts = await getPosts();
  return [
    ...posts.map((p) => ({ params: { slug: p.id }, props: { titulo: p.data.titulo, rotulo: TIPOS[p.data.tipo] } })),
    { params: { slug: 'site' }, props: { titulo: 'Tecnologia, open source e segurança, em português', rotulo: undefined } },
  ];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await imagemOg({ titulo: props.titulo, rotulo: props.rotulo, rodape: host() });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
