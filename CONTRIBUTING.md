# Como contribuir

Obrigado por querer ajudar a melhorar o eddwan.com! O site é estático (Astro), sem banco e sem servidor, então dá para rodar tudo na sua máquina em poucos minutos.

## O que é bem-vindo

- **Correções:** link quebrado, erro de digitação, página que quebra no celular, bug de build.
- **Acessibilidade:** contraste, navegação por teclado, leitores de tela, textos alternativos.
- **Desempenho e SEO:** imagens, cache, metadados, Lighthouse.
- **Design e componentes:** melhorias visuais que respeitem a identidade (tema escuro, cores da Hallen Tech).
- **Recursos novos:** busca, comentários, newsletter, modo claro etc. **Abra uma issue antes** para conversar sobre a ideia, assim ninguém perde tempo com algo que não vai entrar.

## O que fica com o Eddwan

- **Os posts do blog** (`src/content/blog/`) saem dos vídeos do canal, e boa parte é gerada automaticamente. Achou um erro num post? Abra uma issue apontando o trecho, que ele corrige.
- **Textos sobre o Eddwan, currículo, portfólio e fotos.** São conteúdo pessoal, com todos os direitos reservados (veja [LICENCA-CONTEUDO.md](LICENCA-CONTEUDO.md)).
- **Deploy, workflows e infraestrutura** (`.github/`, `wrangler.jsonc`, `cloudflare/`). PRs que mexem aqui passam por revisão mais cuidadosa e podem ser recusados sem muita explicação, por segurança.

## Rodar na sua máquina

Precisa do Node 22.23.4 ou mais novo.

```bash
git clone https://github.com/<seu-usuario>/website.git
cd website
npm install
npm run dev        # http://localhost:4321
npm run build      # gera dist/ (o mesmo build do CI)
```

- O build lê o feed público do YouTube para listar os vídeos novos. Sem internet, ou para um build mais rápido: `SEM_FEED_YOUTUBE=1 npm run build`.
- As métricas (PostHog) só ligam no domínio eddwan.com: nada sai da sua máquina.
- Você **não precisa** de conta na Cloudflare. `npm run cf:dev` simula o site no motor do Cloudflare, mas é opcional.

## Fluxo do pull request

1. Faça um fork e crie um branch a partir da `develop` (ex.: `fix/menu-celular`).
2. Faça commits pequenos, com mensagens claras (em português ou inglês).
3. Rode `npm run build` antes de enviar: se o build falha, o CI também falha.
4. Abra o PR **para a `develop`** e preencha o modelo (o que muda, como testar, prints se mexer no visual).
5. O CI roda o build. O Eddwan revisa e, quando aprovado, o PR entra na `develop`. A `develop` vai para a `main`, que é o que está no ar.

Regras rápidas:

- Sem dependências novas sem conversar antes. Cada pacote a mais pesa no site e aumenta a superfície de ataque.
- Sem rastreadores, anúncios ou scripts de terceiros.
- Mantenha o site leve: nada de framework de JavaScript no cliente para coisa que CSS resolve.
- Textos da interface em português do Brasil.

## Código de conduta

Seja gentil e respeitoso nas issues, nos PRs e nos comentários. Ataques pessoais, preconceito ou spam levam a bloqueio.

## Achou uma falha de segurança?

Não abra issue pública. Veja [SECURITY.md](SECURITY.md).
