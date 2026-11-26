---
titulo: 'Live 5: login por e-mail com código de 6 dígitos, sem senha'
descricao: 'Quinta das 10 lives em que eu construo, ao vivo e com o Claude Code, a votação open source do eddwan.com. O site ganhou o login: você digita o e-mail, recebe um código de 6 dígitos pelo Resend e fica conectado por 30 dias, sem senha e sem nenhum e-mail guardado em texto. Com a gravação, os limites contra abuso, o cookie da sessão, a proteção contra CSRF, os prompts que eu usei e o que vem na próxima live.'
data: 2026-11-24
tipo: artigo
tags: [programação, claude code, open source, cloudflare, segurança]
youtube:
  id: wM2llZxqlw0
fontes:
  - titulo: 'Issue #19: login por código de 6 dígitos'
    url: https://github.com/eddwan/website/issues/19
  - titulo: 'PR #54: login por código de 6 dígitos'
    url: https://github.com/eddwan/website/pull/54
  - titulo: 'Resend, enviar e-mail pela API'
    url: https://resend.com/docs/api-reference/emails/send-email
  - titulo: 'Cloudflare Workers, Rate Limiting'
    url: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
  - titulo: 'MDN, cookies com o prefixo __Host-'
    url: https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#cookie_prefixes
  - titulo: 'OWASP, prevenção de CSRF'
    url: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
rascunho: false
---

Esta é a quinta das 10 lives em que eu construo a votação open source do eddwan.com, onde quem assiste vai votar nos repositórios dos próximos vídeos. Na [Live 4](/blog/live-4-tabelas-do-login-e-turnstile-na-cloudflare), o banco ganhou as tabelas do login e a API ganhou o Turnstile, o anti-robô da Cloudflare. Na terça, 24/11, essas peças viraram um login de verdade: você digita o e-mail, recebe um código de 6 dígitos e fica conectado.

