---
titulo: 'Pull request e code review explicado do zero'
descricao: 'Pull request e code review, explicado do zero: o que é um pull request, como abrir o seu primeiro, como escrever uma boa descrição, como funciona a revisão de código, os checks automáticos, os três tipos de merge e como contribuir em projetos de outras pessoas com fork.'
data: 2026-10-12
tipo: explicativo
tags: [git, github, pull request, code review, fork, merge]
youtube:
  id: Pb_KdogzJZc
  shorts:
    - id: 8B5ISI18DUA
      titulo: 'O GitHub tem 3 botões de merge. Qual usar?'
    - id: pJPooERUu7I
      titulo: 'Seu pull request fica parado? Faltam 3 coisas'
fontes:
  - titulo: 'Documentação do GitHub sobre pull requests'
    url: https://docs.github.com/pt/pull-requests
  - titulo: 'Livro Pro Git (grátis, em português)'
    url: https://git-scm.com/book/pt-br/v2
rascunho: false
---

Episódio 2 da série "Git e GitHub do zero".

## Neste vídeo

- O que é um pull request
- Por que não mexer direto no main
- Abrindo o seu primeiro
- Uma boa descrição
- Code review
- Respondendo à revisão
- Checks automáticos
- O merge
- Fork: contribuindo em projetos de outras pessoas
- Boas maneiras
- Pratique e próximo episódio

## Passo a passo

### Comandos do vídeo

```bash
git switch -c nome-do-ramo · git commit -am "mensagem" · git push -u origin nome-do-ramo · git switch main · git pull · git branch -d nome-do-ramo
```

### Para praticar

1. No seu repositório, crie um ramo: git switch -c minha-primeira-mudanca
2. Faça uma mudança pequena e um commit
3. git push -u origin minha-primeira-mudanca
4. No GitHub, clique em "Compare & pull request" e abra o seu primeiro PR
