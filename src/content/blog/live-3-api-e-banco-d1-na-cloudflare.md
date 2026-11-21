---
titulo: 'Live 3: a API e o banco D1 do site, na Cloudflare'
descricao: 'Terceira das 10 lives em que eu construo, ao vivo e com o Claude Code, a votação open source do eddwan.com. O site deixou de ser só estático: um Worker passou a responder em /api, nasceu o banco D1 onde vão ficar os votos, as migrações rodam pelo GitHub Actions e a API sobe na sua máquina sem conta na Cloudflare. Com a gravação, os prompts que eu usei e o que vem na próxima live.'
data: 2026-11-19
tipo: artigo
tags: [programação, claude code, open source, cloudflare, github actions]
youtube:
  id: c3IrYbnUoGI
fontes:
  - titulo: 'Issue #17: Worker com /api e banco D1'
    url: https://github.com/eddwan/website/issues/17
  - titulo: 'PR #44: Worker com /api e banco D1'
    url: https://github.com/eddwan/website/pull/44
  - titulo: 'Cloudflare Workers, run_worker_first nos arquivos estáticos'
    url: https://developers.cloudflare.com/workers/static-assets/binding/#run_worker_first
  - titulo: 'Cloudflare D1, migrações'
    url: https://developers.cloudflare.com/d1/reference/migrations/
  - titulo: 'Cloudflare D1, preços e limites'
    url: https://developers.cloudflare.com/d1/platform/pricing/
rascunho: false
---

Esta é a terceira das 10 lives em que eu construo a votação open source do eddwan.com, onde quem assiste vai votar nos repositórios dos próximos vídeos. Na [Live 1](/blog/live-1-catalogo-dos-repositorios-da-votacao-open-source), o site ganhou o catálogo dos repositórios; na [Live 2](/blog/live-2-pagina-de-repositorios-com-busca-e-filtros), esse catálogo virou a página [eddwan.com/repositorios](/repositorios). Até ali, tudo era arquivo estático. Na quinta, 19/11, o site ganhou um lado servidor.

