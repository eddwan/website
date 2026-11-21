export const SITE = {
  nome: 'Eddwan',
  titulo: 'Eddwan',
  descricao:
    'Open source, Git e segurança explicados em português. Blog, notícias, vídeos e projetos do Eddwan, fundador da Hallen Tech.',
  idioma: 'pt-BR',
  autor: 'Eddwan',
};

export const LINKS = {
  youtube: 'https://www.youtube.com/@eddwan',
  inscrever: 'https://www.youtube.com/@eddwan?sub_confirmation=1',
  github: 'https://github.com/eddwan',
  linkedin: 'https://www.linkedin.com/in/eddwan',
  emailComercial: 'contato@hallentech.com',
  hallentech: 'https://hallentech.com',
  comunidade: 'https://chat.whatsapp.com/FkgHk11RMaFDUdTUXgA0IL',
};

export const NAV = [
  { href: '/blog', rotulo: 'Blog' },
  { href: '/videos', rotulo: 'Vídeos' },
  { href: '/repositorios', rotulo: 'Repositórios' },
  { href: '/portfolio', rotulo: 'Portfólio' },
  { href: '/sobre', rotulo: 'Sobre' },
];

export const TIPOS: Record<string, string> = {
  artigo: 'Artigo',
  noticia: 'Notícia',
  lista: 'Lista',
  explicativo: 'Explicativo',
};

// PostHog (US Cloud). A chave do projeto é pública por natureza: vai no navegador de quem visita.
export const POSTHOG = {
  chave: 'phc_BhHMFnQGshocPGG5Znuz2c5huFRjb5JgEEXSQa4p7x7A',
  host: 'https://us.i.posthog.com',
  // Só conta visitas no domínio de produção (nada no npm run dev, na prévia local ou no wrangler dev)
  dominios: ['eddwan.com'],
};

// Turnstile (anti-robô da Cloudflare). A sitekey é pública por natureza: vai no HTML. O segredo fica só no Worker.
// A chave do eddwan.com só funciona no domínio; no local entra a chave de teste da Cloudflare, que sempre passa.
const TURNSTILE_SITEKEY_PRODUCAO = '0x4AAAAAAGK-ePFy2b4rdXLWh5Pzk792qvo';
export const TURNSTILE_SITEKEY_TESTE = '1x00000000000000000000AA';
const HOSTS_LOCAIS = ['localhost', '127.0.0.1', '[::1]'];

// No npm run dev já sai a de teste no build. O cf:dev é um build de produção servido em localhost:8787, por isso
// quem roda no navegador deve usar turnstileSitekey(location.hostname).
export const TURNSTILE_SITEKEY = import.meta.env.DEV ? TURNSTILE_SITEKEY_TESTE : TURNSTILE_SITEKEY_PRODUCAO;

export function turnstileSitekey(hostname: string): string {
  return HOSTS_LOCAIS.includes(hostname) ? TURNSTILE_SITEKEY_TESTE : TURNSTILE_SITEKEY;
}
