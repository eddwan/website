---
titulo: 'GitHub Actions na prática: 3 automações para copiar'
descricao: 'Episódio bônus da série: GitHub Actions na prática. Como uma automação funciona (evento, workflow, job e step), o arquivo YAML e três automações prontas para copiar: testes em todo pull request, publicação do site no GitHub Pages e faxina diária nas issues. Mais: como tornar o check obrigatório, onde guardar senhas (Secrets) e como descobrir o erro quando a automação quebra.'
data: 2026-10-19
tipo: explicativo
tags: [github actions, github]
youtube:
  id: EOH8xFpasIs
  shorts:
    - id: d13E44PSrw8
      titulo: 'Pare de rodar testes na mão: GitHub Actions em 1 arquivo'
    - id: eU_QjzwMRHE
      titulo: 'Senha no código? Use GitHub Secrets'
fontes:
  - titulo: 'Documentação do GitHub Actions'
    url: https://docs.github.com/pt/actions
  - titulo: 'Marketplace de actions'
    url: https://github.com/marketplace?type=actions
rascunho: false
---

Episódio 8 (bônus) da série "Git e GitHub do zero".

## Neste vídeo

- Como uma automação funciona
- O arquivo YAML
- Automação 1: testes em todo PR
- Check obrigatório
- Automação 2: site no GitHub Pages
- Automação 3: faxina nas issues
- Senhas em Secrets
- Quando a automação quebra

## Passo a passo

Os arquivos ficam em .github/workflows/ no seu repositório. Copie, ajuste e faça o push.

### .github/workflows/ci.yml: testes em todo pull request

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
jobs:
  testes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm test
```

Para tornar obrigatório: Settings, Rules, nova regra para a main exigindo os status checks.

### .github/workflows/pages.yml: publica o site a cada push na main

Antes: Settings, Pages, Source: GitHub Actions.

```yaml
name: Publicar site
on:
  push:
    branches: [main]
permissions:
  pages: write
  id-token: write
jobs:
  publicar:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
    steps:
      - uses: actions/checkout@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .
      - uses: actions/deploy-pages@v4
```

### .github/workflows/faxina.yml: marca e fecha issues paradas, todo dia às 9h UTC

```yaml
name: Faxina nas issues
on:
  schedule:
    - cron: '0 9 * * *'
permissions:
  issues: write
jobs:
  faxina:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/stale@v9
        with:
          days-before-stale: 30
          days-before-close: 7
          stale-issue-message: 'Sem movimento há 30 dias. Será fechada em 7 dias.'
          days-before-pr-stale: -1
```

Bônus) Aviso no Discord com um secret (Settings, Secrets and variables, Actions, nome DISCORD_WEBHOOK):

- run: curl -H "Content-Type: application/json" -d '{"content":"Nova release no ar!"}' "${{ secrets.DISCORD_WEBHOOK }}"
