---
titulo: 'Live 8: a página de admin, atrás do Cloudflare Access'
descricao: 'Oitava das 10 lives em que eu construo, ao vivo e com o Claude Code, a votação open source do eddwan.com. Entrou a moderação: uma página /admin, protegida pelo Cloudflare Access, onde cada sugestão é aprovada (e vira candidata) ou recusada com o motivo. Antes, o conserto de um furo no limite de sugestões da Live 7. Com a gravação, o passo a passo do Access, o código, os prompts que eu usei e o que vem na próxima live.'
data: 2026-11-27
tipo: artigo
tags: [programação, claude code, open source, cloudflare, segurança]
youtube:
  id: 69roVH-0ptQ
fontes:
  - titulo: 'Issue #22: página de administração'
    url: https://github.com/eddwan/website/issues/22
  - titulo: 'PR #66: moderação das sugestões (/admin atrás do Cloudflare Access)'
    url: https://github.com/eddwan/website/pull/66
  - titulo: 'Cloudflare One, publicar uma aplicação self-hosted'
    url: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/
  - titulo: 'Cloudflare One, validar o JWT do Access'
    url: https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
  - titulo: 'Cloudflare D1, batch (instruções numa transação)'
    url: https://developers.cloudflare.com/d1/worker-api/d1-database/#batch
  - titulo: 'MDN, SubtleCrypto.verify()'
    url: https://developer.mozilla.org/pt-BR/docs/Web/API/SubtleCrypto/verify
rascunho: false
---

Esta é a oitava das 10 lives em que eu construo a votação open source do eddwan.com, onde quem assiste vai votar nos repositórios dos próximos vídeos. Na [Live 7](/blog/live-7-sugestoes-validadas-no-github), vocês ganharam a voz: sugerir repositórios. Na sexta, 27/11, entrou o outro lado: quem decide o que vira candidato.

