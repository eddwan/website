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
