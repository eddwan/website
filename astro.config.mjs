// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// PENDENTE: confirmar com o Eddwan a grafia exata do domínio antes de publicar.
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
