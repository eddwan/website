// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Domínio confirmado pelo Eddwan em 07/11/2026: eddwan.com (SITE_URL sobrescreve).
// Dá para trocar sem mexer no código: SITE_URL=https://outro.dominio npm run build
const site = process.env.SITE_URL ?? 'https://eddwan.com';

export default defineConfig({
  site,
  // URLs sem barra no fim (/sobre), iguais aos links do site; o Cloudflare serve dist/sobre/index.html nelas
  trailingSlash: 'never',
  // Fora do sitemap (e com noindex no Base): páginas de teste, o /entrar, o /admin (moderação) e o /votacao, que só abrem com a
  // votação (Live 10). Comparados pelo caminho inteiro, para não esconder um post como /blog/entrar-no-git
  // nem a /votacao/progresso, que continua no sitemap.
  integrations: [
    sitemap({
      filter: (pagina) => {
        const caminho = new URL(pagina).pathname;
        return (
          !pagina.includes('/votacao/teste') && caminho !== '/entrar' && caminho !== '/votacao' && caminho !== '/admin'
        );
      },
    }),
  ],
  markdown: {
    shikiConfig: { theme: 'github-dark-dimmed' },
  },
});
