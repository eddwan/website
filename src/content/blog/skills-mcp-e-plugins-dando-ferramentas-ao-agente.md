---
titulo: 'Skills, MCP e plugins: dando ferramentas ao agente'
descricao: 'Cansou de ser o carteiro da inteligência artificial, copiando erro, tarefa e resultado do banco para o chat? Neste episódio, como dar ferramentas novas ao agente: MCP para ligar a outros sistemas, skills para ensinar procedimentos uma vez só e plugins para empacotar e compartilhar com o time. E o cuidado com o que você instala.'
data: 2026-11-12
tipo: explicativo
tags: [inteligência artificial, programação]
youtube:
  id: CHpWl_Bwl2c
fontes:
  - titulo: 'Model Context Protocol'
    url: https://modelcontextprotocol.io
  - titulo: 'Claude Code e MCP'
    url: https://code.claude.com/docs/en/mcp
  - titulo: 'Claude Code, skills'
    url: https://code.claude.com/docs/en/skills
  - titulo: 'Padrão aberto Agent Skills'
    url: https://agentskills.io
  - titulo: 'Claude Code, plugins'
    url: https://code.claude.com/docs/en/plugins
rascunho: false
---

Episódio 6 da série "Programando com IA do zero".

## Neste vídeo

- O agente e suas ferramentas
- MCP: a tomada universal
- Ligando um servidor
- Skills: ensine uma vez
- Comandos e plugins
- Quando usar cada um
- Cuidado com o que instala
- Comunidade e parceiros

## Passo a passo

### Usados no vídeo (Claude Code)

Ligar um servidor MCP:

```bash
claude mcp add --transport http notion https://mcp.notion.com/mcp
```

Skill de projeto: .claude/skills/publicar/SKILL.md (chamar com /publicar)

Skill pessoal: ~/.claude/skills/nome/SKILL.md

Instalar plugins: /plugin (aba Discover)

### Exemplo de SKILL.md

---

```yaml
name: publicar
description: Publica a loja em produção. Use quando pedirem deploy ou publicar.
```

---

1. Rode os testes
2. Gere a versão
3. Rode scripts/publicar.sh

### Quando usar cada um

Fato que vale sempre: arquivo de instruções (CLAUDE.md ou AGENTS.md)

Procedimento que se repete: skill

Acesso a outro sistema: MCP

Empacotar e compartilhar: plugin

Transparência: a série mostra o Claude Code porque é a ferramenta que usamos no canal, ao lado de outras equivalentes; não é patrocínio. O roteiro foi escrito com a ajuda do Claude e revisado pelo Eddwan.
