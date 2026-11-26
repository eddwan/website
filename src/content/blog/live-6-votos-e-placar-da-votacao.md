---
titulo: 'Live 6: votos e placar, um voto por pessoa garantido pelo banco'
descricao: 'Sexta das 10 lives em que eu construo, ao vivo e com o Claude Code, a votação open source do eddwan.com. Com o login pronto, entraram os votos: uma pessoa conectada vota nos candidatos, desfaz o voto e vê o placar, que fica 60 segundos no cache da Cloudflare. Com a gravação, as tabelas, as rotas, os prompts que eu usei e o que vem na próxima live.'
data: 2026-11-25
tipo: artigo
tags: [programação, claude code, open source, cloudflare, segurança]
youtube:
  id: XaWnU-gF8Ek
fontes:
  - titulo: 'Issue #20: votos e placar'
    url: https://github.com/eddwan/website/issues/20
  - titulo: 'PR #58: votos e placar'
    url: https://github.com/eddwan/website/pull/58
  - titulo: 'Cloudflare D1, migrações'
    url: https://developers.cloudflare.com/d1/reference/migrations/
  - titulo: 'Cloudflare Workers, Cache API'
    url: https://developers.cloudflare.com/workers/runtime-apis/cache/
  - titulo: 'SQLite, INSERT com ON CONFLICT (UPSERT)'
    url: https://www.sqlite.org/lang_upsert.html
  - titulo: 'OWASP, redirecionamentos abertos'
    url: https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html
rascunho: false
---

Esta é a sexta das 10 lives em que eu construo a votação open source do eddwan.com, onde quem assiste vai votar nos repositórios dos próximos vídeos. Na [Live 5](/blog/live-5-login-por-codigo-de-6-digitos), o site ganhou o login por código de 6 dígitos. Na quarta, 25/11, o login ganhou um motivo para existir: os votos.

