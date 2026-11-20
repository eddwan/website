---
titulo: 'Live 2: a página dos repositórios, com busca e filtros'
descricao: 'Segunda das 10 lives em que eu construo, ao vivo e com o Claude Code, a votação open source do eddwan.com. O catálogo da Live 1 virou a página eddwan.com/repositorios: 408 repositórios com busca e filtros por categoria, tag, "alternativa a" e linguagem, sem framework no navegador, e uma página para cada repositório. Com a gravação, os prompts que eu usei e o que ficou pendente.'
data: 2026-11-18
tipo: artigo
tags: [programação, claude code, open source, github]
youtube:
  id: 2KprhHeC0mU
fontes:
  - titulo: 'Issue #16: página com filtros'
    url: https://github.com/eddwan/website/issues/16
  - titulo: 'PR #37: catálogo com filtros e página de cada repositório'
    url: https://github.com/eddwan/website/pull/37
  - titulo: 'PR #39: correções da revisão'
    url: https://github.com/eddwan/website/pull/39
  - titulo: 'Astro, rotas dinâmicas e getStaticPaths()'
    url: https://docs.astro.build/en/guides/routing/#dynamic-routes
rascunho: false
---

Esta é a segunda das 10 lives em que eu construo a votação open source do eddwan.com, onde quem assiste vai votar nos repositórios dos próximos vídeos. Na [Live 1](/blog/live-1-catalogo-dos-repositorios-da-votacao-open-source), o site ganhou o catálogo: um arquivo com os 408 repositórios que já apareceram no canal, validado no build. Na quarta, 18/11, esse catálogo virou página.

