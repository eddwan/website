---
titulo: 'Seu primeiro projeto com um agente de IA, do zero'
descricao: 'Do zero ao primeiro projeto com um agente de código: instalar, começar com Git, escrever um pedido com contexto, objetivo e critério de pronto, testar, descrever o erro do jeito certo, pedir a prova e fazer um commit a cada passo.'
data: 2026-11-08
tipo: explicativo
tags: [inteligência artificial, programação]
youtube:
  id: PyGcUYnAlrE
fontes:
  - titulo: 'Claude Code, primeiros passos'
    url: https://code.claude.com/docs/en/quickstart
  - titulo: 'Claude Code, boas práticas (pedidos específicos e conferência)'
    url: https://code.claude.com/docs/en/best-practices
  - titulo: 'Codex'
    url: https://developers.openai.com/codex
  - titulo: 'Antigravity CLI (sucessor do Gemini CLI)'
    url: https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/
  - titulo: 'Série Git e GitHub do zero'
    url: https://www.youtube.com/playlist?list=PLXVQXkiUR9po
rascunho: false
---

Episódio 2 da série "Programando com IA do zero".

## Neste vídeo

- Antes de começar
- Uma pasta e o Git
- Entrando no agente
- A anatomia de um bom pedido
- O primeiro resultado
- Deu errado? Descreva o sintoma
- Commit e o próximo passo
- Comunidade e parceiros

## Passo a passo

Instalação do Claude Code (confira sempre no site oficial; os comandos mudam)

macOS, Linux e WSL: curl -fsSL https://claude.ai/install.sh | bash

Windows (PowerShell): irm https://claude.ai/install.ps1 | iex

Homebrew: brew install --cask claude-code

Conferir: claude --version

Guia oficial: https://code.claude.com/docs/en/quickstart

### Começando o projeto

```bash
mkdir lista-de-compras
cd lista-de-compras
git init
claude
```

### O pedido do vídeo

cria uma página de lista de compras, num arquivo só, sem biblioteca nenhuma. eu adiciono um item, marco como comprado e apago. a lista continua lá quando eu recarregar a página. está pronto quando eu adicionar três itens, recarregar e eles continuarem na tela.

### Quando der errado

marquei o leite como comprado, recarreguei e ele voltou desmarcado; o marcado também tem que ficar salvo. corrige e me mostra como você conferiu.

### Para salvar

faz o commit com uma mensagem descritiva

A anatomia de um bom pedido: contexto (o que é e com o que fazer), objetivo (o que precisa funcionar) e critério de pronto (como saber que deu certo).

Transparência: a série mostra o Claude Code porque é a ferramenta que usamos no canal, ao lado de outras equivalentes; não é patrocínio. O roteiro foi escrito com a ajuda do Claude e revisado pelo Eddwan.