A arquitetura completa está no [post de apresentação](/blog/vou-construir-uma-votacao-open-source-com-custo-zero-a-arquitetura-peca-por-peca), cada live tem a sua issue no [GitHub Project](https://github.com/users/eddwan/projects/5), e o andamento fica na [página de progresso da votação](/votacao/progresso).

## O que ficou pronto

- **O conserto do limite de sugestões**, com a sexta migração do banco.
- **O Cloudflare Access** na frente de `eddwan.com/admin` e `eddwan.com/api/admin`, criado ao vivo no painel.
- **`worker/access.ts`**, que confere a assinatura do token do Access em cada pedido, só com a WebCrypto.
- **As rotas de moderação**: a fila das pendentes, aprovar (com um resumo) e recusar (com um motivo).
- **A página `/admin`**, fora do menu e dos buscadores, com a fila em cartões.
- **Na `/votacao`**, quem sugeriu vê "aprovada: já está na votação" ou o motivo da recusa.

Tudo entrou pelo [PR #66](https://github.com/eddwan/website/pull/66), foi para o ar no fim da live, e a [issue #22](https://github.com/eddwan/website/issues/22) foi fechada. No ar, o [eddwan.com/api/saude](https://eddwan.com/api/saude) agora responde `"esquema":"5"`. A primeira sugestão de verdade, a [boring-marketing-skills](https://github.com/boringmarketer/boring-marketing-skills), já está entre os candidatos da rodada de teste. A revisão dos PRs da comunidade, que estava na issue, ficou de fora desta vez.

## O furo que eu mesmo deixei

Na Live 7, a regra era: no máximo 3 sugestões por pessoa por dia. E, no fim daquela live, entrou um botão para remover uma sugestão pendente. Juntando as duas coisas, apareceu um buraco.

O limite contava quantas sugestões a pessoa tinha na tabela nas últimas 24 horas. Remover uma apagava a linha, e a vaga voltava. Sugere, remove, sugere, remove: infinito. E cada volta fazia o Worker chamar a API do GitHub até duas vezes.

Antes de consertar, eu pedi ao Claude Code para mostrar o furo no local, com `curl`:

| Passo | Antes do conserto | Depois |
|---|---|---|
| 3 sugestões | 201, 201, 201 | 201, 201, 201 |
| Remover uma | 200 | 200 |
| A quarta | **201**, passou | **429** "Você já sugeriu 3 repositórios hoje" |

O conserto foi contar **envios**, e não linhas que ainda existem. A migração 0006 cria uma tabela só para isso:

```sql
CREATE TABLE envios_sugestao (
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  criado_em INTEGER NOT NULL -- segundos Unix
);

CREATE INDEX idx_envios_sugestao_usuario_criado ON envios_sugestao (usuario_id, criado_em);

-- Já conta as sugestões que existem, para o limite não zerar no deploy.
INSERT INTO envios_sugestao (usuario_id, criado_em) SELECT usuario_id, criado_em FROM sugestoes;
```

Ela guarda só quem e quando, nada da sugestão. A sugestão e o envio entram juntos num `env.DB.batch`, que no D1 roda como uma transação: ou entram os dois, ou nenhum. O cron das 6h, que já limpava códigos e sessões, passou a apagar envios com mais de 2 dias. A janela do limite é de 24 horas, então nada que ainda conte é apagado.

O `INSERT … SELECT` da última linha foi uma escolha no meio da live. Sem ele, no deploy a tabela nasceria vazia, e quem já tinha sugerido 3 hoje ganharia mais 3.

Na mesma migração entraram as duas colunas da moderação, `motivo_recusa` e `revisado_em`.

Lição: cada recurso novo pode abrir um buraco num recurso velho. Esse tipo de furo não aparece no teste "feliz", só quando alguém junta duas funções que foram pensadas separadas.

## O porteiro, criado ao vivo

O Cloudflare Access é o Zero Trust da Cloudflare: antes de um pedido chegar no site, ele pergunta "quem é você?". No plano grátis, cobre até 50 pessoas. Aqui é uma só.

O passo a passo que eu fiz no painel (em Zero Trust):

1. **Access controls → Applications → Create new application → Self-hosted and private.**
2. Nome `eddwan.com admin`.
3. **Add public hostname** duas vezes: `eddwan.com` com o caminho `admin` (a página) e `eddwan.com` com o caminho `api/admin` (a API).
4. Uma política **Allow** que aponta para um grupo de acesso com o meu e-mail dentro.
5. Login por **One-time PIN**: um código que chega no e-mail.
6. Sessão de 24 horas, e **Create**.
7. Na aplicação criada, o **Application Audience (AUD) Tag**, que vai para o Worker.

Dois detalhes desse passo a passo:

- **São dois caminhos.** Se eu protegesse só a página, a API ficaria aberta, e quem sabe usar `curl` nem precisa da página.
- **A política aponta para um grupo, não para o e-mail.** O e-mail fica guardado no grupo e não aparece na tela da live. E, se um dia eu quiser mais alguém moderando, mudo o grupo e pronto.

Tudo no Access nasce negado: só passa quem bate numa regra de "permitir". O teste é abrir `eddwan.com/admin` numa aba anônima, ou chamar a API sem login:

```bash
curl -sI https://eddwan.com/api/admin/sugestoes
# HTTP/2 302 → https://<equipe>.cloudflareaccess.com/cdn-cgi/access/login/...
```

O pedido nem chega no Worker: a Cloudflare responde antes, mandando para o login.

## Por que conferir de novo, se o porteiro já barra?

Quando o Access deixa alguém passar, ele cola no pedido um crachá: um token JWT no cabeçalho `Cf-Access-Jwt-Assertion`, assinado pela Cloudflare, com o meu e-mail dentro.

A tentação é o código só olhar se o cabeçalho existe. Só que um cabeçalho, qualquer um escreve. Se um dia eu errar a configuração do Access, ou mudar o caminho de uma rota e esquecer de proteger, quem mandar um cabeçalho inventado entra.

Por isso, o `worker/access.ts` confere o crachá contra a luz. Sem nenhuma dependência, só com a WebCrypto que já vem no Worker, nesta ordem:

1. O cabeçalho existe e o token tem 3 partes.
2. O algoritmo é `RS256`, e só ele.
3. O `kid` do token está entre as chaves públicas da equipe, em `https://<equipe>.cloudflareaccess.com/cdn-cgi/access/certs`.
4. A assinatura confere, com `crypto.subtle.verify`.
5. Só então o conteúdo: `aud` igual ao AUD Tag da aplicação, `iss` igual ao endereço da equipe, `exp` no futuro, `nbf` e `iat` no passado (com 60 segundos de folga para o relógio).

A ordem importa. O algoritmo vem antes de tudo:

```ts
// alg antes de tudo: só RS256 (nada de "none" nem HS256 com a chave pública como segredo)
if (cabecalho.alg !== 'RS256') return { motivo: 'alg diferente de RS256' };
```

Essa linha fecha dois ataques clássicos do JWT. O `alg: "none"` era um token sem assinatura que algumas bibliotecas aceitavam. No outro, o atacante troca para `HS256` e "assina" com a chave pública, que é pública. E a assinatura vem antes de ler o corpo, porque, sem ela, nada do que está lá dentro é confiável.

As chaves públicas ficam em cache por uma hora na memória do Worker. Se aparecer um `kid` desconhecido, ele busca de novo uma vez: a Cloudflare troca as chaves de tempos em tempos, e um token novo pode vir assinado por uma chave que o cache ainda não conhece.

Sem as variáveis `ACCESS_AUD` e `ACCESS_EQUIPE`, toda rota de admin responde 503. Sem token válido, 403 "Acesso negado". Na dúvida, fecha.

E o que ficou de fora de propósito: um "modo de desenvolvimento" que pulasse a conferência no local. No `wrangler dev` não tem Access, então as rotas de admin sempre recusam. Atalho desse tipo é o que um dia sobe para o ar ligado.

## Testar o crachá sem a Cloudflare

Se no local não tem Access, como testar? Os testes geram um par de chaves RSA na hora, assinam tokens com a chave privada e entregam a chave pública ao verificador. Para isso, a função que busca as chaves é injetável:

```ts
export async function verificarAccess(
  request: Request,
  env: Env,
  buscarChaves: BuscarChaves = buscarChavesAccess,
): Promise<{ email: string } | null>
```

No Worker vai a busca de verdade; nos testes, uma função que devolve a chave gerada. São 12 casos do JWT: o token válido passa; a assinatura de outra chave, o `aud` errado, o `iss` errado, o vencido, o `alg: "none"` e o cabeçalho ausente são recusados. O repositório também ganhou seu primeiro `npm test`, com o `node:test` do próprio Node, sem dependência nova.

Nos logs, só o motivo da recusa, como `Access: recusado (cabeçalho ausente)`. Nunca o token nem o e-mail.

## Aprovar sem deixar nada pela metade

Aprovar uma sugestão são duas escritas: marcar a sugestão como aprovada e criar o candidato na rodada aberta. Se só a primeira acontecesse, a sugestão sumiria da fila sem aparecer na votação.

As duas vão num `env.DB.batch`, e o `INSERT` só acontece se o `UPDATE` mudou uma linha:

```sql
UPDATE sugestoes SET status = 'aprovada', revisado_em = ?2
WHERE repo = ?1 AND status = 'pendente' AND EXISTS (rodada aberta);

INSERT INTO repositorios (rodada_id, repo, nome, url, resumo, criado_em)
SELECT (rodada aberta), s.nome, substr(s.nome, instr(s.nome, '/') + 1), 'https://github.com/' || s.nome, ?3, ?2
FROM sugestoes s
WHERE changes() = 1 AND s.repo = ?1 AND s.status = 'aprovada' AND s.revisado_em = ?2
ON CONFLICT (rodada_id, repo) DO NOTHING;
```

O `changes() = 1` diz se a instrução anterior mudou exatamente uma linha. Se a sugestão já tinha sido decidida, ou se não há rodada aberta, o `UPDATE` não muda nada e o `INSERT` também não roda.

| Situação | Resposta |
|---|---|
| Sem token válido | 403 |
| Sugestão que não existe | 404 |
| Já aprovada ou recusada | 409 |
| Sem rodada aberta | 409 |
| Resumo vazio ou com mais de 200 caracteres | 400 |
| Aprovada | 200, e o candidato aparece na `/votacao` |

Recusar é uma instrução só, também condicionada a `status = 'pendente'`, e grava o motivo (até 280 caracteres) que quem sugeriu vai ver. A fila de pendentes nunca devolve o e-mail nem o id de quem sugeriu: para moderar, basta o repositório, a foto do GitHub e o motivo.

Mais um detalhe: o placar da `/votacao` fica 60 segundos em cache. Depois de aprovar, a rota apaga a cópia daquele local da Cloudflare, para o candidato novo aparecer na hora. Nos outros locais, aparece em até um minuto.

## A página que só eu vejo

A `/admin` é simples de propósito: a fila em cartões, cada um com o link do GitHub, as estrelas, a licença, há quanto tempo foi o último commit, quando foi sugerida e o motivo de quem sugeriu. Dois botões. "Aprovar" abre um `<dialog>` com o resumo e um contador até 200; "Recusar" abre outro, com o motivo.

E a página em si não guarda segredo nenhum: ela é só HTML. Quem decide tudo é a API, que confere o crachá a cada clique.

O motivo foi escrito por um desconhecido, então todo texto que vem da API entra com `textContent`, nunca com `innerHTML`. Na prévia, um dos cartões de exemplo tem `<b>` e `<img onerror>` no nome e no motivo, e aparece como texto, sem rodar nada. Essa prévia (`/admin?previa`, só no local) mostra cartões de exemplo sem chamar a API, porque no local o Access não existe e a página real só mostra "Acesso negado".

No meio do teste, apareceu um efeito do conserto do Bloco 1: a etiqueta "2 de 3 disponíveis hoje" da `/votacao` contava as sugestões da lista, e uma removida continuava gastando a vaga. Agora o `GET /api/sugestoes` devolve o número `restantes`, contado nos envios, e a página só mostra.

## Os prompts que eu usei

Os quatro pedidos eu levei prontos no roteiro e colei no Claude Code. A correção do contador eu pedi na hora. Entre um e outro, eu conferia o resultado e pedia o commit.

**1. O furo do limite:**

```text
Leia a issue #22 (gh issue view 22), migrations/0005_sugestoes.sql e o POST e o DELETE de /api/sugestoes no worker/index.ts.
Tem um furo: o limite de 3 sugestões por dia conta as linhas de sugestoes, e o DELETE apaga a linha, então sugerir e remover em loop
burla o limite (e cada volta gasta até 2 chamadas na API do GitHub). Antes de mudar, me mostre o furo no local com curl (-c e -b):
3 sugestões válidas, remover uma, e a quarta passando.
Depois crie a sexta migração (npx wrangler d1 migrations create eddwan-votos moderacao):
- tabela envios_sugestao (usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, criado_em INTEGER NOT NULL)
  com índice em (usuario_id, criado_em); comente no SQL por que ela existe (o envio conta mesmo se a sugestão for removida);
- ALTER TABLE sugestoes ADD COLUMN motivo_recusa TEXT e ADD COLUMN revisado_em INTEGER (para a moderação de hoje);
- esquema '5' na tabela meta.
No POST, o limite passa a contar envios_sugestao nas últimas 24 h, ainda dentro do INSERT condicional, e a sugestão e o envio
entram juntos num env.DB.batch. No scheduled, apague envios com mais de 2 dias. Me mostre o SQL antes de escrever.
Teste de novo: 3 sugestões, remover uma, a quarta dá 429. E rode os testes que já existem.
```

**2. A conferência do token do Access:**

```text
Agora a proteção das rotas /api/admin/*. O Cloudflare Access já protege eddwan.com/admin e eddwan.com/api/admin (criado agora há pouco no painel)
e manda o JWT no cabeçalho Cf-Access-Jwt-Assertion. Crie worker/access.ts, sem dependência nova, só com a WebCrypto:
- verificarAccess(request, env, buscarChaves?) devolve { email } ou null. Confere: cabeçalho presente, JWT com 3 partes, alg RS256,
  kid encontrado nas chaves de https://<ACCESS_EQUIPE>.cloudflareaccess.com/cdn-cgi/access/certs (campo keys, JWK),
  assinatura válida (crypto.subtle.verify com RSASSA-PKCS1-v1_5 / SHA-256), aud contendo ACCESS_AUD, iss igual a https://<ACCESS_EQUIPE>.cloudflareaccess.com,
  exp no futuro e nbf/iat no passado (com 60 s de folga).
- Chaves em cache na memória do isolate por 1 hora; se o kid não estiver no cache, busca de novo uma vez (a Cloudflare roda as chaves).
- buscarChaves é injetável, para os testes. Nenhum modo de desenvolvimento que pule a conferência.
Declare ACCESS_AUD e ACCESS_EQUIPE no Env e como vars no wrangler.jsonc (eu colo os valores do painel: o AUD Tag e o nome da equipe; deixe um
comentário explicando de onde vêm). No worker/index.ts, tudo em /api/admin/* passa por verificarAccess antes de qualquer coisa:
sem as vars, 503; token ausente ou inválido, 403 { ok: false, erro: "Acesso negado" }. Logs sem o token e sem o e-mail.
Testes em node:test: gere um par RSA com crypto.subtle, assine tokens e teste: válido passa; assinatura de outra chave, aud errado,
iss errado, vencido, alg "none" e cabeçalho ausente são recusados. Explique cada caso em uma linha.
```

**3. As rotas de moderação:**

```text
Agora as rotas de moderação, todas atrás do verificarAccess:
- GET /api/admin/sugestoes: as pendentes (nome, motivo, licenca, estrelas, ultimo_commit, criado_em), da mais velha para a mais nova,
  sem e-mail nem usuario_id, Cache-Control: no-store.
- POST /api/admin/sugestoes/<dono>/<nome>/aprovar com { resumo } (1 a 200 caracteres depois de trim): num env.DB.batch,
  UPDATE sugestoes SET status = 'aprovada', revisado_em = agora WHERE repo = ? AND status = 'pendente' e
  INSERT INTO repositorios (rodada_id, repo, nome, url, resumo, criado_em) da rodada aberta, com url https://github.com/<nome>
  e nome só a parte depois da barra. Sem rodada aberta: 409. Sugestão inexistente: 404; já decidida: 409.
  Garanta que o INSERT só acontece se o UPDATE mudou uma linha (por exemplo, INSERT ... SELECT ... WHERE EXISTS com status já 'aprovada'
  e revisado_em = agora), e me explique como ficou atômico.
- POST .../recusar com { motivo } (1 a 280): status 'recusada', motivo_recusa e revisado_em. Mesmos 404 e 409.
- Qualquer outro método nesses caminhos: 405. O CSRF por Origin que já existe vale aqui também.
O GET /api/sugestoes (de quem sugeriu) passa a devolver motivo_recusa. Atualize o README da API, se houver.
Testes: com os tokens assinados do Bloco 2, aprovar uma pendente (aparece em /api/votacao), aprovar de novo (409), recusar sem motivo (400),
recusar com motivo, e sem token (403).
```

**4. A página:**

```text
Por fim, a página src/pages/admin/index.astro, no visual da /votacao, sem dependência nova, fora do menu e com meta robots noindex.
Ao abrir, GET /api/admin/sugestoes: 403 mostra "Acesso negado" (no ar o Access nem deixa chegar aqui; no local é o normal).
Cada pendente num cartão: nome com link para o GitHub, estrelas, licença, último commit ("há 3 dias"), quando foi sugerida e o motivo.
Botão "Aprovar" abre um <dialog> com o resumo (contador até 200) e confirma; "Recusar" abre um <dialog> com o motivo (até 280).
Depois de cada ação, o cartão sai da fila e a mensagem aparece numa região aria-live. Texto vindo da API sempre com textContent.
Na /votacao, em "Suas sugestões", mostre "aprovada: já está na votação" e, na recusada, o motivo.
Teste no local com a API respondendo 403 (sem Access) e me mostre o cartão com dados de exemplo num teste ou num modo de prévia que
não chame a API real.
```

O que funcionou bem nesses pedidos:

- **Pedir para ver o bug antes do conserto.** "Me mostre o furo no local" fez o Claude Code reproduzir o problema com `curl` antes de mexer em qualquer arquivo. Depois, o mesmo teste provou que o conserto funcionou.
- **Dizer o que não pode existir.** "Nenhum modo de desenvolvimento que pule a conferência" é uma frase que fecha uma porta que, sem ela, provavelmente apareceria para facilitar o teste no local.
- **Listar os ataques que os testes precisam recusar.** Assinatura de outra chave, `aud` errado, `alg: "none"`: cada um virou um teste, e cada teste explica em uma linha o que protege.
- **Pedir a explicação da parte delicada.** "Me explique como ficou atômico" trouxe o `changes() = 1` com o porquê, em vez de só um código que parece certo.

## Próxima live

A Live 9 é na terça, 01/12, às 20h: os votos e as sugestões aprovadas vão para a planilha do canal, e a primeira rodada fecha ([issue #23](https://github.com/eddwan/website/issues/23)). Quer ajudar antes disso? Tem issue aberta esperando por você, de acessibilidade e de testes. Mande um PR para a `develop` (veja o [CONTRIBUTING.md](https://github.com/eddwan/website/blob/main/CONTRIBUTING.md)).

O código foi escrito ao vivo com o Claude Code, com cada passo revisado por mim na tela antes do commit.
