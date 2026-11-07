---
titulo: 'GitHub além do código: Issues, Projects, Actions, Pages e Releases'
descricao: 'O GitHub não é só um lugar para guardar código. Neste episódio: Issues para conversar sobre o trabalho, Projects para organizar num quadro Kanban, GitHub Actions para automatizar testes, GitHub Pages para publicar um site grátis e Releases para entregar versões, além de Discussions, Dependabot e Codespaces.'
data: 2026-10-17
tipo: explicativo
tags: [github, github actions]
youtube:
  id: A7W-3gAuX2Y
  shorts:
    - id: EtvHhj54274
      titulo: 'Um site grátis com GitHub Pages em 2 minutos'
    - id: 1cZyM9kHRTI
      titulo: 'Fixes #12: a issue fecha sozinha'
fontes:
  - titulo: 'Documentação do GitHub Actions'
    url: https://docs.github.com/pt/actions
  - titulo: 'GitHub Pages'
    url: https://pages.github.com
  - titulo: 'Versionamento semântico'
    url: https://semver.org/lang/pt-BR/
rascunho: false
---

Episódio 6 da série "Git e GitHub do zero".

## Neste vídeo

- Issues
- Projects
- Actions
- Seu primeiro workflow
- Pages: um site grátis
- Releases
- E tem mais
- Resumo e próximo episódio

## Passo a passo

Exemplo de workflow (.github/workflows/testes.yml)

```yaml
name: Testes
on: [push]
jobs:
  testes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
```

Dica: escreva "Fixes #12" na descrição do pull request para fechar a issue 12 automaticamente.
