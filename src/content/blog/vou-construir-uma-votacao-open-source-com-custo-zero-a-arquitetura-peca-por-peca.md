---
titulo: 'Vou construir uma votação open source com custo zero: a arquitetura peça por peça'
descricao: 'E se o 1º lugar do próximo vídeo fosse escolhido por você? Neste vídeo eu mostro, peça por peça, a arquitetura da votação open source que vai entrar no eddwan.com: front-end, API, banco de dados, login por código no e-mail, proteção contra robôs e página de administração. Tudo no plano grátis da Cloudflare, sem servidor próprio. A votação ainda não existe: ela vai ser construída ao vivo, aqui no canal, com o Claude Code.'
data: 2026-11-09
tipo: artigo
tags: [programação]
youtube:
  id: pqFFk48wpd8
fontes:
  - titulo: 'Workers, limites'
    url: https://developers.cloudflare.com/workers/platform/limits/
  - titulo: 'D1, limites e preços'
    url: https://developers.cloudflare.com/d1/platform/pricing/
  - titulo: 'Turnstile'
    url: https://developers.cloudflare.com/turnstile/
  - titulo: 'Cloudflare Access (Zero Trust, grátis até 50 usuários)'
    url: https://www.cloudflare.com/plans/zero-trust-services/
  - titulo: 'Resend, preços'
    url: https://resend.com/pricing
  - titulo: 'Brevo, preços'
    url: https://www.brevo.com/pricing/
rascunho: false
---

## Neste vídeo

- 1. A ideia
- 2. O desafio: custo zero
- 3. A visão geral
- 4. Front-end: páginas prontas
- 5. A API no mesmo Worker
- 6. O banco de dados
- 7. O login por código
- 8. O e-mail
- 9. A proteção contra robôs
- 10. A página de administração
- 11. Onde ficam os dados
- 12. Cabe no plano grátis?
- 13. E as outras opções?
- 14. Segurança e LGPD
- 15. A construção, ao vivo
- Comunidade e parceiros

## Sobre o vídeo

🔴 LIVES DE CONSTRUÇÃO: terça a sexta, das 20h às 21h30 (horário de Brasília), a partir de terça, 17/11/2026

Ter 17/11 · Live 1 · Formato do catálogo

Qua 18/11 · Live 2 · Página /repositorios

Qui 19/11 · Live 3 · Worker com /api e D1

Sex 20/11 · Live 4 · Tabelas, Turnstile e revisão de PRs

Ter 24/11 · Live 5 · Login por código

Qua 25/11 · Live 6 · Votos e placar

Qui 26/11 · Live 7 · Sugestões

Sex 27/11 · Live 8 · Administração e revisão de PRs

Ter 01/12 · Live 9 · Votos na planilha

Qua 02/12 · Live 10 · Endurecimento e abertura da votação

🧑‍💻 QUER AJUDAR A CONSTRUIR?

Código do site (MIT): https://github.com/eddwan/website

Quadro do projeto, com uma issue por live: https://github.com/users/eddwan/projects/5

Issues abertas: https://github.com/eddwan/website/issues

Como contribuir: https://github.com/eddwan/website/blob/main/CONTRIBUTING.md

Pega uma issue, comenta o plano e abre um pull request. Nas sextas, a revisão dos PRs é ao vivo.

### 🧱 A ARQUITETURA EM UMA LINHA

Páginas prontas (Astro) e API no mesmo Cloudflare Worker, banco no D1 (SQLite), código de 6 dígitos por e-mail com o Resend (Brevo de reserva), Turnstile contra robôs e Cloudflare Access na administração. Custo: R$ 0 por mês.
