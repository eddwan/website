---
titulo: 'Sua primeira contribuição open source, do fork ao merge'
descricao: 'O último episódio da série: como contribuir com projetos open source. Por que contribuir, como contribuir sem programar, como achar um projeto e uma "good first issue", o que fazer antes de começar, o fluxo completo de fork a pull request, como fazer um bom PR, como manter o fork atualizado com o upstream e o que fazer depois do pull request.'
data: 2026-10-18
tipo: explicativo
tags: [open source, github, contribuir open source, good first issue, fork, pull request]
youtube:
  id: vkQFu0jjMiA
  shorts:
    - id: w9gU8QTYkD8
      titulo: 'Sua primeira contribuição open source em 40 s'
    - id: OmsHeQh1yyE
      titulo: 'Não sabe por onde começar no open source?'
fontes:
  - titulo: 'Good first issues'
    url: https://github.com/topics/good-first-issue
  - titulo: 'Guia de contribuição open source'
    url: https://opensource.guide/pt/how-to-contribute/
rascunho: false
---

Episódio 7 da série "Git e GitHub do zero".

## Neste vídeo

- Por que contribuir
- Não é só código
- Achando um projeto
- Antes de começar
- O fluxo completo
- Um bom pull request
- Mantendo o fork em dia
- Depois do pull request
- Resumo e fim da série

## Passo a passo

### O fluxo

1. Fork do projeto
2. git clone do seu fork
3. git switch -c nome-da-mudanca
4. commits
5. git push
6. Pull request para o projeto original ("Closes #número" na descrição)

### Mantendo o fork em dia

```bash
git remote add upstream https://github.com/autora/projeto.git
git pull upstream main
```
