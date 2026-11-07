---
titulo: 'Git com IA no dia a dia: commit, conflito e PR'
descricao: 'Agentes de código com inteligência artificial já fazem commit, resolvem conflito e abrem pull request pelo terminal. Neste episódio bônus, como usar um deles (o Claude Code) no dia a dia com o Git, e o que você precisa revisar antes de aceitar: o diff inteiro, os arquivos do commit, os testes e os comandos que nunca devem rodar no automático.'
data: 2026-10-30
tipo: explicativo
tags: [git, github, inteligência artificial, claude code, pull request]
youtube:
  id: 45wo7cjBKMk
  shorts:
    - id: o-uHnJQLVz0
      titulo: 'A IA escreveu seu commit. Você leu?'
    - id: b35TZamT_10
      titulo: '3 comandos do Git que a IA nunca roda sozinha'
fontes:
  - titulo: 'Claude Code, fluxos comuns'
    url: https://code.claude.com/docs/en/common-workflows
  - titulo: 'Claude Code, permissões'
    url: https://code.claude.com/docs/en/permissions
  - titulo: 'gh pr create'
    url: https://cli.github.com/manual/gh_pr_create
rascunho: false
---

Episódio 10 (bônus) da série "Git e GitHub do zero".

## Neste vídeo

- O que muda e o que não muda
- Mensagens de commit
- Resolvendo conflitos com ajuda
- Abrindo o pull request
- Revisão de código com inteligência artificial
- O que sempre revisar
- Comandos que pedem cuidado

## Passo a passo

### Pedidos usados no vídeo

- “faz o commit disso”
- “explica esse conflito”
- “abre um pull request”

### Abrindo o PR pela linha de comando

```bash
gh pr create --title "Aplica o cupom no carrinho" --body "O que mudou, por que mudou e como testar"
```
(ou gh pr create --fill, que usa os commits)

### Antes de aceitar

1. Leia o diff inteiro: git diff
2. Confira os arquivos: nada de .env ou senha no commit (veja o episódio 9)
3. Rode os testes

### Comandos que pedem cuidado

Comandos que pedem confirmação: git push --force, git reset --hard, git clean -fd.
Bloqueio no Claude Code (`.claude/settings.json`):

```json
{
  "permissions": {
    "deny": ["Bash(git push *)"]
  }
}
```

**Transparência:** o episódio mostra o Claude Code porque é a ferramenta que usamos no canal; não é patrocínio. O roteiro foi escrito com a ajuda do Claude e revisado pelo Eddwan.
