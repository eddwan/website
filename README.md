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

`src/data/canal.ts` guarda as séries com as playlists e a `LISTA` dos vídeos conferidos à mão (ID, título, data, série, rótulo).

**Vídeos novos entram sozinhos.** A cada build, `src/data/youtube.ts` lê o feed público do canal no YouTube (playlist de uploads só com vídeos longos, os 15 últimos, sem chave de API) e acrescenta o que não está na `LISTA`. A série e o rótulo saem do fim do título:

| Fim do título | Série | Rótulo |
| --- | --- | --- |
| `| Vol. 25` | Open source do GitHub | Vol. 25 |
| `| Git e GitHub do zero #11` | Git e GitHub do zero | Ep. 11 |
| `| Programando com IA do zero #1` | Programando com IA do zero | Ep. 1 |
| `| Especial #2` | Especiais | Especial #2 |
| qualquer outro | Especiais | Vídeo |

- O deploy roda de 3 em 3 horas (`schedule` no `deploy.yml`), então um vídeo publicado aparece no site em até 3 horas. Para antecipar: `gh workflow run deploy.yml -R eddwan/website`.
- Os números da home (volumes e episódios) são calculados da lista.
- Se o feed falhar, o build segue só com a `LISTA` (aviso `[youtube]` no log). `SEM_FEED_YOUTUBE=1 npm run build` desliga o feed.
- Para corrigir título ou rótulo de um vídeo que veio do feed, copie-o para a `LISTA`: a `LISTA` sempre vence.
- Shorts não entram na grade; os da página `/videos` vêm dos posts do blog (`youtube.formato: short`).
- Vídeo com post: o post usa o mesmo ID em `youtube.id`, e o cartão passa a abrir o post.

## Fluxo de trabalho e deploy automático

O trabalho acontece na **`develop`**; a **`main`** é o que está no ar.

1. Commit e push na `develop` → o GitHub Actions roda o **CI** (build + simulação do deploy, sem publicar).
2. Pull request `develop → main` → o CI roda de novo no PR.
3. **Merge na `main`** → o workflow **Deploy** publica o site e o redirecionamento do www no Cloudflare e confere as páginas no ar.

```bash
gh pr create --base main --head develop --fill   # abre o PR
gh pr merge --merge                                # merge (dispara o deploy)
gh run watch                                       # acompanha o deploy
```

Também dá para publicar sem merge: Actions → Deploy → *Run workflow* (ou `gh workflow run deploy.yml`).

**Secret obrigatório:** `CLOUDFLARE_API_TOKEN`, criado em dash.cloudflare.com → My Profile → API Tokens → *Create Token* → modelo **Edit Cloudflare Workers**, com *Account Resources* = Hallen Tech e *Zone Resources* = eddwan.com. Guardar no repositório com `gh secret set CLOUDFLARE_API_TOKEN -R eddwan/website` (o comando pede o valor sem mostrar). O ID da conta já está nos `wrangler.jsonc`.

## Publicar no Cloudflare Workers (padrão)

O site roda como **Worker só de arquivos estáticos** (sem código de servidor): o `astro build` gera o `dist/` e o `wrangler` sobe tudo para a conta **Hallen Tech** da Cloudflare. O plano gratuito cobre com folga (requisições a arquivos estáticos não contam no limite do Worker).
**Não publique sem o Eddwan aprovar.**

| Arquivo | Para quê |
| --- | --- |
| `wrangler.jsonc` | Nome do Worker (`eddwan-website`), conta, pasta `dist/`, domínio `eddwan.com`, 404 do Astro, URLs sem barra no fim |
| `public/_headers` | Cabeçalhos de segurança e cache longo para `/_astro/*` (arquivos com hash) |
| `public/.assetsignore` | Deixa o `.htaccess` (só do Plesk) fora do upload |

```bash
npx wrangler login     # uma vez por máquina (já feito no Mac do Eddwan, conta Hallen Tech)
npm run cf:check       # build + simulação do deploy (não envia nada)
npm run cf:dev         # build + o site no motor do Cloudflare em http://localhost:8787
npm run cf:deploy      # build + publica de verdade
```

- **Domínio:** a zona `eddwan.com` já está na Cloudflare. A rota com `custom_domain` cria o registro DNS e o certificado no deploy. Não pode existir registro A/AAAA/CNAME com o mesmo nome antes.
- **www:** fica com outro Worker, `eddwan-www-redirect` (`cloudflare/www-redirect/`), que responde 301 para `https://eddwan.com` mantendo caminho e parâmetros. Só ele roda código, e só para quem entra pelo www. Publicar: `npm run cf:deploy-www`. Se um dia preferir uma Redirect Rule da zona (Rules → Redirect Rules → modelo “Redirect from WWW to root”), apague antes esse Worker e o domínio personalizado dele.
- **URLs:** sem barra no fim (`/sobre`). `trailingSlash: 'never'` no Astro e `drop-trailing-slash` no Cloudflare; `/sobre/` redireciona para `/sobre`.
- O endereço `*.workers.dev` e as URLs de prévia estão desligados: o site só responde no domínio.
- Depois de publicar, conferir `https://eddwan.com`, `/sobre`, `/rss.xml`, `/sitemap-index.xml`, uma imagem `/og/...png` e uma página inexistente (deve dar o 404 do site).
- Voltar uma versão: `npx wrangler rollback` (ou pelo painel, Workers → eddwan-website → Deployments).

## Publicar no Plesk (rsync, alternativa)

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
