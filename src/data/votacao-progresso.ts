// Progresso da votação open source do eddwan.com, construída ao vivo de 17/11 a 02/12/2026.
// Usado por src/pages/votacao/progresso.astro.
// Depois de cada live: marcar `concluida: true` na live e, se houver, preencher `post`.

export type TipoComponente = 'frontend' | 'backend' | 'banco' | 'nuvem' | 'seguranca' | 'externo';

export interface Componente {
  id: string;
  rotulo: string;
  sub: string;
  tipo: TipoComponente;
  /** Lives em que o componente é criado ou mexido */
  lives: number[];
  x: number;
  y: number;
  w?: number;
  h?: number;
}

export interface Conexao {
  de: string;
  para: string;
  rotulo: string;
  /** Lado de saída e de chegada no desenho */
  lados: ['top' | 'bottom' | 'left' | 'right', 'top' | 'bottom' | 'left' | 'right'];
  /** Lives em que a ligação é construída (padrão: as do destino) */
  lives?: number[];
  tracejada?: boolean;
}

export interface Live {
  n: number;
  data: string; // AAAA-MM-DD, horário de Brasília
  titulo: string;
  resumo: string;
  issue: number;
  video?: string; // id da transmissão no YouTube
  post?: string; // caminho do post no blog
  concluida: boolean;
}

export const LIVES: Live[] = [
  { n: 1, data: '2026-11-17', titulo: 'Catálogo dos repositórios', resumo: 'Formato do catálogo com os repositórios que já saíram no canal, script que exporta a planilha e primeira carga validada no build.', issue: 15, video: 'bFBPFw79P-0', post: '/blog/live-1-catalogo-dos-repositorios-da-votacao-open-source', concluida: true },
  { n: 2, data: '2026-11-18', titulo: 'Página com filtros', resumo: 'A página /repositorios com busca e filtros por tag, linguagem e "alternativa a", e uma página para cada repositório.', issue: 16, video: '2KprhHeC0mU', post: '/blog/live-2-pagina-de-repositorios-com-busca-e-filtros', concluida: true },
  { n: 3, data: '2026-11-19', titulo: 'API e banco D1', resumo: 'O Worker passa a responder em /api, nasce o banco D1 com migrações aplicadas pelo GitHub Actions e o ambiente local roda sem conta.', issue: 17, video: 'c3IrYbnUoGI', post: '/blog/live-3-api-e-banco-d1-na-cloudflare', concluida: true },
  { n: 4, data: '2026-11-20', titulo: 'Login, Turnstile e PRs', resumo: 'Tabelas do login no D1, Turnstile conferido no Worker e revisão ao vivo dos PRs da comunidade.', issue: 18, video: '8dGBZDGDQ9E', post: '/blog/live-4-tabelas-do-login-e-turnstile-na-cloudflare', concluida: true },
  { n: 5, data: '2026-11-24', titulo: 'Login por código', resumo: 'Entrar com o e-mail e um código de 6 dígitos enviado pelo Resend, com sessão de 30 dias.', issue: 19, video: 'wM2llZxqlw0', post: '/blog/live-5-login-por-codigo-de-6-digitos', concluida: true },
  { n: 6, data: '2026-11-25', titulo: 'Votos e placar', resumo: 'Votar nos candidatos do próximo volume, desfazer o voto e ver o placar.', issue: 20, video: 'XaWnU-gF8Ek', post: '/blog/live-6-votos-e-placar-da-votacao', concluida: true },
  { n: 7, data: '2026-11-26', titulo: 'Sugestões validadas', resumo: 'Sugerir um repositório pelo link do GitHub, com validação automática de licença, último commit e estrelas.', issue: 21, video: 'jnrvzi6fhCA', post: '/blog/live-7-sugestoes-validadas-no-github', concluida: true },
  { n: 8, data: '2026-11-27', titulo: 'A página de admin', resumo: 'Moderar as sugestões numa página protegida pelo Cloudflare Access, com o token conferido no Worker, e fechar o furo do limite de sugestões.', issue: 22, video: '69roVH-0ptQ', post: '/blog/live-8-pagina-de-admin-com-cloudflare-access', concluida: true },
  { n: 9, data: '2026-12-01', titulo: 'Votos na planilha', resumo: 'Levar os votos e as sugestões aprovadas para a planilha do canal e fechar a primeira rodada.', issue: 23, concluida: false },
  { n: 10, data: '2026-12-02', titulo: 'Votação aberta', resumo: 'E-mail de reserva, bloqueio de e-mails descartáveis, página de privacidade, revisão de segurança e abertura ao público.', issue: 24, concluida: false },
];

