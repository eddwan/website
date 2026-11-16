---
titulo: 'Segurança ao programar com IA'
descricao: 'O último episódio da série: os riscos de segurança que vêm junto com os agentes de código e como se proteger sem abrir mão deles. Prompt injection, skills e servidores MCP que rodam com o seu acesso, pacotes maliciosos e pacotes inventados, segredos e dados de clientes, e o resumo dos nove episódios.'
data: 2026-11-15
tipo: explicativo
tags: [inteligência artificial, programação]
youtube:
  id: LIcXOdzHYIE
fontes:
  - titulo: 'OWASP, LLM01 Prompt Injection'
    url: https://genai.owasp.org/llmrisk/llm01-prompt-injection/
  - titulo: 'Claude Code, segurança'
    url: https://code.claude.com/docs/en/security
  - titulo: 'Claude Code, skills (allowed-tools)'
    url: https://code.claude.com/docs/en/skills
  - titulo: 'CISA, alerta sobre o Shai-Hulud no npm (23/09/2025)'
    url: https://www.cisa.gov/news-events/alerts/2025/09/23/widespread-supply-chain-compromise-impacting-npm-ecosystem
  - titulo: 'Estudo sobre pacotes inventados por modelos (USENIX Security)'
    url: https://arxiv.org/abs/2406.10279
rascunho: false
---

Episódio 9 da série "Programando com IA do zero".

## Passo a passo

Bloquear a leitura do arquivo de senhas (Claude Code, .claude/settings.json)

```json
{
  "permissions": {
    "deny": ["Read(./.env)"],
    "ask": ["Bash(npm install *)"]
  }
}
```

Antes de instalar um pacote sugerido pela inteligência artificial

1. Ele existe no registro?
2. Quem mantém?
3. Quanta gente usa?

Transparência: a série mostra o Claude Code porque é a ferramenta que usamos no canal, ao lado de outras equivalentes; não é patrocínio. O roteiro foi escrito com a ajuda do Claude e revisado pelo Eddwan.
