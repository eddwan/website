---
titulo: 'Desfazendo coisas no Git: restore, reset, revert e reflog'
descricao: 'Como desfazer coisas no Git, explicado do zero: descartar mudanças num arquivo, tirar do staging, corrigir o último commit, voltar commits com reset (soft, mixed e hard), desfazer o que já foi enviado com revert, guardar mudanças com stash e recuperar commits "perdidos" com reflog.'
data: 2026-10-15
tipo: explicativo
tags: [git, github, git reset, git revert, git restore, git stash]
youtube:
  id: l3eYaxiS64g
  shorts:
    - id: iHjODQioa3g
      titulo: 'Perdeu um commit? O git reflog acha'
    - id: UQJ-ajCtod8
      titulo: 'git reset: soft, mixed ou hard? Um deles apaga seu trabalho'
fontes:
  - titulo: 'Livro Pro Git, "Desfazendo coisas" (grátis, em português)'
    url: https://git-scm.com/book/pt-br/v2/Fundamentos-de-Git-Desfazendo-coisas
rascunho: false
---

Episódio 4 da série "Git e GitHub do zero".

## Neste vídeo

- Onde está o erro
- Desfazer mudanças no arquivo
- Tirar do staging
- Corrigir o último commit
- Voltar commits com reset
- Desfazer o que já foi enviado
- Guardar para depois
- A rede de segurança
- Resumo e próximo episódio

## Passo a passo

### Qual comando desfaz o quê

Mudança no arquivo: git restore arquivo

No staging: git restore --staged arquivo

Último commit: git commit --amend

Commits locais: git reset --soft / --mixed / --hard HEAD~1

Commits já enviados: git revert código-do-commit

Guardar para depois: git stash e git stash pop

Deu tudo errado: git reflog e git switch -c resgate código-do-commit

⚠️ git restore e git reset --hard apagam mudanças que não estão em nenhum commit. Use com cuidado.