A arquitetura completa está no [post de apresentação](/blog/vou-construir-uma-votacao-open-source-com-custo-zero-a-arquitetura-peca-por-peca), cada live tem a sua issue no [GitHub Project](https://github.com/users/eddwan/projects/5), e o andamento fica na [página de progresso da votação](/votacao/progresso).

## O que ficou pronto

- **[eddwan.com/repositorios](/repositorios):** os 408 repositórios em cartões, com nome, resumo, linguagem, licença, até 3 tags e o volume em que apareceram, do vídeo mais recente ao mais antigo.
- **Busca e filtros:** busca por nome, dono, resumo, tags e "alternativa a" (sem diferença entre letra com e sem acento) e filtros por categoria, subcategoria, tag, "alternativa a" e linguagem, cada opção com a contagem ao lado.
- **Uma página por repositório**, em `/repositorios/<dono>/<repo>`: resumo, ficha, tags que levam para a listagem filtrada, botão "Ver no GitHub" e o vídeo de cada aparição. Por exemplo, a do [ZigZag](/repositorios/simpsoka/zigzag).
- **Categoria e subcategoria** no catálogo, vindas de duas colunas da planilha (a de subcategoria é nova e foi preenchida para os 1.246 repositórios).
- **"Repositórios" no menu e no rodapé**, depois de Vídeos.
- **Imagem de compartilhamento** (Open Graph) para cada repositório.

Tudo entrou na `develop` pelo [PR #37](https://github.com/eddwan/website/pull/37), a [issue #16](https://github.com/eddwan/website/issues/16) foi fechada, e as correções da revisão vieram no [PR #39](https://github.com/eddwan/website/pull/39).

## Filtro sem framework

A regra da live foi não colocar React, Vue nem nada parecido no navegador. A página é HTML gerado no build: os 408 cartões já chegam prontos, e um script pequeno só esconde o que não bate com o filtro. Para uma lista desse tamanho, isso basta, e a página funciona até sem JavaScript: nesse caso, aparece a lista inteira.

Cada cartão leva os dados do filtro em atributos `data-*`:

```astro
<article
  class="card repo"
  data-cat={categoria}
  data-sub={subcategoria}
  data-tags={tags.join('|')}
  data-alt={alternativaA.join('|')}
  data-ling={linguagem ?? ''}
  data-busca={busca}
>
```

E o coração do script é este laço, que roda a cada letra digitada ou filtro escolhido:

```js
for (const card of cards) {
  const d = card.dataset;
  const mostra =
    termos.every((t) => d.busca.includes(t)) &&
    (!v.cat || d.cat === v.cat) &&
    (!v.sub || d.sub === v.sub) &&
    tem(d.tags, v.tag) &&
    tem(d.alt, v.alt) &&
    (!v.ling || d.ling === v.ling);
  card.hidden = !mostra;
  if (mostra) visiveis++;
}
```

Os filtros também vão para a URL (`?q=&cat=&sub=&tag=&alt=&ling=`), então dá para mandar um link já filtrado, como [todos os que substituem o CapCut](/repositorios?alt=CapCut). Ao abrir a página, o script lê a URL e aplica os filtros, ignorando valores que não existem nas opções.

Dois detalhes que apareceram no caminho:

- **A subcategoria depende da categoria.** O select de subcategoria só mostra as opções da categoria escolhida. Esconder `<option>` com `hidden` não funciona no Safari, então o script tira todas as opções e devolve só as da categoria.
- **A busca ignora acento** dos dois lados: o texto de cada cartão é normalizado no build, e o que a pessoa digita é normalizado no navegador com a mesma regra.

## A página de cada repositório

A rota é `src/pages/repositorios/[...id].astro`. Como o `id` do catálogo já é `dono/repo`, o `getStaticPaths()` gera as 408 páginas direto da coleção, e a URL sai `/repositorios/simpsoka/zigzag`. O vídeo de cada aparição usa o componente de YouTube que o site já tinha, com o player vertical quando a aparição é um short avulso.

As imagens de compartilhamento cobraram o preço que o roteiro previa: as 408 levaram o build limpo de 7,2 s para 45,5 s e somaram 47 MB ao site gerado. Ficou assim por enquanto, e o tempo de build é um dos pontos pendentes.

## O que a revisão pegou

Depois do PR principal, uma revisão do código achou cinco coisas, corrigidas no PR #39:

- **O script do filtro saía depois do `</html>`.** Ele ficava fora do layout e o navegador aceitava, mas o HTML estava errado. Agora fica dentro do `<body>`.
- **Repositório em mais de um vídeo sairia duplicado.** A exportação criava uma entrada por linha da planilha. Hoje nenhum repositório está em duas linhas, mas ia acontecer. Agora as aparições são unidas numa entrada só.
- **A busca não achava pelo dono nem pela "alternativa a".** Agora "antirez" ou "anydesk" encontram o repositório.
- **Os cartões pulavam de `<h1>` para `<h3>`.** Viraram `<h2>`, sem mudar o visual, o que ajuda quem navega com leitor de tela.
- **Short avulso** passou a usar o player vertical.

Ficaram pendentes, para decidir depois: a exportação descartar sem erro uma linha sem categoria, o tempo de build das imagens e algumas funções repetidas entre dois arquivos do código.

## Os prompts que eu usei

Os pedidos principais eu levei prontos no roteiro e colei no Claude Code, um por bloco da live.

**1. A lista, ainda sem filtro:**

```text
Leia a issue #16 (gh issue view 16), a coleção "repositorios" em src/content.config.ts e as páginas de src/pages/blog.
Crie src/pages/repositorios/index.astro no layout Base, com o CabecalhoPagina, listando todos os repositórios da coleção.
Cada cartão (componente novo src/components/RepoCard.astro) mostra nome, resumo, linguagem, licença, até 3 tags e o volume da aparição mais recente,
com link para /repositorios/<dono>/<repo>. Ordene pela data da aparição mais recente.
Siga o visual dos cartões do blog. Ainda sem busca nem filtros.
```

**2. Busca e filtros, com a regra do "sem framework":**

```text
Adicione busca e filtros na /repositorios sem framework no cliente.
Gere no build as opções de tag, "alternativa a" e linguagem, com a contagem de cada uma, ordenadas pela contagem.
Cada RepoCard ganha data-tags, data-alt, data-ling e data-busca (nome, resumo e tags em minúsculas, sem acento).
Um script inline filtra os cartões, mostra "N de 408 repositórios" e guarda os filtros na URL (?q=&tag=&alt=&ling=), lendo a URL ao abrir.
Sem JavaScript, a página mostra a lista completa. Inclua um botão "Limpar filtros".
```

**3. A página de cada repositório:**

```text
Crie src/pages/repositorios/[...id].astro com getStaticPaths a partir da coleção repositorios (o id já é dono/repo).
A página mostra nome, resumo, tags (cada uma com link para /repositorios?tag=...), "alternativa a", linguagem, licença,
um botão "Ver no GitHub" e, para cada aparição, o vídeo com o componente YouTube existente e o volume.
Use o layout Base com título e descrição próprios. Teste com simpsoka/zigzag.
```

**4. Menu, rodapé e imagem de compartilhamento, medindo o custo:**

```text
Adicione "Repositórios" no NAV de src/consts.ts, depois de Vídeos, e no rodapé.
Estenda a geração de imagens Open Graph (src/pages/og e src/lib/og) para cada repositório, com o nome como título e "Repositório" como rótulo,
e use essa imagem na página do repositório. Rode o build e me diga quanto tempo levou antes e depois.
```

A categoria e a subcategoria não estavam no roteiro e entraram durante a live, em dois commits a mais no mesmo PR.

O que funcionou bem nesses pedidos:

- **Um bloco por vez.** Primeiro a lista sem filtro, depois os filtros, depois a página. Cada passo dá para conferir no navegador antes do próximo.
- **Dizer a restrição, não só o resultado.** "Sem framework no cliente" e "sem JavaScript, mostra a lista completa" decidem a arquitetura melhor do que pedir "uma página com filtros".
- **Pedir a medida junto.** "Me diga quanto tempo levou antes e depois" transformou as imagens de compartilhamento numa decisão com número, não num build que ficou lento sem ninguém notar.

## A live seguinte

A Live 3 foi na quinta, 19/11: o site deixou de ser só estático, com um Worker respondendo em `/api` e o banco de dados D1 onde vão ficar os votos, já com migrações pelo GitHub Actions. O que foi feito, a gravação e os prompts estão no [post da Live 3](/blog/live-3-api-e-banco-d1-na-cloudflare). Achou algum problema na [página de repositórios](/repositorios)? Abra uma issue ou mande um PR para a `develop` (veja o [CONTRIBUTING.md](https://github.com/eddwan/website/blob/main/CONTRIBUTING.md)).

O código foi escrito ao vivo com o Claude Code, com cada passo revisado por mim na tela antes do commit.
