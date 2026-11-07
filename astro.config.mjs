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
  integrations: [sitemap()],
  markdown: {
    shikiConfig: { theme: 'github-dark-dimmed' },
  },
});
