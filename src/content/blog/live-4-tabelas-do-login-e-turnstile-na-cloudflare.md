---
titulo: 'Live 4: as tabelas do login e o Turnstile, o anti-robô da Cloudflare'
descricao: 'Quarta das 10 lives em que eu construo, ao vivo e com o Claude Code, a votação open source do eddwan.com. O banco ganhou as tabelas do login, sem guardar nenhum e-mail em texto (com HMAC, explicado passo a passo), uma faxina diária por Cron Trigger e o Turnstile conferido no Worker, com a chave secreta guardada só no Worker. Com a gravação, os prompts que eu usei, os projetos que vocês mandaram no chat e o que vem na próxima live.'
data: 2026-11-20
tipo: artigo
tags: [programação, claude code, open source, cloudflare, segurança]
youtube:
  id: 8dGBZDGDQ9E
fontes:
  - titulo: 'Issue #18: tabelas do login, Turnstile e revisão de PRs'
    url: https://github.com/eddwan/website/issues/18
  - titulo: 'PR #48: tabelas do login, limpeza diária e Turnstile no Worker'
    url: https://github.com/eddwan/website/pull/48
  - titulo: 'RFC 2104, HMAC'
    url: https://www.rfc-editor.org/rfc/rfc2104
  - titulo: 'Cloudflare Turnstile, validação no servidor'
    url: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
  - titulo: 'Cloudflare Turnstile, chaves de teste'
    url: https://developers.cloudflare.com/turnstile/troubleshooting/testing/
  - titulo: 'Cloudflare Workers, Cron Triggers'
    url: https://developers.cloudflare.com/workers/configuration/cron-triggers/
rascunho: false
---

Esta é a quarta das 10 lives em que eu construo a votação open source do eddwan.com, onde quem assiste vai votar nos repositórios dos próximos vídeos. Na [Live 3](/blog/live-3-api-e-banco-d1-na-cloudflare), o site ganhou um Worker em `/api` e o banco D1 onde vão ficar os votos. Na sexta, 20/11, esse banco ganhou o lugar onde o login vai guardar quem você é, e a API ganhou a primeira defesa contra robôs.