A arquitetura completa está no [post de apresentação](/blog/vou-construir-uma-votacao-open-source-com-custo-zero-a-arquitetura-peca-por-peca), cada live tem a sua issue no [GitHub Project](https://github.com/users/eddwan/projects/5), e o andamento fica na [página de progresso da votação](/votacao/progresso).

## O que ficou pronto

- **Um Worker que responde só em `/api/*`.** O resto do site continua saindo direto dos arquivos gerados pelo Astro, sem passar pelo Worker.
- **[eddwan.com/api/saude](https://eddwan.com/api/saude)** já está no ar e responde `{"ok":true,"banco":"ok","esquema":"1"}`. Qualquer outra rota de `/api` responde 404 em JSON.
- **O banco D1 `eddwan-votos`**, ligado ao Worker, com a primeira migração. É nele que vão ficar os usuários, os votos e as sugestões.
- **Migrações no GitHub Actions:** o deploy aplica no banco do ar antes de publicar, e o CI aplica num banco local a cada PR.
- **A API roda na sua máquina sem conta na Cloudflare**, com o passo a passo na seção "API e banco local" do [README](https://github.com/eddwan/website#api-e-banco-local).

Tudo entrou pelo [PR #44](https://github.com/eddwan/website/pull/44), e a [issue #17](https://github.com/eddwan/website/issues/17) foi fechada com o `/api/saude` respondendo no ar.

## Só `/api` passa pelo Worker

O site é feito de páginas prontas, e não faz sentido rodar código para entregar cada uma delas. Por isso, a configuração no `wrangler.jsonc` diz que o Worker só roda primeiro nos caminhos de `/api`:

```jsonc
"main": "worker/index.ts",
"assets": {
  "directory": "./dist",
  "binding": "ASSETS",
  "run_worker_first": ["/api/*"]
}
```

Quem abre o blog ou a página de repositórios recebe o arquivo direto da Cloudflare, e essas visitas não contam no limite de 100 mil requisições por dia do plano grátis dos Workers. Só as chamadas da votação vão contar.

O Worker em si é curto. A parte que importa é esta:

```ts
if (pathname === '/api/saude') {
  try {
    const linha = await env.DB.prepare('SELECT valor FROM meta WHERE chave = ?')
      .bind('esquema')
      .first<{ valor: string }>();
    if (!linha) throw new Error('Linha esquema não encontrada na tabela meta');
    return json({ ok: true, banco: 'ok', esquema: linha.valor });
  } catch (erro) {
    console.error('Falha ao ler o banco em /api/saude', erro);
    return json({ ok: false, banco: 'erro' }, 503);
  }
}
return json({ erro: 'Não encontrado' }, 404);
```

Dois cuidados que já ficam valendo para a votação toda:

- **A consulta usa `?` e `.bind()`.** O valor nunca é colado dentro do SQL. Aqui ele é fixo, mas é o hábito que evita injeção de SQL quando o valor vier de quem assiste.
- **Quando o banco falha, a resposta não conta o motivo.** Quem chamou recebe só `{"ok":false,"banco":"erro"}`; a mensagem de erro de verdade vai para o log, que só eu vejo.

## O banco e a primeira migração

O banco foi criado ao vivo, com `npx wrangler d1 create eddwan-votos`. A primeira migração é de propósito pequena: uma tabela `meta` com a versão do esquema, que é justamente o que o `/api/saude` lê.

```sql
CREATE TABLE meta (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

INSERT INTO meta (chave, valor) VALUES ('esquema', '1');
```

As tabelas do login ficaram para a próxima live. Começar só com a `meta` deixou a live inteira concentrada no caminho: criar o banco, ligar ao Worker, aplicar a migração no computador e no ar e ver o resultado numa rota.

O D1 guarda quais migrações já rodaram em cada banco. Por isso o mesmo comando serve sempre: ele só aplica o que falta.

## Migrações pelo GitHub Actions

As migrações entraram nos dois workflows do repositório:

- **No deploy (`deploy.yml`)**, antes de publicar, com `npx wrangler d1 migrations apply eddwan-votos --remote`. Se uma migração falhar, o job para ali e o site no ar continua na versão anterior. Depois do deploy, a conferência automática agora também chama o `/api/saude` e espera 200.
- **No CI (`ci.yml`)**, num banco local, com `--local`. Assim, um PR com SQL quebrado falha antes de alguém aprovar, e esse passo roda sem token nem conta na Cloudflare.

Para isso, o token do GitHub Actions precisa de uma permissão a mais, a de edição do D1. É o tipo de ajuste que eu faço fora do ar: o painel de tokens da Cloudflare não é coisa para mostrar na tela.

## Quanto custa

Nada, por enquanto e com folga. No plano grátis, o D1 permite ler 5 milhões de linhas e escrever 100 mil linhas por dia, com 5 GB de espaço. Um voto é uma escrita; mesmo que a votação dê muito certo, fica longe disso.

## A API na sua máquina, sem conta

Uma regra do projeto é que qualquer pessoa consiga rodar tudo localmente para contribuir. Com o `wrangler`, o Worker e o banco D1 rodam no computador, sem login:

```bash
npm ci
npx wrangler d1 migrations apply eddwan-votos --local
npm run cf:dev
curl http://localhost:8787/api/saude
```

O banco local fica em `.wrangler/`, fora do Git. Um detalhe que confunde: o `npm run dev` do Astro serve só as páginas e não roda o Worker, então a API só existe no `npm run cf:dev`, na porta 8787.

Para conferir o README, a pasta `.wrangler/` foi apagada e a seção foi seguida do zero: com o banco vazio, o `/api/saude` deu 503; depois das migrações, voltou a dar 200.

## Os prompts que eu usei

Os quatro pedidos eu levei prontos no roteiro e colei no Claude Code, um por bloco da live. Entre um e outro, eu conferia o resultado e pedia o commit.

**1. O Worker, com o plano antes do código:**

```text
Leia a issue #17 (gh issue view 17), o wrangler.jsonc e a seção "Publicar no Cloudflare Workers" do README.
Hoje o site é só arquivo estático. Quero um Worker que responda só em /api/*, sem mudar nada no resto do site:
- entrada em worker/index.ts (fora do src/ do Astro), configurada em "main" no wrangler.jsonc;
- assets com binding "ASSETS" e run_worker_first: ["/api/*"], mantendo html_handling e not_found_handling como estão;
- GET /api/saude responde JSON { ok: true }; outra rota de /api responde 404 em JSON; o que não for /api vai para env.ASSETS.fetch(request);
- tipos com npx wrangler types, sem dependência nova.
Antes de escrever, me mostre o plano. Depois rode npm run cf:dev e teste /api/saude, /api/nada, / e /repositorios com curl.
```

**2. O banco e a primeira migração:**

```text
Acabei de criar o banco D1 "eddwan-votos".
Ligue o banco ao Worker no wrangler.jsonc com o binding DB e migrations_dir "migrations", e rode npx wrangler types de novo.
Crie a primeira migração com npx wrangler d1 migrations create eddwan-votos inicio: só uma tabela "meta" (chave TEXT PRIMARY KEY, valor TEXT NOT NULL)
com a linha esquema = '1'. As tabelas do login ficam para a próxima live.
Aplique no banco local (npx wrangler d1 migrations apply eddwan-votos --local) e faça o /api/saude ler essa linha com env.DB.prepare(...).first(),
respondendo { ok: true, banco: "ok", esquema: "1" }. Se o banco falhar, responda 503 com { ok: false, banco: "erro" }, sem mostrar a mensagem de erro.
Confira que .wrangler/ está no .gitignore. Teste com curl.
```

**3. As migrações no GitHub Actions:**

```text
Agora o GitHub Actions. No .github/workflows/deploy.yml, antes do passo "Build e deploy do site", aplique as migrações no banco do ar
com npx wrangler d1 migrations apply eddwan-votos --remote (o CLOUDFLARE_API_TOKEN do job já tem permissão de D1).
No .github/workflows/ci.yml, aplique as migrações no banco local (--local) antes do cf:check, para um PR com SQL quebrado falhar.
Na conferência do site no ar, inclua https://eddwan.com/api/saude esperando 200.
Atualize os comentários dos dois arquivos. Não coloque nenhuma chave nem id de conta novo nos YAMLs.
```

**4. O README, testado do zero:**

```text
Adicione no README uma seção curta "API e banco local", logo depois de "Rodar": como subir a API sem conta na Cloudflare
(npm ci, migrações com --local, npm run cf:dev, localhost:8787/api/saude), onde fica o banco local (.wrangler/) e como zerar ele.
Explique em uma linha que o npm run dev do Astro não roda o Worker.
Depois apague a pasta .wrangler/ e siga a seção do zero para conferir que funciona.
```

O que funcionou bem nesses pedidos:

- **Pedir o plano antes do código** no primeiro bloco, o que mexia na configuração do site inteiro. Deu para conferir o caminho antes de qualquer arquivo mudar.
- **Dizer o que não pode acontecer:** "sem mudar nada no resto do site", "sem dependência nova", "nenhuma chave nos YAMLs". Essas frases pesam tanto quanto a descrição do que fazer.
- **Pedir o teste junto**, com os comandos exatos: `curl` nas rotas, e apagar o `.wrangler/` para provar que o README funciona para quem chega agora.

## A live seguinte

A Live 4 foi na sexta, 20/11: o banco ganhou as tabelas do login, sem guardar nenhum e-mail em texto, uma faxina diária por Cron Trigger e o Turnstile, o anti-robô da Cloudflare, conferido no Worker. O que foi feito, a gravação, os prompts e a explicação do HMAC estão no [post da Live 4](/blog/live-4-tabelas-do-login-e-turnstile-na-cloudflare). Quer contribuir? Mande um PR para a `develop` (veja o [CONTRIBUTING.md](https://github.com/eddwan/website/blob/main/CONTRIBUTING.md)).

O código foi escrito ao vivo com o Claude Code, com cada passo revisado por mim na tela antes do commit.
