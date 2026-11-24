---
titulo: 'Por que o agente de IA demora numa tarefa boba? Eu medi'
descricao: 'Uma mudança de um número só, e um minuto e meio esperando o agente. Pioraram o modelo? Eu medi: o mesmo pedido, cronometrado em 5 situações, 3 rodadas cada, num projeto real (o deste canal). Na maior parte das vezes, a lentidão numa tarefa simples se resolve do seu lado; às vezes é o servidor, e dá para saber qual é.'
data: 2026-11-24
tipo: explicativo
tags: [inteligência artificial, programação]
youtube:
  id: TsrrmYupu6E
fontes:
  - titulo: 'Claude Code, boas práticas'
    url: https://code.claude.com/docs/en/best-practices
  - titulo: 'Claude Code, configuração de modelo e esforço'
    url: https://code.claude.com/docs/en/model-config
  - titulo: 'Claude Code, custos e contexto'
    url: https://code.claude.com/docs/en/costs
  - titulo: 'Janela de contexto'
    url: https://platform.claude.com/docs/en/build-with-claude/context-windows
  - titulo: 'Status oficial'
    url: https://status.claude.com
  - titulo: 'Anthropic, limites maiores e o fim da redução no horário de pico para o Claude Code nos planos Pro e Max (06/05/2026)'
    url: https://www.anthropic.com/news/higher-limits-spacex
rascunho: false
---

Episódio 10 (bônus) da série "Programando com IA do zero".

## Neste vídeo

- Um número, um minuto e meio
- O teste
- Por que demora
- Dê o mapa
- Esforço demais
- O modelo menor
- A conversa longa
- Quando é o servidor
- Checklist
- Comunidade e encerramento

## Passo a passo

O teste (24/11/2026, Claude Code, projeto com 272 arquivos .ts/.tsx)

Pedido: "O card final dos vídeos está durando muito. Diminua a duração dele para 1,5 segundo."

Mediana de 3 rodadas:

• Padrão (esforço medium): 79 s (de 36 a 90 s entre as rodadas)

• Esforço low: 30 s

• Modelo Haiku: 45 s (12 a 13 voltas)

• Sessão longa: 55 s (o maior volume de tokens)

• Com 3 linhas no CLAUDE.md: 27 s (melhor rodada: 14 s, sempre 1 arquivo)

É um teste caseiro: 3 rodadas, 1 projeto, 1 horário. No seu projeto, os números vão mudar.

### Checklist

1. Diga exatamente o que quer, e deixe no CLAUDE.md o que o agente não consegue adivinhar (comandos, regras, onde fica o que não é óbvio).
2. Tarefa simples, esforço baixo: /effort low.
3. Mudou de assunto, conversa nova: /clear. Conversa pesada: /compact e /context.
4. Desligue os servidores MCP que não está usando.
5. Ficou tudo lento de repente? Veja https://status.claude.com

Transparência: este vídeo foi roteirizado com o Claude Code, e é sobre o próprio Claude. As medições foram feitas pelo Eddwan, com os números reais de cada rodada; a série mostra o Claude Code porque é a ferramenta que usamos no canal, não é patrocínio.

Site: https://eddwan.com
