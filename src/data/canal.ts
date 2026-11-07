// Vídeos públicos do canal @eddwan (IDs e títulos tirados de youtube-channel/video/publicar/<id>/).
// Para um vídeo novo: acrescente uma linha aqui; se ele tiver post no blog, o post aponta para o mesmo ID.

export type Serie = 'open-source' | 'git' | 'especiais';

export interface VideoCanal {
  id: string;
  titulo: string;
  data?: string; // AAAA-MM-DD (publicação); a ordem da lista já é do mais novo para o mais antigo
  serie: Serie;
  rotulo?: string; // ex.: "Vol. 24", "Ep. 9"
}

export const SERIES: Record<
  Serie,
  { nome: string; resumo: string; playlist?: string; cor: 'laranja' | 'azul' | 'misto' }
> = {
  'open-source': {
    nome: 'Open source do GitHub',
    resumo: 'Top 15 em contagem regressiva: projetos abertos que valem o seu tempo, com licença e atividade conferidas.',
    playlist: 'https://www.youtube.com/playlist?list=PLSeVr9-M4jgE',
    cor: 'laranja',
  },
  git: {
    nome: 'Git e GitHub do zero',
    resumo: 'Do primeiro commit ao pull request, conflitos, Actions e segredos vazados. Para quem está começando.',
    playlist: 'https://www.youtube.com/playlist?list=PLXVQXkiUR9po',
    cor: 'azul',
  },
  especiais: {
    nome: 'Especiais',
    resumo: 'Edições temáticas, explicativos e a trilha para programar.',
    cor: 'misto',
  },
};

