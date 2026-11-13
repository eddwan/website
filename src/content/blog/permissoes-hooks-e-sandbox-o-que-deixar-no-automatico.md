---
titulo: 'Permissões, hooks e sandbox: o que deixar no automático'
descricao: 'Um agente de código lê, edita, roda comandos e acessa a internet. Neste episódio, o que deixar no automático, o que deve sempre perguntar e o que nunca pode rodar: os modos de permissão, as regras de permitir, perguntar e bloquear, os hooks que sempre rodam e o sandbox que cerca os comandos.'
data: 2026-11-13
tipo: explicativo
tags: [inteligência artificial, programação]
youtube:
  id: VoLE9Ci8C2w
fontes:
  - titulo: 'Claude Code, modos de permissão'
    url: https://code.claude.com/docs/en/permission-modes
  - titulo: 'Claude Code, permissões'
    url: https://code.claude.com/docs/en/permissions
  - titulo: 'Claude Code, hooks'
    url: https://code.claude.com/docs/en/hooks-guide
  - titulo: 'Claude Code, sandbox'
    url: https://code.claude.com/docs/en/sandboxing
  - titulo: 'OpenAI Codex, segurança, permissões e sandbox'
    url: https://developers.openai.com/codex/security
rascunho: false
---

Episódio 7 da série "Programando com IA do zero".

## Passo a passo

Configuração usada no vídeo (.claude/settings.json do projeto, Claude Code)

```json
{
  "permissions": {
    "allow": ["Bash(npm run *)", "Bash(git commit *)"],
    "ask": ["Bash(npm install *)"],
    "deny": ["Bash(git push *)", "Read(./.env)"]
  }
}
```

A ordem é: bloquear, depois perguntar, depois permitir. As regras são aplicadas pela ferramenta, não pelo modelo.

Hook que formata cada arquivo editado (exemplo da documentação, com o Prettier):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write" }
        ]
      }
    ]
  }
}
```

### Comandos

Shift+Tab: troca o modo de permissão

/permissions: vê e edita as regras

/sandbox: liga o sandbox (macOS, Linux e WSL2)

Transparência: a série mostra o Claude Code porque é a ferramenta que usamos no canal, ao lado de outras equivalentes; não é patrocínio. O roteiro foi escrito com a ajuda do Claude e revisado pelo Eddwan.