A arquitetura completa está no [post de apresentação](/blog/vou-construir-uma-votacao-open-source-com-custo-zero-a-arquitetura-peca-por-peca), cada live tem a sua issue no [GitHub Project](https://github.com/users/eddwan/projects/5), e o andamento fica na [página de progresso da votação](/votacao/progresso).

## O que ficou pronto

- **`POST /api/entrar`**: recebe o e-mail e o token do Turnstile, gera um código de 6 dígitos que vale 10 minutos e manda pelo Resend.
- **`POST /api/verificar`**: confere o código, com no máximo 5 tentativas, cria a conta no primeiro login e abre uma sessão de 30 dias num cookie.
- **`GET /api/eu`** e **`POST /api/sair`**: dizem se você está conectado e encerram a sessão.
- **Limites contra abuso**: 5 pedidos por minuto por IP, sem guardar o IP, e 3 códigos por hora para o mesmo e-mail.
- **Proteção contra CSRF**: todo POST em `/api` vindo de outro site recebe 403.
- **A tela `/entrar`**, com os três passos (e-mail, código e "Você está conectado") sem recarregar a página.
- **A correção da faxina diária** que tinha ficado combinada na Live 4.

Tudo entrou pelo [PR #54](https://github.com/eddwan/website/pull/54), foi para o ar no fim da live, e a [issue #19](https://github.com/eddwan/website/issues/19) foi fechada. A página [eddwan.com/entrar](https://eddwan.com/entrar) já existe, mas fica fora do menu e dos buscadores: o login só vai ter utilidade quando a votação abrir, na Live 10.

## Por que código no e-mail, e não senha

Senha dá trabalho para os dois lados. Você precisa criar e lembrar mais uma, e eu preciso guardar, proteger e oferecer um "esqueci minha senha", que no fim manda um link para o seu e-mail do mesmo jeito. Se o e-mail já é a prova de quem você é, dá para pular a senha: o site manda um código, você digita, e pronto.

O caminho inteiro:

1. Você digita o e-mail em `/entrar`, o Turnstile confere que não é um robô, e o navegador chama `POST /api/entrar`.
2. O Worker gera o código, guarda só o HMAC dele no banco e manda o código pelo Resend.
3. Você digita o código, e o navegador chama `POST /api/verificar`.
4. Código certo: o Worker cria a sua conta (se for a primeira vez) e devolve um cookie de sessão que vale 30 dias.

Em nenhum momento o seu e-mail fica guardado em texto. Como explicado no post da Live 4, o banco só conhece o `email_hmac`.

## A faxina que não podia apagar cedo demais

A live começou pela correção que tinha ficado da Live 4. A faxina diária apagava todo código vencido, mas o limite de 3 códigos por hora conta justamente as linhas criadas na última hora. Um código vence em 10 minutos: se a faxina rodasse logo depois, apagaria códigos que ainda contam para o limite, e a conta voltaria a zero antes da hora.

A correção foi uma condição a mais no `DELETE`:

```ts
const umaHoraAtras = agora - 3600; // mesma janela do limite de códigos por hora
env.DB.prepare('DELETE FROM codigos WHERE expira_em < ? AND criado_em < ?').bind(agora, umaHoraAtras),
```

No teste local, com dois códigos já vencidos, o criado há 10 minutos ficou e o criado há 2 horas saiu.

De quebra, descobrimos que o comando de teste do cron documentado na Live 4 não funciona mais: o `curl /__scheduled` cai no 404 do Astro, porque o Worker só atende `/api/*`. Na versão atual do `wrangler`, o cron local se dispara por outra rota, e o comentário no `wrangler.jsonc` foi corrigido.

## O código de 6 dígitos, sem número favorito

O código sai de `worker/cripto.ts`, só com a Web Crypto, sem nenhuma biblioteca. A parte curiosa é o sorteio. O jeito óbvio seria pegar um número aleatório de 32 bits e fazer `% 1_000_000`. Só que 2³² (4.294.967.296) não é múltiplo de 1.000.000: sobram 967.296 valores no fim, e eles caem nos códigos de 000000 a 967295. Esses códigos sairiam um pouquinho mais vezes que os outros.

A solução é descartar a sobra e sortear de novo:

```ts
const LIMITE_SEM_VIES = Math.floor(2 ** 32 / 1_000_000) * 1_000_000; // 4.294.000.000

export function gerarCodigo(): string {
  const sorteio = new Uint32Array(1);
  do {
    crypto.getRandomValues(sorteio);
  } while (sorteio[0] >= LIMITE_SEM_VIES);
  return String(sorteio[0] % 1_000_000).padStart(6, '0');
}
```

O descarte acontece em menos de 0,03% dos sorteios, então na prática o laço roda uma vez. O `padStart` garante que o código 42 vire `000042`.

## O `/api/entrar`, das checagens baratas para as caras

Antes de escrever, pedi ao Claude Code o plano, e ele organizou as checagens da mais barata para a mais cara. O que pode ser recusado sem custo é recusado primeiro:

| # | Checagem | Se falhar |
|---|---|---|
| 1 | Limite por IP (5 a cada 60 segundos) | 429 |
| 2 | JSON e formato do e-mail | 400 |
| 3 | Turnstile | 403 |
| 4 | Limite de 3 códigos por hora para o e-mail | 429 |
| 5 | Envio pelo Resend | 503 |
| — | Deu tudo certo | 200 `{ ok: true }` |

O limite por IP usa o [Rate Limiting dos Workers](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), configurado no `wrangler.jsonc`. O IP só serve de chave do contador e nunca vai para o banco.

O limite por e-mail tem um detalhe: a contagem e a gravação acontecem num comando só. Se fossem dois (primeiro contar, depois gravar), dois pedidos ao mesmo tempo poderiam contar 2 e gravar juntos o terceiro e o quarto código:

```sql
INSERT INTO codigos (email_hmac, codigo_hash, expira_em, criado_em)
SELECT ?1, ?2, ?3, ?4
WHERE (SELECT COUNT(*) FROM codigos WHERE email_hmac = ?1 AND criado_em > ?5) < ?6
```

Se o `INSERT` não gravou nada, é porque o limite foi atingido, e a resposta é 429.

Quando dá certo, a resposta é sempre a mesma, `{ ok: true }`, tenha o e-mail conta ou não. Assim, ninguém usa o login para descobrir quem está cadastrado.

## O 403 que estava certo

O primeiro teste com `curl` deu 403 "Verificação falhou", e parecia que a rota tinha quebrado. Não tinha. No meu `.dev.vars` estava a chave de teste do Turnstile que começa com `2x`, a que **sempre recusa**: foi ela que usamos na Live 4 para mostrar a falha, e ela ficou lá. A que sempre aceita começa com `1x`. Troquei a linha, reiniciei o `npm run cf:dev` (o `.dev.vars` só é lido quando o servidor sobe) e o pedido passou.

Vale para quem for contribuir: copie o `.dev.vars.example`, que já traz a chave `1x`.

## O envio pelo Resend

O [Resend](https://resend.com/) manda o e-mail com o código. O envio fica em `worker/email.ts`, com `fetch` direto na API, sem instalar SDK. O e-mail sai de `login@eddwan.com`, com o código grande, a validade de 10 minutos e a frase "Se não foi você, é só ignorar este e-mail". Ele não tem nenhum link, porque um e-mail de login com link é exatamente o que um golpe de phishing imita.

Três cuidados:

- **No computador de quem desenvolve, nada é enviado.** Com `EMAIL_MODO=console` no `.dev.vars`, o código aparece no terminal do `wrangler`.
- **Se o envio falhar, o código é apagado** e a resposta é 503. Assim, um erro do nosso lado não gasta um dos 3 códigos da hora.
- **O e-mail de quem pede nunca vai para o log.** Nem no modo console: lá aparecem só o código e o começo do `email_hmac`. Até a mensagem de erro do Resend, que pode repetir o destinatário, tem o endereço trocado por `[e-mail]` antes de ir para o log.

Para mostrar o 503, rodamos o servidor com uma chave falsa na linha de comando:

```bash
EMAIL_MODO=resend RESEND_API_KEY=chave-falsa npm run cf:dev
```

O Resend respondeu 401, o Worker apagou o código e devolveu `503 {"ok":false,"erro":"Não foi possível enviar o código"}`.

As chaves de verdade foram para o Worker com `npx wrangler secret put`, que pede o valor no terminal sem mostrar nada. Nenhuma delas apareceu na tela, no chat ou em arquivo do repositório:

- `RESEND_API_KEY`, a chave do Resend;
- `EMAIL_PEPPER`, a chave do HMAC dos e-mails e dos códigos, gerada com `openssl rand -base64 32`.

## O `/api/verificar` e a sessão

O `/api/verificar` pega o código mais recente e ainda válido do e-mail. Três cuidados contra quem tenta adivinhar:

- **No máximo 5 tentativas por código.** Com 6 dígitos, são 5 chances em 1 milhão; depois disso, só pedindo um código novo.
- **A tentativa é reservada antes da comparação**, com `UPDATE … WHERE tentativas < 5`. Assim, mandar 50 tentativas ao mesmo tempo não fura o limite.
- **A comparação leva sempre o mesmo tempo** (`crypto.subtle.timingSafeEqual`), para o tempo de resposta não dar pista de quantos dígitos estavam certos.

Com o código certo, três comandos rodam numa transação só (`env.DB.batch`): cria o usuário se ele não existir, grava a sessão e apaga os códigos daquele e-mail. A sessão só é gravada se o código ainda existir, então o mesmo código não vale duas vezes.

A sessão é um token de 32 bytes aleatórios. No banco fica só o SHA-256 dele; no seu navegador, o token, neste cookie:

```text
__Host-sessao=<token>; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000
```

Cada pedaço tem um motivo:

- **`__Host-`**: o navegador só aceita esse cookie se ele vier por HTTPS, sem `Domain` e com `Path=/`. Um subdomínio não consegue criar um cookie com o mesmo nome.
- **`HttpOnly`**: o JavaScript da página não lê o cookie. Se um dia entrar um script malicioso no site, ele não consegue roubar a sessão.
- **`Secure`**: o cookie só viaja por HTTPS.
- **`SameSite=Lax`**: o navegador não manda o cookie em POSTs vindos de outros sites.
- **`Max-Age=2592000`**: 30 dias, em segundos. É por isso que você continua conectado depois de fechar o navegador.

O `GET /api/eu` responde `{ conectado: true, desde }` ou `{ conectado: false }`, e nunca devolve e-mail. O `POST /api/sair` apaga a sessão no banco e o cookie.

## CSRF em uma linha

CSRF é quando outro site faz o seu navegador mandar um pedido para o eddwan.com, aproveitando que você está conectado. O `SameSite=Lax` já cobre a maior parte disso, e entrou uma segunda trava: todo POST em `/api` com o cabeçalho `Origin` de outro site recebe 403 "Origem não permitida".

O roteiro inteiro foi testado com `curl`, guardando o cookie num arquivo (`-c` grava, `-b` manda de volta):

| Passo | Resultado |
|---|---|
| 5 códigos errados | 400 "Código inválido" nas cinco |
| Sexta tentativa | 429 "Tentativas esgotadas. Peça um código novo." |
| Pedido novo e código certo | 200, com o cookie `__Host-sessao` |
| `GET /api/eu` | `{"conectado":true,"desde":"…"}` |
| `POST /api/sair` | 200 |
| `GET /api/eu` de novo | `{"conectado":false}` |
| POST com `Origin: https://exemplo.com` | 403 |

## A tela `/entrar`

A página tem três passos, que trocam sem recarregar:

1. **E-mail e Turnstile**, com o botão "Receber código".
2. **O código**, num campo com `inputmode="numeric"` (abre o teclado numérico no celular) e `autocomplete="one-time-code"` (o celular sugere o código que acabou de chegar).
3. **"Você está conectado"**, com o botão "Sair".

Ao abrir, a página consulta o `/api/eu` e já mostra o passo certo. As mensagens de erro ficam numa região `aria-live`, que o leitor de tela anuncia sem a pessoa precisar procurar. O script do Turnstile só carrega quando o passo do e-mail aparece.

## Os prompts que eu usei

Os pedidos principais eu levei prontos no roteiro e colei no Claude Code, um por bloco da live. Entre um e outro, eu conferia o resultado e pedia o commit.

**1. O `/api/entrar`, com o plano antes do código:**

```text
Leia a issue #19 (gh issue view 19), a migração migrations/0002_login.sql, o worker/index.ts e o worker/turnstile.ts.
Crie worker/cripto.ts só com a Web Crypto: normalizarEmail (trim e minúsculas), hmac(segredo, texto) em hex, sha256(texto) em hex,
gerarCodigo() com 6 dígitos sem viés de módulo (crypto.getRandomValues com rejeição) e gerarToken() com 32 bytes em base64url.
Crie POST /api/entrar, que recebe JSON { email, turnstile }:
- 403 se o Turnstile falhar e 400 se o e-mail não tiver formato válido;
- limite por IP com o Rate Limiting dos Workers (binding LIMITE_IP no wrangler.jsonc, 5 pedidos a cada 60 segundos, chave = CF-Connecting-IP), sem guardar IP no banco; passou do limite, 429;
- email_hmac = HMAC-SHA256 do e-mail normalizado com env.EMAIL_PEPPER; no máximo 3 códigos por email_hmac na última hora (429);
- grava em codigos o HMAC (com EMAIL_PEPPER) de email_hmac + ":" + código, com validade de 10 minutos;
- envia por uma função enviarCodigo(email, codigo, env) em worker/email.ts. Por enquanto só o modo local: se env.EMAIL_MODO for "console", escreve o código no log; senão, lança erro (o Resend entra no próximo passo);
- quando dá certo, responde sempre 200 { ok: true }, sem dizer se o e-mail já tem conta.
Acrescente no .dev.vars.example EMAIL_MODO=console e um EMAIL_PEPPER de teste, com um comentário dizendo que não é o do ar, e rode npx wrangler types.
Me mostre o plano antes de escrever. Depois teste com curl e o token de teste do Turnstile: e-mail inválido (400), pedido certo (200 e o código no terminal), quarto pedido na mesma hora (429).
```

**2. O envio pelo Resend:**

```text
Agora o envio de verdade. Em worker/email.ts, quando EMAIL_MODO não for "console", mande o e-mail pela API do Resend
(POST https://api.resend.com/emails, Authorization: Bearer env.RESEND_API_KEY) com fetch, sem SDK novo:
de "eddwan.com <login@eddwan.com>", assunto "Seu código para entrar no eddwan.com: 123456", texto simples e um HTML curto
com o código grande, a validade de 10 minutos e a frase "Se não foi você, é só ignorar este e-mail". Nenhum link no e-mail.
Se faltar a chave ou o Resend responder erro, /api/entrar apaga o código que acabou de gravar e responde 503 { ok: false, erro: "Não foi possível enviar o código" }, com o motivo só no log.
O e-mail de quem pede nunca vai para o log, nem no modo console: lá aparecem só o código e o começo do email_hmac.
Não abra nem mostre .dev.vars. Para testar o 503, rode o cf:dev com EMAIL_MODO=resend e RESEND_API_KEY=chave-falsa na linha de comando.
```

**3. A sessão, o `/api/eu`, o `/api/sair` e o CSRF:**

```text
Agora a sessão. Crie:
- POST /api/verificar com JSON { email, codigo }, com o mesmo LIMITE_IP: pega o código mais recente e ainda válido desse email_hmac;
  com 5 tentativas já feitas, 429; código errado soma uma tentativa e responde 400 { ok: false, erro: "Código inválido" };
  código certo, num env.DB.batch: apaga os códigos desse email_hmac, cria o usuário se não existir (INSERT ... ON CONFLICT(email_hmac) DO NOTHING)
  e grava em sessoes o SHA-256 de um token novo, com validade de 30 dias. Responde 200 com o cookie
  __Host-sessao=<token>; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000.
- GET /api/eu: lê o cookie, procura a sessão pelo hash com expira_em maior que agora e responde { conectado: true, desde } ou { conectado: false }. Nunca devolve e-mail.
- POST /api/sair: apaga a sessão no banco e o cookie (Max-Age=0).
Em todo POST de /api, responda 403 quando o cabeçalho Origin existir e não for o do próprio site (proteção contra CSRF).
Teste com curl -c e -b num arquivo de cookies: código errado 5 vezes e a sexta tentativa 429; pedido novo e código certo; /api/eu conectado; /api/sair; /api/eu desconectado; POST com Origin https://exemplo.com dando 403.
```

**4. A tela:**

```text
Por fim, as telas. Crie src/pages/entrar.astro no layout Base com semIndice, no visual do site, sem dependência nova:
passo 1, e-mail + widget do Turnstile (mesmo esquema da /votacao/teste, com turnstileSitekey(location.hostname)) e botão "Receber código";
passo 2, campo de 6 dígitos (inputmode="numeric", autocomplete="one-time-code") e botão "Entrar";
no fim, "Você está conectado" com o botão "Sair". Ao abrir a página, consulte /api/eu para já mostrar o estado certo.
Mensagens de erro em português, sem recarregar a página e acessíveis (aria-live). A página não entra no menu nem no sitemap (a votação abre na Live 10).
Teste em localhost:8787/entrar com o código que aparece no terminal; depois feche e abra o navegador e confira que continua conectado.
```

O que funcionou bem nesses pedidos:

- **Pedir o plano antes do código.** A tabela das checagens, da mais barata para a mais cara, saiu daí, e deu para discutir a ordem na tela antes de existir uma linha de código.
- **Proibir o que não pode vazar:** "nunca o e-mail no log", "não abra nem mostre .dev.vars", "nunca devolve e-mail". O Claude Code foi além e tirou o e-mail até das mensagens de erro do Resend.
- **Pedir os testes com os casos que têm que falhar.** O 429 da sexta tentativa e o 403 do outro site mostram mais do que o 200 do caminho feliz.
- **Deixar o Claude Code ir além, mas pedir que ele conte.** A reserva da tentativa antes da comparação e a comparação em tempo constante não estavam no pedido; ele fez e explicou o porquê de cada uma.

## A live seguinte

Na [Live 6](/blog/live-6-votos-e-placar-da-votacao), na quarta, 25/11, o login ganhou um motivo para existir: entraram os votos e o placar. Uma pessoa conectada vota nos candidatos, desfaz o voto e vê o placar, sem conseguir votar duas vezes no mesmo repositório ([issue #20](https://github.com/eddwan/website/issues/20)).

O código foi escrito ao vivo com o Claude Code, com cada passo revisado por mim na tela antes do commit.
