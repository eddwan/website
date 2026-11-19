import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
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
    // Agrupa a página: produtos da Hallen Tech, conteúdo (canal, cursos) e empresas
    categoria: z.enum(['produto', 'conteudo', 'empresa']).default('produto'),
    // Fase do produto, mostrada num selo (ex.: "No ar", "Em piloto")
    status: z.string().optional(),
    papel: z.string().optional(),
    periodo: z.string().optional(),
    links: z.array(z.object({ rotulo: z.string(), url: z.string().url() })).default([]),
    tecnologias: z.array(z.string()).default([]),
    // Texto ainda não revisado pelo Eddwan: mostra um aviso na página
    revisar: z.boolean().default(false),
  }),
});

const repositorios = defineCollection({
  // Catálogo dos repositórios que saíram nos vídeos (gerado pelo script da planilha)
  loader: file('src/data/repositorios.json'),
  schema: z
    .object({
      id: z.string().regex(/^[\w.-]+\/[\w.-]+$/, 'id deve ser dono/repo'),
      nome: z.string().min(1),
      url: z.string().url(),
      resumo: z.string().min(1),
      // Coluna Categoria da planilha (ex.: "Agentes de IA", "Dev Tools"): uma por repositório
      categoria: z.string().min(1),
      // Coluna Subcategoria da planilha: detalha a categoria (ex.: "Frontend" em Dev Tools)
      subcategoria: z.string().min(1),
      tags: z.array(z.string()).min(1),
      // Ferramentas que o repositório substitui (ex.: "Notion", "Photoshop")
      alternativaA: z.array(z.string()).default([]),
      linguagem: z.string().optional(),
      licenca: z.string().min(1),
      // Vídeos em que o repositório apareceu
      aparicoes: z
        .array(
          z.object({
            videoId: z.string().regex(/^[\w-]{11}$/, 'videoId do YouTube tem 11 caracteres'),
            // Top N é "Vol. 29"; short avulso é "Short 1"; episódio de série é "Ep. 3"
            volume: z.string().regex(/^(Vol\.|Short|Ep\.) \d+$/, 'volume no formato "Vol. 29", "Short 1" ou "Ep. 3"'),
            data: z.coerce.date(),
          }),
        )
        .min(1),
    })
    .refine((r) => r.url.toLowerCase() === `https://github.com/${r.id}`.toLowerCase(), {
      message: 'url deve ser https://github.com/<id>',
      path: ['url'],
    }),
});

export const collections = { blog, portfolio, repositorios };
