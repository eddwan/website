// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Domínio confirmado pelo Eddwan em 07/11/2026: eddwan.com (SITE_URL sobrescreve).
// Dá para trocar sem mexer no código: SITE_URL=https://outro.dominio npm run build
const site = process.env.SITE_URL ?? 'https://eddwan.com';

export default defineConfig({
  site,
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: { theme: 'github-dark-dimmed' },
  },
});
