---
titulo: 'CLAUDE.md e AGENTS.md: ensinando o projeto à IA'
descricao: 'O agente de código começa toda conversa sem memória. O arquivo de instruções resolve isso: CLAUDE.md no Claude Code, AGENTS.md no Codex, no Cursor, no Copilot e em vários outros. O que colocar, o que deixar de fora, como escrever regras que dão para conferir, projeto × pessoal, por que manter curto e o que fazer quando o agente erra.'
data: 2026-11-09
tipo: explicativo
tags: [inteligência artificial, programação]
youtube:
  id: tv7Z_srLlFU
fontes:
  - titulo: 'Claude Code, memória e CLAUDE.md'
    url: https://code.claude.com/docs/en/memory
  - titulo: 'Claude Code, boas práticas'
    url: https://code.claude.com/docs/en/best-practices
  - titulo: 'AGENTS.md (formato aberto)'
    url: https://agents.md
rascunho: false
---

Episódio 3 da série "Programando com IA do zero".

## Neste vídeo

- O agente começa do zero
- Um arquivo, dois nomes
- O que colocar
- Escreva regras que dão para conferir
- Do projeto ou só seu?
- Curto e sem contradição
- Quando o agente errar, ensine
- Comunidade e parceiros

## Passo a passo

### Exemplo de CLAUDE.md (ou AGENTS.md) do vídeo

# Comandos

- Instalar: npm install
- Testar tudo: npm test
- Testar um arquivo: npx vitest run caminho/do/teste.js

# Convenções

- Dois espaços de recuo
- Rode npm test antes de cada commit
- Componentes ficam em src/componentes/

# Cuidados

- src/antigo/ ainda está em uso, mas não copie o estilo dele
- Os testes de integração precisam de DATABASE_URL (veja .env.example)

### Antes de escrever uma linha, duas perguntas

1. O agente acharia isso lendo o código?
2. Ele iria procurar?

Se as duas respostas forem sim, deixe de fora.

### Onde fica cada arquivo (Claude Code)

./CLAUDE.md: do projeto, vai para o Git, vale para o time

~/.claude/CLAUDE.md: pessoal, vale para todos os seus projetos

CLAUDE.local.md: pessoal neste projeto, fora do Git (ponha no .gitignore)

Para usar um só arquivo com todos os agentes: um CLAUDE.md com a linha @AGENTS.md

Para gerar uma primeira versão: /init

Transparência: a série mostra o Claude Code porque é a ferramenta que usamos no canal, ao lado de outras equivalentes; não é patrocínio. O roteiro foi escrito com a ajuda do Claude e revisado pelo Eddwan.
