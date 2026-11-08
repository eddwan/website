# Instruções para agentes de código

Site pessoal do Eddwan (eddwan.com): Astro 7 estático, conteúdo em Markdown, deploy no Cloudflare Workers. Visão geral no [README](README.md), regras de contribuição em [CONTRIBUTING.md](CONTRIBUTING.md).

- Textos da interface e commits em português do Brasil.
- Rodar: `npm run dev` (porta 4321); conferir: `npm run build` (o CI roda `npm run cf:check`).
- Não invente fatos do currículo nem do portfólio (`src/data/perfil.ts`, `src/content/portfolio/`): só o que o Eddwan confirmou.
- Posts (`src/content/blog/`) seguem o esquema de `src/content.config.ts`; tags novas passam primeiro pelo mapa `src/data/tags.json`.
- Sem dependências novas, rastreadores ou scripts de terceiros sem o OK do Eddwan.
- Nunca ponha segredos no repositório: o token da Cloudflare fica só nos secrets do GitHub.
- Trabalho na `develop`; a `main` é o que está no ar (merge na `main` = deploy).
- Docs do Astro: https://docs.astro.build