export const COMPONENTES: Componente[] = [
  { id: 'visitante', rotulo: 'Quem assiste', sub: 'navegador', tipo: 'externo', lives: [2], x: 540, y: 40 },
  { id: 'access', rotulo: 'Cloudflare Access', sub: 'protege /admin', tipo: 'seguranca', lives: [8], x: 1040, y: 40 },
  { id: 'ed', rotulo: 'Ed (admin)', sub: 'modera sugestões', tipo: 'externo', lives: [8], x: 1290, y: 40 },
  { id: 'repo', rotulo: 'eddwan/website', sub: 'PRs da comunidade', tipo: 'externo', lives: [4, 8], x: 1540, y: 40 },

  { id: 'catalogo', rotulo: 'repositorios.json', sub: 'catálogo', tipo: 'banco', lives: [1], x: 40, y: 190 },
  { id: 'paginas', rotulo: 'Páginas do Astro', sub: '/repositorios · /votacao', tipo: 'frontend', lives: [2, 5, 6, 10], x: 290, y: 190 },
  { id: 'worker', rotulo: 'Worker eddwan.com', sub: 'arquivos estáticos + /api/* · /api/saude', tipo: 'backend', lives: [3], x: 540, y: 190, w: 910 },
  { id: 'actions', rotulo: 'GitHub Actions', sub: 'deploy + migrações', tipo: 'nuvem', lives: [3], x: 1540, y: 190 },

  { id: 'exportador', rotulo: 'exportar-catalogo', sub: 'lê a planilha', tipo: 'backend', lives: [1], x: 40, y: 340 },
  { id: 'turnstile', rotulo: 'Turnstile', sub: 'barra robôs', tipo: 'seguranca', lives: [4], x: 290, y: 340 },
  { id: 'login', rotulo: 'API de login', sub: 'código de 6 dígitos', tipo: 'backend', lives: [5, 10], x: 540, y: 340 },
  { id: 'votos', rotulo: 'API de votos', sub: 'votar e placar', tipo: 'backend', lives: [6], x: 790, y: 340 },
  { id: 'admin', rotulo: 'API admin', sub: 'aprovar e recusar', tipo: 'backend', lives: [8], x: 1040, y: 340 },
  { id: 'sugestoes', rotulo: 'API de sugestões', sub: 'link + motivo', tipo: 'backend', lives: [7], x: 1290, y: 340 },

  { id: 'planilha', rotulo: 'Planilha do canal', sub: 'repositorios-para-videos', tipo: 'banco', lives: [1, 9], x: 40, y: 490 },
  { id: 'brevo', rotulo: 'Brevo', sub: 'e-mail de reserva', tipo: 'nuvem', lives: [10], x: 290, y: 490 },
  { id: 'resend', rotulo: 'Resend', sub: 'envia o código', tipo: 'nuvem', lives: [5], x: 540, y: 490 },
  { id: 'd1', rotulo: 'D1 eddwan-votos', sub: 'usuarios · codigos · sessoes · votos · sugestoes', tipo: 'banco', lives: [3, 4, 6, 7, 10], x: 790, y: 490, w: 400, h: 72 },
  { id: 'github', rotulo: 'API do GitHub', sub: 'licença, estrelas, commit', tipo: 'externo', lives: [7], x: 1290, y: 490 },

  { id: 'exportaVotos', rotulo: 'Exportar votos', sub: 'wrangler d1, na máquina do Ed', tipo: 'backend', lives: [9], x: 910, y: 640 },
];

export const CONEXOES: Conexao[] = [
  { de: 'visitante', para: 'worker', rotulo: 'HTTPS', lados: ['bottom', 'top'], lives: [3] },
  { de: 'worker', para: 'paginas', rotulo: 'estáticos', lados: ['left', 'right'], lives: [2] },
  { de: 'catalogo', para: 'paginas', rotulo: 'build', lados: ['right', 'left'], lives: [2] },
  { de: 'exportador', para: 'catalogo', rotulo: 'gera JSON', lados: ['top', 'bottom'], lives: [1] },
  { de: 'planilha', para: 'exportador', rotulo: 'Publicados', lados: ['top', 'bottom'], lives: [1] },
  { de: 'worker', para: 'login', rotulo: '/api/entrar', lados: ['bottom', 'top'], lives: [5] },
  { de: 'worker', para: 'votos', rotulo: '/api/votos', lados: ['bottom', 'top'], lives: [6] },
  { de: 'worker', para: 'admin', rotulo: '/api/admin', lados: ['bottom', 'top'], lives: [8] },
  { de: 'worker', para: 'sugestoes', rotulo: '/api/sugestoes', lados: ['bottom', 'top'], lives: [7] },
  { de: 'login', para: 'turnstile', rotulo: 'confere', lados: ['left', 'right'], lives: [4, 5] },
  { de: 'login', para: 'resend', rotulo: 'código', lados: ['bottom', 'top'], lives: [5] },
  { de: 'resend', para: 'brevo', rotulo: 'reserva', lados: ['left', 'right'], lives: [10], tracejada: true },
  { de: 'login', para: 'd1', rotulo: 'sessões', lados: ['right', 'left'], lives: [4, 5] },
  { de: 'votos', para: 'd1', rotulo: 'votos', lados: ['bottom', 'top'], lives: [6] },
  { de: 'admin', para: 'd1', rotulo: 'modera', lados: ['bottom', 'top'], lives: [8] },
  { de: 'sugestoes', para: 'd1', rotulo: 'pendentes', lados: ['left', 'right'], lives: [7] },
  { de: 'sugestoes', para: 'github', rotulo: 'valida link', lados: ['bottom', 'top'], lives: [7] },
  { de: 'ed', para: 'access', rotulo: 'só o Ed', lados: ['left', 'right'], lives: [8] },
  { de: 'access', para: 'worker', rotulo: '/admin', lados: ['bottom', 'top'], lives: [8] },
  { de: 'repo', para: 'actions', rotulo: 'push', lados: ['bottom', 'top'], lives: [3] },
  { de: 'actions', para: 'worker', rotulo: 'deploy', lados: ['left', 'right'], lives: [3] },
  { de: 'd1', para: 'exportaVotos', rotulo: 'rodada', lados: ['bottom', 'top'], lives: [9], tracejada: true },
  { de: 'exportaVotos', para: 'planilha', rotulo: 'votos da comunidade', lados: ['left', 'bottom'], lives: [9], tracejada: true },
];