const LISTA: VideoCanal[] = [
  { id: 'a2i5_aLkC_k', titulo: 'Mais 15 projetos open source do GitHub que valem o seu tempo', data: '2026-11-07', serie: 'open-source', rotulo: 'Vol. 24' },
  { id: '81AIs-3NrjE', titulo: 'Mais 15 projetos open source do GitHub que valem o seu tempo', data: '2026-11-06', serie: 'open-source', rotulo: 'Vol. 23' },
  { id: 'HskCGNN6gfA', titulo: 'Mais 15 projetos open source do GitHub que valem o seu tempo', data: '2026-11-05', serie: 'open-source', rotulo: 'Vol. 22' },
  { id: 'X1Im9Z_z5mg', titulo: 'Mais 15 projetos open source do GitHub que valem o seu tempo', data: '2026-11-04', serie: 'open-source', rotulo: 'Vol. 21' },
  { id: 'T7LMUjzhKT8', titulo: 'Os 20 campeões: o melhor de cada volume do Open source do GitHub', data: '2026-11-03', serie: 'especiais', rotulo: 'Especial #1' },
  { id: 'Hd4QZv2j6vc', titulo: '15 projetos open source brasileiros no GitHub', data: '2026-10-31', serie: 'open-source', rotulo: 'Vol. 20 · Brasil' },
  { id: '3WVHhk61eFk', titulo: 'Mais 15 projetos open source do GitHub que valem o seu tempo', data: '2026-10-30', serie: 'open-source', rotulo: 'Vol. 19' },
  { id: '45wo7cjBKMk', titulo: 'Git com IA no dia a dia: commit, conflito e PR', data: '2026-10-30', serie: 'git', rotulo: 'Ep. 10' },
  { id: 'WMLGxYmihMk', titulo: 'Subi uma senha no GitHub. E agora?', data: '2026-10-30', serie: 'git', rotulo: 'Ep. 9' },
  { id: 'IvRdBtNMPEg', titulo: 'Mais 15 projetos open source do GitHub que valem o seu tempo', data: '2026-10-29', serie: 'open-source', rotulo: 'Vol. 18' },
  { id: 'LTzng0sG8V4', titulo: 'Mais 15 projetos open source do GitHub que valem o seu tempo', data: '2026-10-28', serie: 'open-source', rotulo: 'Vol. 17' },
  { id: 'n6-jCqV0oLc', titulo: 'Música para programar: 1 hora de synthwave para focar no código', data: '2026-10-28', serie: 'especiais', rotulo: 'Mix' },
  { id: 'Z04sPaDfO0g', titulo: 'Mais 15 projetos open source do GitHub que valem o seu tempo', data: '2026-10-27', serie: 'open-source', rotulo: 'Vol. 16' },
  { id: '0AWCe7c0tkY', titulo: 'Mais 15 projetos open source do GitHub que valem o seu tempo', data: '2026-10-26', serie: 'open-source', rotulo: 'Vol. 15' },
  { id: 'sJwNLx8IjWU', titulo: 'Mais 15 projetos open source do GitHub que valem o seu tempo', data: '2026-10-25', serie: 'open-source', rotulo: 'Vol. 14' },
  { id: 'HUfjA4jnnvc', titulo: 'Mais 15 projetos open source do GitHub que valem o seu tempo', data: '2026-10-24', serie: 'open-source', rotulo: 'Vol. 13' },
  { id: 'jTydZ6piWb4', titulo: 'Mais 15 projetos open source do GitHub que valem o seu tempo', data: '2026-10-22', serie: 'open-source', rotulo: 'Vol. 12' },
  { id: 'H9DP3zcS6Qs', titulo: 'Mais 15 projetos open source do GitHub que valem o seu tempo', data: '2026-10-21', serie: 'open-source', rotulo: 'Vol. 11' },
  { id: 'j3BpajuSvwk', titulo: '15 projetos open source do GitHub que valem o seu tempo', data: '2026-10-20', serie: 'open-source', rotulo: 'Vol. 10' },
  { id: 'EOH8xFpasIs', titulo: 'GitHub Actions na prática: 3 automações para copiar', data: '2026-10-19', serie: 'git', rotulo: 'Ep. 8' },
  { id: '9LaRM8Tn26s', titulo: 'Seus dados estão mesmo no Brasil? Datacenter, nuvem e LGPD explicados', data: '2026-10-19', serie: 'especiais', rotulo: 'Explicativo' },
  { id: 'vkQFu0jjMiA', titulo: 'Sua primeira contribuição open source, do fork ao merge', data: '2026-10-18', serie: 'git', rotulo: 'Ep. 7' },
  { id: 'A7W-3gAuX2Y', titulo: 'GitHub além do código: Issues, Projects, Actions, Pages e Releases', data: '2026-10-17', serie: 'git', rotulo: 'Ep. 6' },
  { id: '4j93ZxZmDUU', titulo: '10 projetos open source do GitHub para diagramas e animações técnicas', data: '2026-10-16', serie: 'open-source', rotulo: 'Vol. 9' },
  { id: 'WX6jHxpcTpU', titulo: '.gitignore, README e boas práticas de commit', data: '2026-10-16', serie: 'git', rotulo: 'Ep. 5' },
  { id: 'l3eYaxiS64g', titulo: 'Desfazendo coisas no Git: restore, reset, revert e reflog', data: '2026-10-15', serie: 'git', rotulo: 'Ep. 4' },
  { id: 'H1ARqOxhcnI', titulo: 'Conflitos de merge sem medo: como ler e resolver', data: '2026-10-14', serie: 'git', rotulo: 'Ep. 3' },
  { id: 'Pb_KdogzJZc', titulo: 'Pull request e code review explicado do zero', data: '2026-10-12', serie: 'git', rotulo: 'Ep. 2' },
  { id: 'wO5IzvprRBs', titulo: '10 projetos open source do GitHub para turbinar o seu fluxo de trabalho', data: '2026-10-15', serie: 'open-source', rotulo: 'Vol. 8' },
  { id: '5OF6lr7mVbI', titulo: '10 projetos open source do GitHub para testar hoje', data: '2026-10-15', serie: 'open-source', rotulo: 'Vol. 7' },
  { id: '2XTBufX-1Rs', titulo: '10 projetos open source do GitHub que valem o seu tempo', data: '2026-10-14', serie: 'open-source', rotulo: 'Vol. 6' },
  { id: 'EmxjlALvvQo', titulo: '10 projetos open source em alta no GitHub esta semana', data: '2026-10-11', serie: 'open-source', rotulo: 'Vol. 5' },
  { id: 'PArXbdIFtDg', titulo: '10 projetos open source do GitHub que vão mudar o jeito que você trabalha', data: '2026-10-10', serie: 'open-source', rotulo: 'Vol. 4' },
  { id: 'A_TJ7g4kUj8', titulo: '10 projetos open source do GitHub que vão mudar o jeito que você trabalha', data: '2026-10-10', serie: 'open-source', rotulo: 'Vol. 3' },
  { id: 'zgDqrBgo77Q', titulo: '10 projetos open source do GitHub que vão mudar o jeito que você trabalha', serie: 'open-source', rotulo: 'Vol. 2' },
  { id: 'eScJHwkbBcA', titulo: 'O que é Git? Explicado do zero: commit, branch, merge e GitHub', data: '2026-10-10', serie: 'git', rotulo: 'Ep. 1' },
];

// Do mais novo para o mais antigo (sem data vai para o fim)
export const VIDEOS: VideoCanal[] = [...LISTA].sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''));

// Números do canal (conferidos em 07/11/2026; atualize quando sair volume ou episódio novo)
export const NUMEROS = [
  { valor: '24', rotulo: 'volumes de open source' },
  { valor: '10', rotulo: 'episódios de Git do zero' },
  { valor: '1.000+', rotulo: 'repositórios avaliados' },
];

// Alguns projetos que já passaram pelo canal (Vol. 24)
export const REPOS_NO_CANAL = [
  'SolidCraft', 'FigCraft', 'Compositor', 'Search', 'Bare Browser', 'Gitagent', 'Epic Infographics', 'Backchannel',
  'Photo Flipbook', 'ThreeUI', 'BoardUI', 'mdxcn', 'OpenForm', 'UI Skills', 'CheckMyGit',
];

export const thumb = (id: string, q: 'hq' | 'mq' | 'maxres' = 'hq') => `https://i.ytimg.com/vi/${id}/${q}default.jpg`;
