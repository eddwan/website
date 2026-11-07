# eddwan.com: site pessoal do Eddwan

Blog, notícias, vídeos do canal [@eddwan](https://www.youtube.com/@eddwan), portfólio e currículo.
Site **estático** em [Astro](https://astro.build) (7.x) com conteúdo em **Markdown**: sem banco de dados, sem painel, sem servidor de aplicação.

> **Status:** só local. Nada foi publicado e o DNS não foi mexido. A grafia do domínio (`eddwan.com`) ainda precisa da confirmação do Eddwan
> (ela fica num lugar só: `astro.config.mjs`, ou a variável `SITE_URL` no build).

## Rotas

| Rota | O que é | Arquivo |
| --- | --- | --- |
| `/` | Início: quem é, último vídeo e últimos posts | `src/pages/index.astro` |
| `/blog` | Todos os posts, com as tags | `src/pages/blog/index.astro` |
| `/blog/<slug>` | Post (artigo, notícia, lista ou explicativo) | `src/pages/blog/[...slug].astro` |
| `/blog/tag/<tag>` | Posts de uma tag | `src/pages/blog/tag/[tag].astro` |
| `/videos` | Posts que têm vídeo do YouTube (player embutido no post) | `src/pages/videos/index.astro` |
| `/portfolio` | Projetos | `src/pages/portfolio/index.astro` + `src/content/portfolio/*.md` |
| `/sobre` | Currículo; link para `/cv.pdf` aparece sozinho quando existir `public/cv.pdf` | `src/pages/sobre.astro` |
| `/rss.xml` | Feed RSS | `src/pages/rss.xml.ts` |
| `/sitemap-index.xml` | Sitemap (gerado pelo `@astrojs/sitemap`) | `astro.config.mjs` |
| `/og/<slug>.png` | Imagem Open Graph de cada post (1200×630, gerada no build) | `src/pages/og/[...slug].png.ts`, `src/lib/og.ts` |

## Rodar

Precisa do Node 22.23.4 ou mais novo (ver `engines` no `package.json`).

```bash
npm install
npm run dev        # http://localhost:4321 (mostra também os rascunhos)
npm run build      # gera dist/
npm run preview    # serve o dist/ como vai ficar no ar
```

## Escrever um post

```bash
npm run novo-post -- "Título do post" --tipo=noticia --youtube=ID_DO_VIDEO
```

Isso cria `src/content/blog/<slug>.md` com `rascunho: true`. O endereço do post é o nome do arquivo (`/blog/<slug>`).
Escreva em Markdown e, quando for publicar, mude para `rascunho: false`. **Rascunho aparece no `npm run dev`, mas não entra no build.**

Campos do cabeçalho (validados em `src/content.config.ts`; o build falha se faltar algo obrigatório):

```yaml
---
titulo: 'Título do post'
descricao: 'Uma ou duas frases: aparece na lista, no Google e na imagem de compartilhamento.'
data: 2026-11-07
tipo: noticia            # artigo | noticia | lista | explicativo
tags: [segurança, php]
youtube:                 # opcional: liga o post ao vídeo e põe ele em /videos
  id: r4bRFOAIE_E
  formato: short         # video (padrão) | short
  shorts:                # opcional: shorts do mesmo vídeo
    - id: RdfPJe_nH7w
      titulo: 'Do 15º ao 11º lugar'
fontes:                  # opcional: aparece no fim do post
  - titulo: 'Projeto PHP'
    url: https://www.php.net/archive/2026.php
rascunho: false
---
```

O player do YouTube é leve: a página mostra só a miniatura e carrega o `youtube-nocookie.com` quando a pessoa clica.
A imagem Open Graph sai do título e do tipo, sem nada para fazer à mão.

### Post a partir de um vídeo do canal

O material de cada vídeo está em `~/Projetos/hallentech/youtube-channel/video/publicar/<id>/`:
`descricoes/video.txt` (resumo, capítulos e links), `roteiro-narracao.md` (texto falado e fatos conferidos),
`enviados.json` (IDs do YouTube) e, nas listas, `lista.md`. Os 3 posts de exemplo saíram de lá:
`s09-php2shell` (notícia), `v24-top15` (lista) e `e09-segredo-vazado` (explicativo).
A automação (cada vídeo virar post sozinho) fica para depois.

### Portfólio e Sobre

- Projetos: um `.md` por projeto em `src/content/portfolio/` (`ordem` define a posição). `revisar: true` mostra o aviso de rascunho.
- Sobre: `src/pages/sobre.astro`. Os trechos entre colchetes são para o Eddwan preencher.
- Currículo em PDF: salve como `public/cv.pdf`; o botão aparece no próximo build.

## Visual

Tema escuro, tipografia grande e as cores da Hallen Tech: laranja `#FFC301 → #FE7602` e azul `#03E7FC → #0183FB`.

- **Fontes** (servidas pelo próprio site): Bricolage Grotesque nos títulos, Inter no texto e JetBrains Mono nas etiquetas.
- **Tokens e estilos comuns** (cores, botões, etiquetas, cartões, texto dos posts): `src/styles/global.css`.
- **Peças:** `src/components/` (cartão de post, cartão de vídeo, player, cabeçalho de página, ícones) e `src/layouts/Base.astro` (cabeçalho com menu no celular e rodapé).
- **Movimento:** entrada suave ao rolar só onde o navegador suporta (`animation-timeline`), e nada anima com “reduzir movimento” ligado.
- Rodapé com “Fundador da Hallen Tech” → hallentech.com.

## Dados do canal

`src/data/canal.ts` guarda os vídeos públicos do @eddwan (ID, título, data, série), as séries com as playlists e os números da página inicial.
É de lá que saem a grade filtrável de `/videos`, os “mais recentes” e os mosaicos das séries na página inicial.
**Saiu vídeo novo?** Acrescente uma linha em `LISTA` (e atualize `NUMEROS` quando mudar a contagem). Se o vídeo tiver post, o post usa o mesmo ID em `youtube.id` e o cartão passa a abrir o post.

## Publicar no Plesk (rsync)

Mesmo servidor e mesmo método do site da Hallen Tech (`hallentech/website`, ver `.gitlab-ci.yml` de lá): build estático e `rsync` do `dist/` para o vhost.
**Não publique sem o Eddwan aprovar.**

### Uma vez só (no Plesk)

1. Criar o domínio `eddwan.com` (ou a grafia confirmada) no Plesk. A pasta do site fica em `/var/www/vhosts/eddwan.com/httpdocs/`.
2. Apontar o DNS do domínio para o servidor (registro A/AAAA) e ligar o Let's Encrypt e o redirecionamento para HTTPS no Plesk.
3. Dar ao usuário SSH de deploy (o mesmo do site da Hallen Tech, ou um novo) permissão de escrita em `httpdocs/`, e pôr a chave pública dele no servidor.

### Cada publicação

```bash
cp .env.deploy.exemplo .env.deploy   # uma vez; preencha VPS_HOST e VPS_USER (o arquivo fica fora do git)
npm run deploy                       # build + rsync em modo SIMULAÇÃO (mostra o que mudaria)
npm run deploy -- --enviar           # build + rsync de verdade
```

O script (`scripts/deploy.sh`) roda:

```bash
rsync -avz --delete --exclude='.well-known/' --exclude='error_docs/' \
  dist/ "$VPS_USER@$VPS_HOST:/var/www/vhosts/$DOMAIN/httpdocs/"
```

- `--delete` apaga no servidor o que não está no `dist/`. Por isso `.well-known/` (Let's Encrypt) e `error_docs/` (Plesk) ficam de fora.
- O `public/.htaccess` vai junto: página 404, cache longo para os arquivos com hash e compressão.
- Depois de publicar, conferir `https://eddwan.com`, `/rss.xml`, `/sitemap-index.xml` e uma imagem `/og/...png`.

## Para depois

- Comentários (giscus) e newsletter.
- Post automático a partir de `youtube-channel/video/publicar/<id>/`.
- CI de deploy (como o do site da Hallen Tech).
