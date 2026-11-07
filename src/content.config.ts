import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    titulo: z.string(),
    descricao: z.string(),
    data: z.coerce.date(),
    atualizado: z.coerce.date().optional(),
    tipo: z.enum(['artigo', 'noticia', 'lista', 'explicativo']).default('artigo'),
    tags: z.array(z.string()).default([]),
    // Vídeo do YouTube ligado ao post (aparece em /videos com o player embutido)
    youtube: z
      .object({
        id: z.string(),
        formato: z.enum(['video', 'short']).default('video'),
        shorts: z.array(z.object({ id: z.string(), titulo: z.string() })).default([]),
      })
      .optional(),
    fontes: z.array(z.object({ titulo: z.string(), url: z.string().url() })).default([]),
    // Rascunho não entra no build de produção (só aparece no npm run dev)
    rascunho: z.boolean().default(false),
  }),
});

const portfolio = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/portfolio' }),
  schema: z.object({
    titulo: z.string(),
    resumo: z.string(),
    ordem: z.number().default(100),
    papel: z.string().optional(),
    periodo: z.string().optional(),
    links: z.array(z.object({ rotulo: z.string(), url: z.string().url() })).default([]),
    tecnologias: z.array(z.string()).default([]),
    // Texto ainda não revisado pelo Eddwan: mostra um aviso na página
    revisar: z.boolean().default(false),
  }),
});

export const collections = { blog, portfolio };