A arquitetura completa está no [post de apresentação](/blog/vou-construir-uma-votacao-open-source-com-custo-zero-a-arquitetura-peca-por-peca), cada live tem a sua issue no [GitHub Project](https://github.com/users/eddwan/projects/5), e o andamento fica na [página de progresso da votação](/votacao/progresso).

## O que ficou pronto

- **As tabelas do login** (`usuarios`, `codigos` e `sessoes`), na segunda migração do banco. O e-mail de ninguém fica guardado em texto.
- **Uma faxina diária**: um Cron Trigger apaga, todo dia às 06:00 UTC, os códigos e as sessões que já venceram.
- **O Turnstile conferido no Worker**, com a rota de teste `POST /api/turnstile/teste`, que responde 403 quando a verificação falha.
- **Uma página de teste do widget**, fora do menu, do sitemap e dos buscadores.
- **A chave pública do Turnstile numa variável do GitHub Actions**, e a secreta só no Worker.

Tudo entrou pelo [PR #48](https://github.com/eddwan/website/pull/48), e a [issue #18](https://github.com/eddwan/website/issues/18) foi fechada. No ar, o [eddwan.com/api/saude](https://eddwan.com/api/saude) agora responde `"esquema":"2"`.

## O que é HMAC

O login da votação vai ser por código enviado para o seu e-mail. Para isso, o banco precisa saber que "este código é deste e-mail", mas eu não quero uma lista de e-mails guardada lá dentro. Se o banco vazar um dia, não vaza o seu e-mail.

Um hash comum (SHA-256) não resolve: qualquer pessoa calcula o SHA-256 de `ed@exemplo.com` e acha a linha no banco testando uma lista de e-mails. O HMAC é um hash com chave secreta. Com a chave A, o mesmo e-mail dá um número; com a chave B, dá outro. Quem não tem a chave não consegue refazer a conta, e a lista de e-mails não serve para nada.

Dá para ver a diferença no terminal:

```bash
printf '%s' 'ed@exemplo.com' | shasum -a 256                     # qualquer um calcula
printf '%s' 'ed@exemplo.com' | openssl dgst -sha256 -hmac 'chave A'
printf '%s' 'ed@exemplo.com' | openssl dgst -sha256 -hmac 'chave B'
```

O cálculo do HMAC-SHA256, definido na [RFC 2104](https://www.rfc-editor.org/rfc/rfc2104), tem 4 passos:

1. A chave é completada com zeros até 64 bytes.
2. Dela saem duas versões: uma com XOR byte a byte com `0x36` (ipad) e outra com `0x5c` (opad).
3. `SHA-256(chave⊕ipad + e-mail)` dá um resultado interno.
4. `SHA-256(chave⊕opad + interno)` dá o HMAC.

Por que dois hashes, e não só `SHA-256(chave + e-mail)`? Porque esse atalho cai no ataque de extensão de tamanho: dá para calcular o hash de "mensagem + mais alguma coisa" sem conhecer a chave. O hash de fora fecha essa porta.

Dois detalhes para quando o código entrar, na próxima live:

- **O e-mail é normalizado antes**, sem espaços e em minúsculas. Senão `Ed@Exemplo.com` viraria outra conta.
- **No Worker não precisa de biblioteca:** a Web Crypto já faz HMAC com `crypto.subtle.sign('HMAC', …)`.

## As tabelas do login

A segunda migração foi criada com `npx wrangler d1 migrations create eddwan-votos login`. Pedi ao Claude Code para me mostrar o SQL antes de escrever o arquivo, e ele sugeriu um índice a mais, em `sessoes.usuario_id`, que eu aceitei:

```sql
CREATE TABLE usuarios (
  id INTEGER PRIMARY KEY,
  email_hmac TEXT NOT NULL UNIQUE,
  criado_em INTEGER NOT NULL
);

CREATE TABLE codigos (
  id INTEGER PRIMARY KEY,
  email_hmac TEXT NOT NULL,
  codigo_hash TEXT NOT NULL,
  expira_em INTEGER NOT NULL,
  tentativas INTEGER NOT NULL DEFAULT 0,
  criado_em INTEGER NOT NULL
);

CREATE TABLE sessoes (
  token_hash TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira_em INTEGER NOT NULL,
  criado_em INTEGER NOT NULL
);

CREATE INDEX idx_codigos_email_criado ON codigos (email_hmac, criado_em);
CREATE INDEX idx_codigos_expira ON codigos (expira_em);
CREATE INDEX idx_sessoes_expira ON sessoes (expira_em);
CREATE INDEX idx_sessoes_usuario ON sessoes (usuario_id);

UPDATE meta SET valor = '2' WHERE chave = 'esquema';
```

O que vale notar:

- **Nada sensível em texto.** O e-mail vira `email_hmac`, o código de 6 dígitos vira `codigo_hash` e o token da sessão vira `token_hash`. Quem ler o banco não consegue entrar na conta de ninguém.
- **`codigos` fica ligado ao e-mail, não ao usuário.** Quem pede código pela primeira vez ainda não tem conta.
- **Cada índice tem um motivo:** o limite de 3 códigos por hora por e-mail, a faxina dos vencidos e a cascata que apaga as sessões de um usuário apagado.
- **Datas em segundos Unix**, como número inteiro. Comparar "venceu ou não" vira uma conta simples.

## A faxina diária com Cron Trigger

Códigos e sessões só servem até vencer. Para as tabelas não crescerem para sempre, o Worker ganhou um handler `scheduled`, que a Cloudflare dispara todo dia às 06:00 UTC, sem nenhuma rota HTTP:

```ts
async scheduled(controller, env): Promise<void> {
  const agora = Math.floor(controller.scheduledTime / 1000);
  const [codigos, sessoes] = await env.DB.batch([
    env.DB.prepare('DELETE FROM codigos WHERE expira_em < ?').bind(agora),
    env.DB.prepare('DELETE FROM sessoes WHERE expira_em < ?').bind(agora),
  ]);
  console.log(`Limpeza: ${codigos.meta.changes} código(s) e ${sessoes.meta.changes} sessão(ões)`);
}
```

O `env.DB.batch` manda os dois `DELETE` numa ida só ao banco. Para testar, inserimos no banco local um código e uma sessão já vencidos e disparamos o cron na mão: saíram os dois, e o código ainda válido ficou.

Uma pergunta minha no fim da live rendeu uma correção para a próxima. A faxina não é segurança: ela roda uma vez por dia, então o login vai conferir a validade em toda requisição. E apagar um código assim que ele vence pode zerar a conta do limite de 3 por hora. A correção é só apagar os códigos vencidos que também foram criados há mais de uma hora.

## O Turnstile no Worker

O Turnstile é o "não sou um robô" da Cloudflare, e na maioria das vezes ninguém precisa clicar em nada. Ele funciona em duas partes: o widget, na página, gera um token; o Worker manda esse token para a Cloudflare, junto com a chave secreta, e só aceita o pedido se a resposta for `success: true`.

A conferência ficou em `worker/turnstile.ts`, numa função `verificarTurnstile(token, ip, segredo)`, com uma regra de ouro: **na dúvida, recusa**. Token vazio ou com mais de 2.048 caracteres volta `false` sem nem chamar a Cloudflare. Falha de rede, resposta estranha ou demora de mais de 5 segundos também viram `false`, com o motivo só no log.

Os testes da rota `POST /api/turnstile/teste` com `curl`:

| Caso | Resposta |
|---|---|
| Sem token | 403 `{"ok":false,"erro":"Verificação falhou"}` |
| Campo vazio | 403 |
| Token com 2.049 caracteres | 403 |
| Token de teste da Cloudflare | 200 `{"ok":true}` |
| GET em vez de POST | 405 |

Para mostrar a falha de verdade, trocamos a chave secreta local pela chave de teste da Cloudflare que sempre recusa. No navegador, o widget passou, o Worker recusou com 403, e o motivo (`invalid-input-response`) apareceu só no terminal do `wrangler`.

## A chave secreta, que nunca aparece

O Turnstile tem duas chaves:

- **A sitekey é pública** e vai no HTML de qualquer página com o widget. Mostrar na tela não tem problema.
- **A secret key é a que o Worker usa** para falar com a Cloudflare. Ela não aparece na tela, no chat, no Claude Code nem em arquivo do repositório.

O widget foi criado no painel da Cloudflare, e a chave secreta foi direto para o Worker, sem passar por nenhum arquivo:

```bash
npx wrangler secret put TURNSTILE_SECRET
```

O `wrangler` pede o valor no terminal sem mostrar o que foi colado. No computador de quem contribui, a chave de verdade não é necessária: o `.dev.vars.example` traz a chave de teste pública da Cloudflare que sempre passa, e o `.dev.vars` fica fora do Git:

```bash
cp .dev.vars.example .dev.vars
npm run cf:dev
```

A sitekey também saiu do código, a meu pedido: o build lê a variável `PUBLIC_TURNSTILE_SITEKEY`, cadastrada nas variáveis do GitHub Actions. Se ela estiver vazia, o deploy para no primeiro passo, antes de mexer em qualquer coisa. No computador e no CI, sem a variável, entra a sitekey de teste.

## O widget numa página de teste

A página `/votacao/teste` tem um formulário com o widget e mostra a resposta do Worker sem recarregar. O script da Cloudflare só é carregado nela. Ela tem `noindex` e não entra no menu nem no sitemap: serve para conferir o caminho inteiro, do navegador ao Worker, antes de o login usar o mesmo esquema.

## Os prompts que eu usei

Os quatro pedidos principais eu levei prontos no roteiro e colei no Claude Code, um por bloco da live. Entre um e outro, eu conferia o resultado e pedia o commit.

**1. As tabelas do login, com o SQL antes do arquivo:**

```text
Leia a issue #18 (gh issue view 18), a migração migrations/0001_inicio.sql e o worker/index.ts.
Crie a segunda migração com npx wrangler d1 migrations create eddwan-votos login, com as tabelas do login (o envio do código é da próxima live):
- usuarios: id INTEGER PRIMARY KEY, email_hmac TEXT NOT NULL UNIQUE (nunca o e-mail em texto), criado_em INTEGER NOT NULL (segundos Unix);
- codigos: id INTEGER PRIMARY KEY, email_hmac TEXT NOT NULL, codigo_hash TEXT NOT NULL, expira_em INTEGER NOT NULL, tentativas INTEGER NOT NULL DEFAULT 0, criado_em INTEGER NOT NULL;
- sessoes: token_hash TEXT PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, expira_em INTEGER NOT NULL, criado_em INTEGER NOT NULL.
Índices para o que o login vai consultar: codigos por email_hmac e criado_em (limite de 3 por hora), e expira_em em codigos e sessoes (limpeza).
Atualize a linha esquema da tabela meta para '2'.
Antes de escrever, me mostre o SQL. Depois aplique com --local e mostre as tabelas com npx wrangler d1 execute eddwan-votos --local --command "SELECT name FROM sqlite_master WHERE type IN ('table','index')".
```

**2. A faxina com Cron Trigger:**

```text
Agora a limpeza. Adicione um Cron Trigger no wrangler.jsonc, uma vez por dia às 06:00 UTC, e um handler scheduled no worker/index.ts
que apaga códigos e sessões vencidos (expira_em menor que agora) com env.DB.batch e registra no log quantas linhas saíram de cada tabela.
Nada de rota HTTP para isso. Teste local com npm run cf:dev -- --test-scheduled e curl "http://localhost:8787/__scheduled?cron=0+6+*+*+*",
depois de inserir pelo wrangler d1 execute --local um código e uma sessão já vencidos (a sessão precisa de um usuário de teste).
```

**3. O Turnstile no Worker:**

```text
Agora o Turnstile no Worker. Crie worker/turnstile.ts com uma função verificarTurnstile(token, ip, segredo) que faz POST para
https://challenges.cloudflare.com/turnstile/v0/siteverify com secret, response e remoteip (ip do cabeçalho CF-Connecting-IP) e devolve true só se success for true.
Token vazio ou maior que 2048 caracteres já volta false sem chamar a Cloudflare; falha de rede também é false (fail closed), com o motivo só no log.
Crie a rota POST /api/turnstile/teste: lê o campo cf-turnstile-response do formulário, responde 200 { ok: true } se passou e 403 { ok: false, erro: "Verificação falhou" } se não.
O segredo vem de env.TURNSTILE_SECRET. Para rodar local sem conta: crie .dev.vars.example com TURNSTILE_SECRET=1x0000000000000000000000000000000AA
(chave de teste pública da Cloudflare, que sempre passa), coloque .dev.vars no .gitignore e rode npx wrangler types de novo.
Teste com curl: sem token tem que dar 403; com o token de teste XXXX.DUMMY.TOKEN.XXXX e a chave de teste tem que dar 200.
```

**4. O widget** (a sitekey do eddwan.com estava escrita aqui; depois ela foi para a variável do Actions):

```text
Agora o widget. Coloque em src/consts.ts a chave pública do Turnstile do eddwan.com: TURNSTILE_SITEKEY = "…",
usando a chave de teste 1x00000000000000000000AA quando import.meta.env.DEV for true ou quando o site rodar em localhost.
Crie src/pages/votacao/teste.astro no layout Base com semIndice: um formulário que manda para /api/turnstile/teste com o widget do Turnstile
(script https://challenges.cloudflare.com/turnstile/v0/api.js, carregado só nessa página) e mostra na própria página o resultado da resposta, sem recarregar.
A página não entra no menu nem no sitemap. Teste com npm run cf:dev em localhost:8787/votacao/teste.
Por fim, acrescente na seção "API e banco local" do README como copiar o .dev.vars.example para .dev.vars.
```

O que funcionou bem nesses pedidos:

- **Pedir o SQL antes do arquivo.** Deu para discutir o esquema na tela, e foi aí que entrou o índice que eu não tinha pedido.
- **Dizer o que não pode existir:** "nunca o e-mail em texto", "nada de rota HTTP", "o motivo só no log". O que fica de fora pesa tanto quanto o que entra.
- **Pedir os testes com os casos exatos**, inclusive o que tem que falhar. Mostrar o 403 convence mais do que mostrar o 200.

## Projetos que vocês mandaram no chat

Na live, vocês também mandaram projetos open source no chat. Ficam aqui para quem não estava lá:

- **[Templum](https://github.com/KingDasWinx/Templum)**, enviado pelo Kaleb: um canvas infinito de terminais, nativo, renderizado por GPU e escrito em Rust.
- **[gemini-burn-widget](https://github.com/andremporto/gemini-burn-widget)**, criado e postado pelo André Porto: um widget que monitora o consumo do Gemini e do Antigravity. Por enquanto roda só no Linux, e o André convida quem quiser a fazer um fork.
- **[Donetick](https://github.com/donetick/donetick)**: um app open source para organizar tarefas e afazeres da casa, sozinho ou com outras pessoas. O link apareceu no chat, mas não consegui ler a mensagem em volta. Se foi você quem mandou, me conta nos comentários do vídeo para eu dar o crédito.

Obrigado, Kaleb e André, e obrigado a todos os membros do canal que acompanham as lives, perguntam e mandam projetos. É assim que a lista dos próximos vídeos fica melhor.

## A live seguinte

A Live 5 foi na terça, 24/11: entrou o login de verdade. Você digita o e-mail, recebe um código de 6 dígitos pelo Resend e fica conectado por 30 dias, usando as tabelas e o HMAC desta live. O que foi feito, a gravação, os prompts e a explicação do cookie da sessão estão no [post da Live 5](/blog/live-5-login-por-codigo-de-6-digitos). Quer contribuir? Mande um PR para a `develop` (veja o [CONTRIBUTING.md](https://github.com/eddwan/website/blob/main/CONTRIBUTING.md)).

O código foi escrito ao vivo com o Claude Code, com cada passo revisado por mim na tela antes do commit.
