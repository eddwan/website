---
titulo: 'Live 7: sugestões de repositórios conferidas na API do GitHub'
descricao: 'Sétima das 10 lives em que eu construo, ao vivo e com o Claude Code, a votação open source do eddwan.com. Entraram as sugestões: quem está conectado cola o link de um repositório, e o Worker confere no GitHub se ele existe, tem licença, estrelas e commit recente. No fim, ainda deu tempo de criar a remoção de uma sugestão pendente. Com a gravação, a tabela, as rotas, os prompts que eu usei e o que vem na próxima live.'
data: 2026-11-26
tipo: artigo
tags: [programação, claude code, open source, cloudflare, segurança]
youtube:
  id: jnrvzi6fhCA
fontes:
  - titulo: 'Issue #21: sugestões validadas no GitHub'
    url: https://github.com/eddwan/website/issues/21
  - titulo: 'PR #62: sugestões de repositórios validadas no GitHub'
    url: https://github.com/eddwan/website/pull/62
  - titulo: 'GitHub REST API, obter um repositório'
    url: https://docs.github.com/rest/repos/repos#get-a-repository
  - titulo: 'GitHub REST API, obter um commit'
    url: https://docs.github.com/rest/commits/commits#get-a-commit
  - titulo: 'OWASP, Server-Side Request Forgery (SSRF)'
    url: https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html
  - titulo: 'MDN, o elemento <dialog>'
    url: https://developer.mozilla.org/pt-BR/docs/Web/HTML/Element/dialog
rascunho: false
---

Esta é a sétima das 10 lives em que eu construo a votação open source do eddwan.com, onde quem assiste vai votar nos repositórios dos próximos vídeos. Na [Live 6](/blog/live-6-votos-e-placar-da-votacao), entraram os votos e o placar. Na quinta, 26/11, entrou a outra metade da participação: sugerir repositórios novos.

