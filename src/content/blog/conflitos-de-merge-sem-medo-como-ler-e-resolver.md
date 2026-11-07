---
titulo: 'Conflitos de merge sem medo: como ler e resolver'
descricao: 'Conflitos de merge explicados do zero: por que acontecem, como ler os marcadores de conflito, como resolver no editor e no VS Code, como finalizar o merge, o que fazer quando o pull request tem conflito, a diferença entre merge e rebase e como ter menos conflitos no dia a dia.'
data: 2026-10-14
tipo: explicativo
tags: [git, github, conflito de merge, merge conflict, git rebase, git merge]
youtube:
  id: H1ARqOxhcnI
  shorts:
    - id: DOUwvQaUFpA
      titulo: 'Apareceu isso no seu código? 😱 Conflito de merge em 30 s'
    - id: y_SuZsmtWj0
      titulo: 'A saída de emergência do Git que ninguém te conta'
fontes:
  - titulo: 'Documentação do GitHub sobre conflitos de merge'
    url: https://docs.github.com/pt/pull-requests/collaborating-with-pull-requests/addressing-merge-conflicts
  - titulo: 'Livro Pro Git (grátis, em português)'
    url: https://git-scm.com/book/pt-br/v2
rascunho: false
---

Episódio 3 da série "Git e GitHub do zero".

## Neste vídeo

- Por que acontece
- Provocando um conflito
- Lendo os marcadores
- Resolvendo no editor
- Finalizando o merge
- Conflito no pull request
- Merge ou rebase
- Como evitar
- Resumo e próximo episódio

## Passo a passo

### Comandos do vídeo

```bash
git merge nome-do-ramo · git status · git add arquivo · git commit · git merge --abort · git merge main · git rebase main · git rebase --continue · git rebase --abort
```

### Para praticar

1. git switch -c teste-conflito e mude a mesma linha de um arquivo, com commit
2. git switch main, mude a mesma linha de outro jeito, com commit
3. git merge teste-conflito
4. Abra o arquivo, escolha o texto, apague os marcadores, git add e git commit
