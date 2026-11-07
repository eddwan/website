---
titulo: 'O que é Git? Explicado do zero: commit, branch, merge e GitHub'
descricao: 'O que é Git e como ele funciona, explicado do zero: repositório, staging, commit, histórico, branch, merge, a diferença entre Git e GitHub, e os comandos clone, push e pull. No fim, o fluxo que você vai usar todo dia.'
data: 2026-10-10
tipo: explicativo
tags: [git, github, o que é git, git para iniciantes, controle de versão, commit]
youtube:
  id: eScJHwkbBcA
  shorts:
    - id: KsnFgRfeGvE
      titulo: 'Git em 40 segundos: commit, branch e merge'
    - id: S1FH7W2LGKw
      titulo: 'git switch -c: cria a branch e já entra nela'
fontes:
  - titulo: 'Git'
    url: https://git-scm.com
  - titulo: 'Livro Pro Git (grátis, em português)'
    url: https://git-scm.com/book/pt-br/v2
  - titulo: 'GitHub'
    url: https://github.com
rascunho: false
---

Episódio 1 da série "Git e GitHub do zero".

## Neste vídeo

- O problema
- O que é Git
- Repositório
- As três áreas
- Commit
- Histórico
- Branch
- Merge
- Git não é GitHub
- Remoto: clone, push e pull
- O dia a dia
- Pratique e próximos passos

## Passo a passo

### Comandos do vídeo

```bash
git init · git status · git add · git commit -m "mensagem" · git log --oneline · git diff · git switch -c nome-do-ramo · git merge nome-do-ramo · git clone · git push · git pull
```

### Para praticar

```bash
mkdir meu-primeiro-repo && cd meu-primeiro-repo
git init
git add .
git commit -m "primeiro commit"
```