A arquitetura completa está no [post de apresentação](/blog/vou-construir-uma-votacao-open-source-com-custo-zero-a-arquitetura-peca-por-peca), cada live tem a sua issue no [GitHub Project](https://github.com/users/eddwan/projects/5), e o andamento fica na [página de progresso da votação](/votacao/progresso).

## O que ficou pronto

- **A tabela `sugestoes` no D1**, na quinta migração do banco.
- **`worker/github.ts`**, que lê o link colado e confere o repositório na API do GitHub: se existe, se está arquivado, a licença, as estrelas e o último commit.
- **`POST /api/sugestoes`**: sugerir um repositório com um motivo de até 280 caracteres, no máximo 3 por pessoa por dia.
- **`GET /api/sugestoes`**: as sugestões de quem está conectado, nunca em cache.
- **`DELETE /api/sugestoes/<dono>/<nome>`**: desistir de uma sugestão enquanto ela ainda está pendente. Não estava na issue; entrou no fim da live.
- **Uma seção nova na página `/votacao`**, com o cartão "Nova sugestão" e o cartão "Suas sugestões".

Tudo entrou pelo [PR #62](https://github.com/eddwan/website/pull/62), foi para o ar no fim da live, e a [issue #21](https://github.com/eddwan/website/issues/21) foi fechada. No ar, o [eddwan.com/api/saude](https://eddwan.com/api/saude) agora responde `"esquema":"4"`. A página [eddwan.com/votacao](https://eddwan.com/votacao) continua fora do menu e dos buscadores até a votação abrir, na Live 10.

## Uma sugestão por repositório, e uma foto do GitHub

A tabela guarda o repositório duas vezes. Em `repo`, em minúsculas e com `UNIQUE`; em `nome`, com a grafia do GitHub, para mostrar na tela:

```sql
CREATE TABLE sugestoes (
  id INTEGER PRIMARY KEY,
  repo TEXT NOT NULL UNIQUE CHECK (repo = lower(repo)),
  nome TEXT NOT NULL,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  motivo TEXT NOT NULL CHECK (length(motivo) BETWEEN 1 AND 280),
  licenca TEXT NOT NULL,
  estrelas INTEGER NOT NULL,
  ultimo_commit INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'recusada')),
  criado_em INTEGER NOT NULL
);
```

O GitHub não diferencia maiúsculas no endereço: `WithAstro/Astro` e `withastro/astro` são o mesmo repositório. Com o `repo` sempre em minúsculas e único, cada repositório só pode ser sugerido uma vez, por quem quer que seja. O `CHECK (repo = lower(repo))` garante que nenhum código esqueça de converter.

A licença, as estrelas e o último commit são uma foto do GitHub no momento da sugestão. Na Live 8, quando eu for aprovar ou recusar, a decisão sai desses dados, sem consultar o GitHub de novo nem gastar o limite de pedidos do token.

E um índice em `sugestoes(usuario_id, criado_em)` deixa rápida a conta do limite por dia, "quantas essa pessoa mandou nas últimas 24 horas".

## O link colado nunca vira um fetch

A forma mais curta de conferir um repositório seria pegar o link que a pessoa colou e fazer um `fetch` nele. É também a forma mais perigosa. Se o Worker buscasse qualquer endereço recebido, alguém poderia apontar para outro site, para um serviço interno ou para um endereço que gasta o nosso limite, e o pedido sairia da Cloudflare em nosso nome, talvez com o nosso token no cabeçalho. Esse ataque tem nome: **SSRF**, de *Server-Side Request Forgery*.

Por isso o texto recebido só serve para tirar dois pedaços, o dono e o nome. O `lerRepo` aceita o link do GitHub em vários formatos (com `www`, com barra no fim, com `.git`, com `/tree/main/...` depois do nome) ou só `dono/nome`, e confere os dois contra o formato que o GitHub permite:

```ts
const FORMATO_DONO = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const FORMATO_NOME = /^[A-Za-z0-9._-]{1,100}$/;
```

O endereço da API é montado no próprio código, com o host fixo e `encodeURIComponent`:

```ts
const base = `${API}/repos/${encodeURIComponent(dono)}/${encodeURIComponent(nome)}`;
```

O Claude Code testou também os links que têm que ser recusados: `http://` em vez de `https://`, uma porta diferente, `api.github.com`, `withastro/..`, um dono começando com hífen e o clássico `https://github.com@site-falso.com/...`. Nesse último, tudo antes do `@` é usuário e senha, e o site de verdade é o que vem depois. O `new URL` separa as partes, e o código recusa qualquer endereço com usuário ou senha.

## O que o GitHub precisa responder

Com o dono e o nome, o `conferirRepo` faz no máximo duas chamadas, com 5 segundos de limite para as duas juntas:

1. `GET /repos/<dono>/<nome>`, que traz se o repositório existe, se está arquivado, a licença, as estrelas e o branch principal;
2. `GET /repos/<dono>/<nome>/commits/<branch>`, que traz a data do último commit.

Cada regra tem uma mensagem pensada para quem sugeriu:

| Situação | Mensagem |
|---|---|
| Não existe (ou é privado) | "não encontrei esse repositório no GitHub (ele é público?)" |
| Arquivado | "esse repositório está arquivado" |
| Sem licença | "esse repositório não tem licença, e sem licença ninguém pode usar o código" |
| Menos de 20 estrelas | "ainda tem poucas estrelas (mínimo 20)" |
| Último commit com mais de um ano | "o último commit foi há mais de um ano" |
| Sem nenhum commit | "esse repositório está vazio" |

O limite de 20 estrelas filtra repositório recém-criado ou de teste, sem barrar os pequenos e bons. Os dois números ficam em constantes no topo do arquivo, para mudar num lugar só.

O Claude Code mudou uma coisa na ordem do pedido: as estrelas são conferidas antes do commit, porque já vêm na primeira resposta. Um repositório com 3 estrelas é recusado sem a segunda chamada.

Uma surpresa no teste: o `withastro/astro` voltou com a licença `NOASSERTION`, e não MIT. É o que o GitHub responde quando acha um arquivo de licença mas não reconhece qual é. Como existe uma licença, esse caso passa, e a curadoria olha na Live 8.

E quando a culpa não é de quem sugeriu? Se o GitHub demorar, cair ou recusar por limite de pedidos, a resposta é 503 "Não consegui falar com o GitHub agora. Tente de novo em instantes.", e a sugestão não é recusada. O motivo técnico vai só para o log.

## Da checagem mais barata para a mais cara

A rota `POST /api/sugestoes` faz as checagens numa ordem pensada: primeiro as que não custam nada, por último a que chama o GitHub.

| Ordem | Situação | Resposta |
|---|---|---|
| 1 | Sem login | 401 "Entre para sugerir" |
| 2 | Motivo vazio ou com mais de 280 caracteres | 400 |
| 2 | Link que não é de um repositório do GitHub | 400 "Cole o link de um repositório do GitHub, como github.com/dono/nome" |
| 3 | Repositório já sugerido | 200 "Esse já foi sugerido. Obrigado!" |
| 3 | Repositório que já é candidato da rodada | 200 "Esse já está na votação: vote nele!" |
| 4 | Três sugestões nas últimas 24 horas | 429 "Você já sugeriu 3 repositórios hoje. Volte amanhã!" |
| 5 | O GitHub recusou | 422 com o motivo da tabela acima |
| 5 | O GitHub não respondeu | 503 |
| 6 | Deu certo | 201, gravada como pendente |

Repetir uma sugestão responde 200, e não erro, e vem antes do limite de propósito: sugerir um repositório que já está na lista não gasta uma das 3 do dia.

Os 280 caracteres do motivo são contados como o SQLite conta. No JavaScript, `'🚀'.length` é 2; no `length()` do banco, é 1. Por isso a contagem usa `[...motivo].length`, e o mesmo emoji vale 1 na página, na API e no `CHECK` da tabela.

## O limite conferido duas vezes

O limite de 3 por dia é conferido antes do GitHub, para não gastar uma chamada com quem já passou do limite. Só que essa conferência sozinha tem o mesmo problema do voto duplicado da Live 6: dois pedidos ao mesmo tempo passam juntos e gravam a quarta sugestão.

Por isso o limite vai de novo dentro do próprio `INSERT`, como no login da Live 5:

```sql
INSERT INTO sugestoes (repo, nome, usuario_id, motivo, licenca, estrelas, ultimo_commit, criado_em)
SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8
WHERE (SELECT COUNT(*) FROM sugestoes WHERE usuario_id = ?3 AND criado_em > ?9) < ?10
ON CONFLICT(repo) DO NOTHING
```

O `WHERE` só deixa gravar se a pessoa ainda tem vaga, e o `ON CONFLICT(repo) DO NOTHING` cuida de duas pessoas sugerindo o mesmo repositório no mesmo instante: só a primeira entra. Se nada foi gravado, a rota descobre qual dos dois aconteceu e responde "já foi sugerido" ou 429.

Mais um detalhe que o Claude Code pegou: o GitHub segue repositórios renomeados. Se alguém cola o nome antigo, a API responde com o nome novo no `full_name`. Nesse caso, a rota confere de novo se o nome novo já foi sugerido, para o mesmo repositório não entrar duas vezes com nomes diferentes.

Nos logs, só o repositório: nunca o motivo, que é texto livre de quem sugeriu, nem nada da pessoa.

## Os testes, um por um no terminal

Desta vez eu pedi ao Claude Code a lista de comandos `curl` e rodei cada teste no meu terminal, do mais barato para o mais caro, conferindo a resposta antes de passar para o próximo:

| Teste | Resultado |
|---|---|
| POST com `Origin: https://exemplo.com` | 403, pela proteção contra CSRF da Live 6 |
| Sem cookie | 401 |
| Motivo só com espaços | 400 |
| Link do GitLab | 400 |
| `https://github.com/withastro/astro` | 201, pendente |
| `WithAstro/Astro`, com outra grafia | 200 "já foi sugerido" |
| `atom/atom` | 422 "esse repositório está arquivado" |
| Um candidato da rodada de teste | 200 "vote nele!" |
| Mais duas válidas e a quarta | 201, 201 e 429 |
| `GET /api/sugestoes` com cookie | as três, com `Cache-Control: no-store` |

## O formulário e a lista na página

A primeira versão da seção funcionava, mas ficou feia na tela. Pedi um redesign ao vivo, e ela virou dois cartões no mesmo visual dos candidatos:

- **"Nova sugestão"**: o link, o motivo com o contador de 280 e os critérios numa lista de checagem (licença, 20 estrelas, commit no último ano, não arquivado). Uma etiqueta mostra quantas sugestões ainda cabem hoje, "2 de 3 disponíveis hoje", ou "Limite de hoje atingido". Quem barra de verdade continua sendo o servidor.
- **"Suas sugestões"**: cada repositório com o link para o GitHub, a data e o status com uma bolinha de cor (amarelo pendente, verde aprovada, vermelho recusada).

No computador, os cartões ficam lado a lado; no celular, um embaixo do outro. Sem login, aparece só o convite para entrar, que volta para a `/votacao` depois do login.

Enquanto a API confere, o botão fica desabilitado com "Conferindo no GitHub…". A resposta aparece numa região `aria-live`, que o leitor de tela anuncia sozinho: verde se entrou, neutra se repetida, vermelha se recusada. Na recusa, os campos continuam preenchidos para a pessoa corrigir o link.

Todo texto que vem da API ou de quem sugeriu entra na página com `textContent`, nunca com `innerHTML`. Assim, um nome de repositório ou um motivo com HTML aparece como texto e nunca roda como código.

No caminho, apareceu um problema da Live 6: os botões de voto mostravam "Votar em linkwarden" na tela, quando o nome do repositório deveria aparecer só para o leitor de tela. O Astro aplica o CSS da página só aos elementos que estão no HTML original, e esses textos eram criados pelo script, então a classe que escondia o nome não chegava neles. Ficou corrigido no mesmo commit do formulário.

## A mais: desistir de uma sugestão pendente

Com as tarefas da issue prontas, eu pedi uma coisa que não estava no plano: poder remover uma sugestão enquanto ela ainda não passou pela curadoria. Aprovada ou recusada, fica.

A rota é `DELETE /api/sugestoes/<dono>/<nome>`, no mesmo formato do `DELETE /api/votos` da Live 6. As duas regras, ser de quem pede e estar pendente, ficam no próprio comando:

```sql
DELETE FROM sugestoes WHERE repo = ? AND usuario_id = ? AND status = 'pendente' RETURNING nome
```

Não há intervalo entre conferir e apagar. Se a curadoria aprovar a sugestão um instante antes, o `DELETE` simplesmente não encontra a linha.

| Situação | Resposta |
|---|---|
| Sem login | 401 |
| Caminho inválido | 400 |
| Não existe, ou é de outra pessoa | 404 "Sugestão não encontrada" |
| Já aprovada ou recusada | 409 "Essa sugestão já foi aprovada na curadoria e não pode mais ser removida." |
| Removida | 200 |

A sugestão de outra pessoa recebe a mesma resposta de uma que não existe, de propósito. Se fosse diferente, alguém poderia testar links e descobrir o que os outros sugeriram. No teste com duas contas, a pessoa A tentou remover a sugestão da B, recebeu 404, e a sugestão continuou no banco.

Na página, o botão "Remover" aparece só nas pendentes, e a confirmação é um modal com o `<dialog>` nativo do navegador, sem nenhuma dependência nova. Ele já prende o foco dentro do modal e fecha com Esc. O foco abre em "Cancelar", a opção segura, e um clique fora também fecha sem remover nada.

## Os prompts que eu usei

Os quatro pedidos principais eu levei prontos no roteiro e colei no Claude Code. A remoção e o redesign eu pedi na hora, em voz alta. Entre um e outro, eu conferia o resultado e pedia o commit.

**1. A tabela:**

```text
Leia a issue #21 (gh issue view 21), as migrações em migrations/ e o worker/index.ts.
Crie a quinta migração com npx wrangler d1 migrations create eddwan-votos sugestoes:
- sugestoes: id INTEGER PRIMARY KEY, repo TEXT NOT NULL UNIQUE (dono/nome em minúsculas), nome TEXT NOT NULL (dono/nome como o GitHub escreve),
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, motivo TEXT NOT NULL (até 280 caracteres, com CHECK),
  licenca TEXT NOT NULL (o spdx_id do GitHub), estrelas INTEGER NOT NULL, ultimo_commit INTEGER NOT NULL (segundos Unix),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'recusada')), criado_em INTEGER NOT NULL.
Um índice em sugestoes(usuario_id, criado_em), para o limite por dia. Atualize a linha esquema da tabela meta para '4'.
Comente no SQL por que o repo é único e por que guardamos licença, estrelas e último commit (a Live 8 decide sem consultar o GitHub de novo).
Antes de escrever, me mostre o SQL. Depois aplique com --local e mostre o /api/saude com "esquema":"4".
```

**2. A conferência no GitHub:**

```text
Crie worker/github.ts, sem dependência nova:
1. lerRepo(texto): aceita https://github.com/dono/nome (com ou sem www, barra no fim, .git, /tree/... ou outro caminho depois do nome)
   ou só dono/nome, e devolve { dono, nome } ou null. Só o host github.com; dono ^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$ e nome ^[A-Za-z0-9._-]{1,100}$, sem "." nem "..".
   O Worker nunca faz fetch do texto recebido: a URL da API é montada só com dono e nome (encodeURIComponent). Explique o SSRF num comentário.
2. conferirRepo(dono, nome, token): GET https://api.github.com/repos/dono/nome e GET .../commits/<default_branch>, com Authorization: Bearer token,
   Accept: application/vnd.github+json, X-GitHub-Api-Version: 2022-11-28 e User-Agent: eddwan.com-votacao, com timeout de 5 s.
   Devolve { ok: true, nome: full_name, licenca: spdx_id, estrelas, ultimoCommit (segundos Unix) } ou { ok: false, motivo } com uma mensagem em português para quem sugeriu:
   404 "não encontrei esse repositório no GitHub (ele é público?)"; archived "esse repositório está arquivado";
   sem license "esse repositório não tem licença, e sem licença ninguém pode usar o código";
   último commit do branch principal com mais de 365 dias "o último commit foi há mais de um ano"; menos de 20 estrelas "ainda tem poucas estrelas (mínimo 20)".
   Licença NOASSERTION passa. Erro do GitHub (403 de limite, 5xx, timeout): { ok: false, indisponivel: true }.
   Os limites (365 dias e 20 estrelas) ficam em constantes no topo, com comentário.
Declare GITHUB_TOKEN no Env. Teste com um script rápido (npx tsx ou um teste em node:test), sem subir nada:
withastro/astro (passa), atom/atom (arquivado), eddwan/nao-existe-123 (404), https://gitlab.com/gitlab-org/gitlab (lerRepo null),
https://github.com/withastro/astro/tree/main/packages (passa) e um repositório público sem licença que você achar com gh api (me mostre qual antes).
```

**3. As rotas:**

```text
Agora a rota, no worker/index.ts, usando usuarioDaSessao e o worker/github.ts. POST /api/sugestoes com JSON { link, motivo }, nesta ordem (da mais barata para a mais cara):
- sem sessão: 401 { ok: false, erro: "Entre para sugerir" };
- motivo vazio ou com mais de 280 caracteres (depois de trim): 400; lerRepo null: 400 "Cole o link de um repositório do GitHub, como github.com/dono/nome";
- repo (em minúsculas) já em sugestoes: 200 { ok: true, repetida: true, mensagem: "Esse já foi sugerido. Obrigado!" };
- já é candidato da rodada aberta: 200 { ok: true, repetida: true, mensagem: "Esse já está na votação: vote nele!" };
- 3 sugestões ou mais dessa pessoa nas últimas 24 horas: 429 "Você já sugeriu 3 repositórios hoje. Volte amanhã!";
- conferirRepo: { ok: false, motivo } vira 422 com o motivo; indisponivel vira 503 "Não consegui falar com o GitHub agora. Tente de novo em instantes.";
- grava com INSERT ... ON CONFLICT(repo) DO NOTHING (se não inseriu, responde como repetida) e responde 201 { ok: true, repo: nome, status: "pendente" }.
O repo vai para o banco com o full_name do GitHub (nome) e em minúsculas (repo). Logs sem e-mail e sem o motivo.
Crie também GET /api/sugestoes: as sugestões da pessoa (nome, status, criado_em), { conectado: false } sem sessão, Cache-Control: no-store.
Teste com curl -c e -b (o código aparece no terminal do cf:dev, como nas Lives 5 e 6): sem cookie 401; motivo vazio 400; link do GitLab 400;
withastro/astro 201; o mesmo de novo "já foi sugerido"; atom/atom 422 arquivado; um candidato da rodada "vote nele";
mais duas válidas e a quarta 429; GET /api/sugestoes lista as minhas; POST com Origin https://exemplo.com 403.
```

**4. O formulário:**

```text
Por fim, o formulário em src/pages/votacao/index.astro, no visual da página, sem dependência nova. Abaixo dos candidatos, uma seção "Sugerir um repositório":
campo do link (placeholder github.com/dono/nome), campo do motivo com contador até 280 e o botão "Sugerir".
Sem login (o mesmo GET /api/votos já diz se está conectado), mostra "Entre para sugerir" com link para /entrar?volta=/votacao.
Ao enviar: botão desabilitado com "Conferindo no GitHub…", POST /api/sugestoes e a mensagem da API numa região aria-live (verde se entrou, neutra se repetida, vermelha se recusada).
Abaixo, "Suas sugestões": a lista do GET /api/sugestoes com o nome (link para o GitHub), o status e a data; atualiza depois de cada envio.
Todo texto que veio da API ou do usuário entra com textContent, nunca innerHTML.
Teste em localhost:8787/votacao: sugerir um válido, repetir, um arquivado, um link errado, e recarregar para ver a lista.
```

**5. A remoção, pedida na hora:**

```text
Eu preciso que você faça agora um endpoint de delete para o repositório que tiver o status de pendente. Repositórios aprovados ou recusados
não podem ser deletados, mas repositórios ainda no status de pendente, que ainda não passaram pela curadoria, eles podem ser removidos.
Seria interessante a gente ter essa opção, tanto na API, é necessário criar um endpoint para isso, e também fazer a página web de remoção
desse repositório. Seria interessante ter um modal de confirmação ao clicar no remover aquele repositório.
```

O que funcionou bem nesses pedidos:

- **Dizer o que o código nunca pode fazer.** "O Worker nunca faz fetch do texto recebido" fechou a porta do SSRF antes de existir uma linha de código, e o comentário pedido explica o porquê para quem ler depois.
- **Escrever as mensagens de erro no próprio pedido.** Quem sugere lê "esse repositório está arquivado", e não um código HTTP. Definir isso no prompt deixou a API e a página falando a mesma língua.
- **Pedir a ordem das checagens.** "Da mais barata para a mais cara" deixou o GitHub para o fim: quem está sem login, com o link errado ou sem vaga nunca gasta uma chamada.
- **Deixar o Claude Code apresentar as decisões antes de escrever.** No pedido da remoção, ele listou a rota, quem pode remover e cada resposta, e só depois escreveu o código. Foi aí que entrou o 404 igual para "não existe" e "é de outra pessoa".

## Próxima live

A Live 8 é nesta sexta, 27/11, às 20h: a curadoria. Uma página `/admin`, protegida pelo Cloudflare Access, com a fila das sugestões pendentes, onde eu aprovo (e a sugestão vira candidata da votação) ou recuso com um motivo. E, como em toda sexta, a revisão ao vivo dos PRs da semana ([issue #22](https://github.com/eddwan/website/issues/22)). Quer ajudar antes disso? Mande um PR para a `develop` (veja o [CONTRIBUTING.md](https://github.com/eddwan/website/blob/main/CONTRIBUTING.md)).

O código foi escrito ao vivo com o Claude Code, com cada passo revisado por mim na tela antes do commit.