A arquitetura completa está no [post de apresentação](/blog/vou-construir-uma-votacao-open-source-com-custo-zero-a-arquitetura-peca-por-peca), cada live tem a sua issue no [GitHub Project](https://github.com/users/eddwan/projects/5), e o andamento fica na [página de progresso da votação](/votacao/progresso).

## O que ficou pronto

- **Três tabelas novas no D1**: `rodadas`, `repositorios` (os candidatos de cada rodada) e `votos`, na terceira migração do banco.
- **Uma rodada de teste** com 12 candidatos de verdade, tirados da planilha do canal, na quarta migração.
- **`POST /api/votos`** e **`DELETE /api/votos/<dono>/<nome>`**: votar e desfazer, só com login. Votar duas vezes no mesmo repositório não soma nada.
- **`GET /api/votos`**: os votos de quem está conectado, nunca em cache.
- **`GET /api/votacao`**: o placar público, que fica 60 segundos no cache da Cloudflare.
- **A proteção contra CSRF**, que na Live 5 só olhava o POST, agora vale para qualquer método que muda alguma coisa, inclusive o DELETE.
- **A página `/votacao`**, com o placar e o botão "Votar", e a `/entrar` voltando para a votação depois do login.

Tudo entrou pelo [PR #58](https://github.com/eddwan/website/pull/58), foi para o ar no fim da live, e a [issue #20](https://github.com/eddwan/website/issues/20) foi fechada. No ar, o [eddwan.com/api/saude](https://eddwan.com/api/saude) agora responde `"esquema":"3"`. A página [eddwan.com/votacao](https://eddwan.com/votacao) já funciona, mas fica fora do menu e dos buscadores até a votação abrir, na Live 10.

## Um voto por pessoa, garantido pelo banco

A regra mais importante da votação é "cada pessoa vota uma vez em cada repositório". Dava para conferir isso no código do Worker: antes de gravar, procurar se o voto já existe. Só que aí são dois passos, e dois pedidos ao mesmo tempo podem passar juntos pela conferência e gravar dois votos.

Por isso a regra ficou no próprio banco, na chave primária da tabela `votos`:

```sql
CREATE TABLE votos (
  rodada_id INTEGER NOT NULL,
  repo TEXT NOT NULL,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  criado_em INTEGER NOT NULL,
  PRIMARY KEY (rodada_id, repo, usuario_id),
  FOREIGN KEY (rodada_id, repo) REFERENCES repositorios(rodada_id, repo) ON DELETE CASCADE
);
```

A combinação rodada + repositório + pessoa só pode existir uma vez. Não importa quantos pedidos cheguem nem de onde: o banco recusa a segunda linha.

O voto fica ligado ao `usuario_id`, e não ao e-mail. Como explicado na [Live 4](/blog/live-4-tabelas-do-login-e-turnstile-na-cloudflare), o banco nem conhece o seu e-mail, só o HMAC dele. Os dois `ON DELETE CASCADE` fazem a faxina sozinhos: se uma conta ou um candidato for apagado, os votos ligados a eles vão junto.

As outras duas tabelas são simples. A `rodadas` tem o título e a coluna `aberta`, com um `CHECK (aberta IN (0, 1))`. A `repositorios` guarda os candidatos de cada rodada, com o repositório no formato `dono/nome`, como no GitHub. E um índice em `votos(usuario_id)` deixa rápido achar os votos de uma pessoa (e a cascata, que sem ele varreria a tabela inteira).

A quarta migração carrega a "Rodada de teste (lives)", aberta, com os 12 candidatos. O Claude Code leu o JSON com a lista, gerado a partir da planilha do canal, e escreveu os `INSERT` com as aspas simples escapadas.

## Votar duas vezes não soma, e não dá erro

Com a chave primária, o segundo voto no mesmo repositório daria erro no banco. Mas, para quem usa, votar de novo não é um erro: pode ser um clique duplo ou a internet que repetiu o pedido. Então o `INSERT` usa `ON CONFLICT DO NOTHING`:

```sql
INSERT INTO votos (rodada_id, repo, usuario_id, criado_em) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING
```

Votar de novo responde 200 igual, com o mesmo total. Desfazer funciona do mesmo jeito: apagar um voto que não existe também responde 200. Em HTTP, isso tem nome: as rotas são **idempotentes**, repetir o pedido deixa tudo como a primeira vez deixou.

A rota faz três checagens antes de gravar, cada uma com a sua resposta:

| Situação | Resposta |
|---|---|
| Sem login | 401 "Entre para votar" |
| Nenhuma rodada aberta | 409 "Nenhuma votação aberta" |
| Repositório que não é candidato da rodada | 404 |
| Deu certo | 200 `{ ok: true, repo, votado, votos }` |

A rodada aberta e o "é candidato?" saem de uma consulta só. E a gravação e a contagem rodam juntas numa transação (`env.DB.batch`), então o total que volta já inclui o voto que acabou de entrar.

Para não repetir a leitura do cookie em cada rota, entrou o `usuarioDaSessao(request, env)`, que devolve o `usuario_id` da sessão válida ou `null`. O `/api/eu`, da Live 5, passou a usar o mesmo.

## O cookie que não foi

No primeiro teste com `curl`, tudo deu 401, até depois do login. Parecia que a sessão tinha quebrado, mas era o terminal. O comando guardava as opções do cookie numa variável, `K="-b cookies.txt"`, e usava `curl $K`. No bash, isso vira duas palavras, `-b` e `cookies.txt`. No zsh, o shell padrão do Mac, uma variável sem aspas não é dividida, e o `curl` recebia um argumento só, que não entendia como cookie. Com o `-b` escrito direto no comando, os testes passaram:

| Teste | Resultado |
|---|---|
| Votar sem cookie | 401 |
| Votar | 200, `votos: 1` |
| Votar de novo no mesmo | 200, `votos: 1` |
| `GET /api/votos` | o voto na lista, com `Cache-Control: no-store` |
| Desfazer | 200, `votos: 0` |
| Repositório que não é candidato | 404 |
| DELETE com `Origin: https://exemplo.com` | 403 |
| Rodada fechada no banco local | 409 |

## CSRF em todo método que muda alguma coisa

Na Live 5, a proteção contra CSRF recusava todo POST em `/api` vindo de outro site. Com o DELETE para desfazer o voto, a regra mudou de "todo POST" para "todo método que não seja só leitura":

```ts
const metodoSeguro = request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS';
```

Fora desses três, um pedido com o cabeçalho `Origin` de outro site recebe 403 "Origem não permitida". Escrito assim, um PUT ou um PATCH que entre no futuro já nasce protegido.

## O placar com 60 segundos de cache

O placar é a parte mais acessada da votação: todo mundo que abre a página pede o placar. Se cada visita consultasse o D1, o banco trabalharia à toa, porque o placar quase não muda de um segundo para o outro. Então o `GET /api/votacao` guarda a resposta por 60 segundos no cache da própria Cloudflare, com o `caches.default`:

```ts
const guardada = await cache.match(chave);
if (guardada) return guardada;
// ... consulta o D1 ...
const resposta = json(corpo, 200, { 'Cache-Control': 'public, max-age=60' });
ctx.waitUntil(cache.put(chave, resposta.clone()));
```

O `ctx.waitUntil` grava no cache depois de a resposta sair, sem fazer ninguém esperar. A chave do cache é só o endereço, sem a query string: `/api/votacao?x=1` não cria uma entrada nova nem fura o cache.

No teste local, o log mostrou a diferença: a primeira chamada veio do banco em 34 ms, a segunda do cache em 4 ms. Depois de um voto, o placar só mudou 56 segundos depois, quando o cache venceu.

O placar inteiro sai de uma consulta só, com `LEFT JOIN` e `GROUP BY`. O `LEFT JOIN` faz o candidato sem nenhum voto aparecer com 0, em vez de sumir da lista. A ordem é do mais votado ao menos votado, com empate em ordem alfabética.

## Por que os seus votos não vêm no placar

Seria cômodo o placar já dizer "você votou nestes". Só que essa resposta fica 60 segundos num cache compartilhado. Se ela tivesse algo da pessoa que pediu, a resposta de uma pessoa poderia ser entregue a outra. Para evitar isso, o cache teria de ser separado por pessoa, e cada visita voltaria a consultar o banco.

Por isso o `/api/votacao` nem lê o cookie: ele é igual para todo mundo. O que é de cada um fica no `GET /api/votos`, sempre com `no-store`, e a página busca os dois ao mesmo tempo e junta as respostas.

E quando você vota, não precisa esperar o cache: a rota de votar devolve o total atualizado daquele repositório, e a página troca o número do cartão na hora. Quem chegar depois vê o placar novo em até 60 segundos.

## A página `/votacao` e a volta depois do login

A página mostra o título da rodada e um cartão por candidato, no mesmo visual da [/repositorios](/repositorios): o nome com o link para o GitHub, o resumo, o total de votos e o botão "Votar", que vira "Votado ✓ · desfazer". As mensagens saem numa região `aria-live`, que o leitor de tela anuncia sozinho.

Sem login, o botão leva para `/entrar?volta=/votacao`, e a `/entrar` passou a mandar você de volta depois de conectar. Esse `?volta=` é um clássico de falha de segurança, o **redirecionamento aberto**: se a página aceitasse qualquer endereço, alguém poderia mandar um link `eddwan.com/entrar?volta=https://site-falso.com`, e a pessoa sairia do login direto num golpe.

A regra pedida foi "só caminhos que começam com `/` e não com `//`", porque `//site-falso.com` é outro site para o navegador. O Claude Code foi além e conferiu também o destino final com `new URL`:

```ts
function destinoDeVolta(): string | null {
  const volta = new URLSearchParams(location.search).get('volta');
  if (!volta || !volta.startsWith('/') || volta.startsWith('//')) return null;
  try {
    const destino = new URL(volta, location.origin);
    if (destino.origin !== location.origin) return null;
    return destino.pathname + destino.search + destino.hash;
  } catch {
    return null;
  }
}
```

A segunda conferência pega truques que a primeira deixaria passar. O navegador trata `\` como `/` e ignora tabulações no endereço, então `/\site-falso.com` e `/%09/site-falso.com` virariam outro site. Todos esses casos, mais `https://…` e `javascript:`, foram recusados no teste. Se a volta não servir, a pessoa simplesmente fica na `/entrar`.

## O deploy já aplica as migrações

No fim da live, o PR anotava que as migrações precisavam ser aplicadas à mão no banco do ar antes do merge. Não precisavam: o `deploy.yml` do GitHub Actions já roda `wrangler d1 migrations apply --remote` antes de publicar, desde a [Live 3](/blog/live-3-api-e-banco-d1-na-cloudflare). O merge na `main` levou as tabelas, a rodada de teste e a página juntos.

## Os prompts que eu usei

Os pedidos principais eu levei prontos no roteiro e colei no Claude Code, um por bloco da live. Entre um e outro, eu conferia o resultado e pedia o commit.

**1. As tabelas e a rodada de teste:**

```text
Leia a issue #20 (gh issue view 20), as migrações em migrations/ e o worker/index.ts.
Crie a terceira migração com npx wrangler d1 migrations create eddwan-votos votos:
- rodadas: id INTEGER PRIMARY KEY, titulo TEXT NOT NULL, aberta INTEGER NOT NULL DEFAULT 0 (só 0 ou 1, com CHECK), criado_em INTEGER NOT NULL;
- repositorios (os candidatos de cada rodada): rodada_id INTEGER NOT NULL REFERENCES rodadas(id), repo TEXT NOT NULL (dono/nome, como no GitHub),
  nome TEXT NOT NULL, url TEXT NOT NULL, resumo TEXT NOT NULL, criado_em INTEGER NOT NULL, PRIMARY KEY (rodada_id, repo);
- votos: rodada_id INTEGER NOT NULL, repo TEXT NOT NULL, usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, criado_em INTEGER NOT NULL,
  PRIMARY KEY (rodada_id, repo, usuario_id), FOREIGN KEY (rodada_id, repo) REFERENCES repositorios(rodada_id, repo) ON DELETE CASCADE.
Um índice em votos(usuario_id), para achar os votos de uma pessoa. Atualize a linha esquema da tabela meta para '3'.
Depois crie uma quarta migração (rodada_teste) com a carga: a rodada 1, "Rodada de teste (lives)", aberta, e os 12 candidatos do arquivo
live-06-candidatos.json, com criado_em = unixepoch() e as aspas simples escapadas.
Antes de escrever, me mostre o SQL da 0003. Depois aplique as duas com --local e mostre SELECT rodada_id, COUNT(*) FROM repositorios GROUP BY rodada_id.
```

**2. Votar e desfazer:**

```text
Agora os votos, no worker/index.ts. Crie usuarioDaSessao(request, env), que reaproveita lerTokenSessao e devolve o usuario_id da sessão válida ou null, e use no /api/eu também.
A rodada aberta é a de maior id com aberta = 1.
- POST /api/votos com JSON { repo }: sem sessão, 401 { ok: false, erro: "Entre para votar" }; sem rodada aberta, 409; repo que não é candidato da rodada aberta, 404.
  Grava com INSERT ... ON CONFLICT DO NOTHING: votar de novo no mesmo repositório responde 200 igual, sem somar. Responde { ok: true, repo, votado: true, votos } com o total atual do repositório.
- DELETE /api/votos/<dono>/<nome>: mesmas regras; apaga só o voto dessa pessoa; sem voto, 200 igual. Responde { ok: true, repo, votado: false, votos }.
- GET /api/votos: a lista dos repos em que a pessoa votou na rodada aberta ({ conectado: false } sem sessão), com Cache-Control: no-store.
A proteção contra CSRF hoje só olha POST: passe a recusar com 403 qualquer método que não seja GET, HEAD ou OPTIONS vindo de outro Origin.
Teste com curl -c e -b (o código aparece no terminal do cf:dev, como na Live 5): POST sem cookie 401; votar 200; votar de novo no mesmo, o total não muda;
GET /api/votos lista o voto; DELETE 200 e o total volta; repo que não existe 404; DELETE com Origin https://exemplo.com 403.
```

**3. O placar:**

```text
Agora o placar. Crie GET /api/votacao, público: a rodada aberta ({ id, titulo }) e os candidatos com repo, nome, url, resumo e votos,
do mais votado ao menos votado (empate em ordem alfabética), numa consulta só com LEFT JOIN e GROUP BY. Sem rodada aberta: { rodada: null, candidatos: [] }.
A resposta não pode ter nada de quem pediu (nem ler o cookie) e fica 60 segundos em cache: Cache-Control: public, max-age=60,
guardada com caches.default no Worker (chave = a URL, sem cookie) para o D1 não ser consultado a cada visita.
Explique num comentário por que os votos da pessoa ficam no GET /api/votos e não aqui.
Teste: duas chamadas seguidas, mostrando no log que a segunda veio do cache; votar e conferir que o placar só muda depois de até 60 segundos.
```

**4. A página:**

```text
Por fim, a página. Crie src/pages/votacao/index.astro no layout Base com semIndice, no visual do site (cartões como os da /repositorios), sem dependência nova:
ao abrir, busca /api/votacao e /api/votos ao mesmo tempo e mostra o título da rodada e cada candidato com o nome (link para o GitHub), o resumo,
o total de votos e um botão "Votar" que vira "Votado ✓ · desfazer".
Sem login, o botão leva para /entrar?volta=/votacao; a /entrar passa a voltar para esse caminho depois de conectar, aceitando só caminhos
que começam com "/" e não com "//" (nunca outro site; se não servir, fica na /entrar).
Ao votar ou desfazer, atualiza o total daquele cartão com o número que a API devolveu, sem recarregar e sem esperar o cache do placar. Mensagens em aria-live.
A página fica fora do menu e do sitemap (a votação abre na Live 10). A /votacao/progresso e a /votacao/teste continuam como estão.
Teste em localhost:8787/votacao: entrar, votar em dois, desfazer um, recarregar e conferir que os votos continuam marcados.
```

O que funcionou bem nesses pedidos:

- **Colocar a regra mais importante no banco, e não no código.** "Um voto por pessoa" virou uma chave primária, e nenhum pedido duplicado consegue furar.
- **Dizer o que a resposta não pode ter.** "Nada de quem pediu, nem ler o cookie" deixou o placar seguro para o cache antes de existir uma linha de código, e o comentário pedido explica o porquê para quem ler depois.
- **Pedir os testes com os casos que têm que falhar.** O voto repetido que não soma, o 409 sem rodada e o 403 do outro site mostram mais do que o 200 do caminho feliz.
- **Deixar o Claude Code ir além, mas pedir que ele conte.** A conferência extra do `?volta=` com `new URL` não estava no pedido; ele fez, testou os truques com `\` e tabulação e explicou cada um.

## Próxima live

A Live 7 é nesta quinta, 26/11, às 20h: entram as sugestões. Qualquer pessoa conectada vai poder sugerir um repositório pelo link do GitHub, e o Worker confere sozinho a licença, o último commit e as estrelas antes de aceitar ([issue #21](https://github.com/eddwan/website/issues/21)). Quer ajudar antes disso? Mande um PR para a `develop` (veja o [CONTRIBUTING.md](https://github.com/eddwan/website/blob/main/CONTRIBUTING.md)).

O código foi escrito ao vivo com o Claude Code, com cada passo revisado por mim na tela antes do commit.
