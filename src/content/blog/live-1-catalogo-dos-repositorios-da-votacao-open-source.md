---
titulo: 'Live 1: o catálogo dos repositórios da votação open source'
descricao: 'Primeira das 10 lives em que eu construo, ao vivo e com o Claude Code, a votação open source do eddwan.com. Nesta, a base de tudo: o formato do catálogo com os 408 repositórios que já apareceram no canal, o script que exporta a planilha sem dependência nenhuma e o build recusando entrada incompleta. Com a gravação, os prompts que eu usei e o que deu errado no caminho.'
data: 2026-11-18
tipo: artigo
tags: [programação, claude code, open source, github]
youtube:
  id: bFBPFw79P-0
fontes:
  - titulo: 'Issue #15: formato do catálogo e primeira carga'
    url: https://github.com/eddwan/website/issues/15
  - titulo: 'PR #32: catálogo de repositórios'
    url: https://github.com/eddwan/website/pull/32
  - titulo: 'Astro, coleções de conteúdo'
    url: https://docs.astro.build/en/guides/content-collections/
  - titulo: 'Astro, loader file()'
    url: https://docs.astro.build/en/reference/content-loader-reference/#file-loader
rascunho: false
---

Na terça, 17/11, começou a série de 10 lives em que eu construo a votação open source do eddwan.com: quem assiste vai votar nos repositórios dos próximos vídeos e sugerir repositórios novos. A arquitetura completa está no [vídeo e no post de apresentação](/blog/vou-construir-uma-votacao-open-source-com-custo-zero-a-arquitetura-peca-por-peca). As lives são de terça a sexta, das 20h às 21h30, até 02/12, e cada uma tem a sua issue no [GitHub Project](https://github.com/users/eddwan/projects/5).

O que já foi feito e o que vem em cada live está na [página de progresso da votação](/votacao/progresso), com o diagrama da arquitetura e uma linha do tempo das 10 lives.

Antes de votar em repositório, o site precisa saber quais repositórios existem. Foi isso que a Live 1 resolveu.

## O que ficou pronto

- **Catálogo com 408 repositórios de 29 vídeos**, em `src/data/repositorios.json`, gerado da planilha que eu uso para montar as listas do canal.
- **Coleção de conteúdo do Astro** lendo esse arquivo e validando cada entrada no build.
- **Script de exportação** (`npm run exportar-catalogo`), que roda na minha máquina e não usa nenhuma biblioteca nova.
- **Seção no README** explicando de onde vem o arquivo e como gerar de novo.

Tudo entrou na `develop` pelo [PR #32](https://github.com/eddwan/website/pull/32), e a [issue #15](https://github.com/eddwan/website/issues/15) foi fechada.

## O esquema do catálogo

Cada repositório tem o `id` no formato `dono/repo`, nome, link, resumo, tags, os produtos que ele substitui ("alternativa a"), linguagem, licença e a lista de vídeos em que apareceu. O esquema fica em `src/content.config.ts`, ao lado das coleções do blog e do portfólio:

```ts
const repositorios = defineCollection({
  // Catálogo dos repositórios que saíram nos vídeos (gerado pelo script da planilha)
  loader: file('src/data/repositorios.json'),
  schema: z
    .object({
      id: z.string().regex(/^[\w.-]+\/[\w.-]+$/, 'id deve ser dono/repo'),
      nome: z.string().min(1),
      url: z.string().url(),
      resumo: z.string().min(1),
      tags: z.array(z.string()).min(1),
      alternativaA: z.array(z.string()).default([]),
      linguagem: z.string().optional(),
      licenca: z.string().min(1),
      aparicoes: z
        .array(
          z.object({
            videoId: z.string().regex(/^[\w-]{11}$/, 'videoId do YouTube tem 11 caracteres'),
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
```

O "pronto quando" da issue pedia que o esquema recusasse entradas incompletas. O teste ao vivo foi uma entrada de mentira com resumo vazio, sem tags, `videoId` curto, volume fora do formato e link que não batia com o `id`: o build recusou com os cinco erros.

Uma entrada de verdade, o ZigZag, que foi o 1º lugar do Vol. 29:

```json
{
  "id": "simpsoka/zigzag",
  "nome": "zigzag",
  "url": "https://github.com/simpsoka/zigzag",
  "resumo": "Programa grátis de bordado para Mac e Windows: transforma SVG em bordado de máquina, edita os pontos e cria desenhos com agentes por MCP.",
  "tags": ["app desktop", "servidor MCP", "macOS", "Windows", "design", "imagem", "agentes"],
  "alternativaA": ["Wilcom", "Hatch Embroidery"],
  "linguagem": "Rust",
  "licenca": "Apache-2.0",
  "aparicoes": [{ "videoId": "hmdIjg1wxWI", "volume": "Vol. 29", "data": "2026-11-16" }]
}
```

## O script da planilha

A planilha tem mais de mil e duzentos repositórios, com nota, alertas e motivos de descarte. Isso é bastidor e não vai para a internet. O script lê só as linhas marcadas como "Publicado" e monta cada entrada com os campos do esquema, nada além.

Três decisões que apareceram durante a live:

- **Sem biblioteca de xlsx.** As regras do repositório pedem nenhuma dependência nova sem necessidade. O Claude Code abriu o arquivo da planilha (que é um zip de XMLs) só com o `zlib` do próprio Node.
- **Shorts e episódios também contam.** A coluna Vídeo vem como `V29 · #1`, mas há repositórios que saíram em short avulso. O campo `volume` passou a aceitar "Short N" e "Ep. N", além de "Vol. N". O Claude Code avisou que estava mudando o esquema que eu tinha aprovado, antes de seguir.
- **O que fica de fora é listado.** No fim, o script imprime quantos repositórios e vídeos entraram e quais ficaram de fora, com o motivo.

A primeira carga trouxe 379 repositórios de 28 vídeos. Ficaram de fora 31: os 30 do Vol. 1, porque o `enviados.json` daquele vídeo não tinha o id do vídeo principal, e o AnyPS5, sem data de publicação na planilha. O id do Vol. 1 foi acertado ainda durante a live, o script rodou de novo e o catálogo chegou a 408. Continuam de fora o `excalidraw/excalidraw-mcp` (sem licença na planilha) e o AnyPS5. Os dois se resolvem preenchendo a planilha, sem mexer no código.

## Os prompts que eu usei

Os três pedidos principais eu levei prontos no roteiro e colei no Claude Code. Entre eles, só confirmações curtas: "sim", "faça o commit", "faça o push", "abra o PR para a develop".

**1. O esquema, sem escrever nada antes de eu aprovar:**

```text
Leia a issue #15 do eddwan/website (gh issue view 15) e o src/content.config.ts.
Quero uma coleção de conteúdo nova, "repositorios", carregada de src/data/repositorios.json com o loader file() do Astro.
Campos: id no formato dono/repo, nome, url do GitHub, resumo, tags (lista de strings), alternativaA (lista), linguagem, licenca, e uma lista de aparicoes (videoId do YouTube, volume como "Vol. 29", data).
Use zod do astro/zod como no blog. Tudo obrigatório, menos alternativaA (padrão []) e linguagem.
Não crie páginas ainda. Antes de escrever, me mostre o esquema proposto.
```

**2. O script de exportação, com as regras do que pode sair da planilha:**

```text
Crie scripts/exportar-catalogo.mjs. Ele recebe o caminho do projeto do canal (padrão ~/Projetos/hallentech/youtube-channel),
lê repositorios-para-videos.xlsx (aba "Ranking completo") e grava src/data/repositorios.json com o esquema da coleção.
Regras: só linhas com Status YouTube = "Publicado"; nunca exportar notas, alertas, peso nem posição;
a coluna Vídeo vem como "V29 · #1" (volume e posição; olhe os outros formatos que aparecem, como E e S) e o videoId sai de video/publicar/<pasta do vídeo>/enviados.json;
ordenar por data, do mais recente. Imprima no fim quantos repositórios e quantos vídeos entraram, e os que ficaram sem videoId.
```

**3. Build e documentação, corrigindo na origem:**

```text
Rode o build. Se a coleção repositorios falhar, me explique cada erro e corrija no scripts/exportar-catalogo.mjs, não no JSON.
Depois adicione no README uma seção curta "Catálogo de repositórios" dizendo de onde vem o JSON e como regerar.
```

O build passou de primeira, então não houve erro para corrigir. No fim, depois de acertar o Vol. 1, pedi para rodar o `npm run exportar-catalogo` de novo e atualizar o PR.

O que funcionou bem nesses pedidos:

- **Pedir o esquema antes do código.** Assim dá para discutir os campos com o chat antes de qualquer arquivo mudar.
- **Dizer o que não pode sair.** "Nunca exportar notas, alertas, peso nem posição" é mais seguro do que confiar que o script vai escolher bem.
- **Corrigir na origem, não no JSON.** O arquivo é gerado. Se eu editasse à mão, a próxima exportação apagaria a correção.

## A live seguinte

A Live 2 foi na quarta, 18/11: o catálogo virou a página [eddwan.com/repositorios](/repositorios), com busca e filtros por categoria, tag, "alternativa a" e linguagem, e uma página para cada repositório. O que foi feito, a gravação e os prompts estão no [post da Live 2](/blog/live-2-pagina-de-repositorios-com-busca-e-filtros).

O código foi escrito ao vivo com o Claude Code, com cada passo revisado por mim na tela antes do commit.
