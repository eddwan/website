// Currículo do Eddwan. Fontes: currículo do site antigo (eddwan/website-old, 2021), bio pública do site da
// Hallen Tech (FounderSection, 2026) e o vault do Obsidian. Revisado e aprovado pelo Eddwan em 07/11/2026.

export const NOME_COMPLETO = 'Eddwan Hallen';

export interface Experiencia {
  empresa: string;
  cargo: string;
  periodo: string;
  texto: string;
  confirmar?: string;
}

export const EXPERIENCIAS: Experiencia[] = [
  {
    empresa: 'Hallen Tech',
    cargo: 'Fundador e sócio sênior',
    periodo: '2022 – hoje',
    texto:
      'Conduzo cada projeto do diagnóstico à entrega: arquitetura de sistemas multi-tenant, integrações complexas, DevOps e times técnicos, incluindo squads de agentes de inteligência artificial trabalhando em paralelo. Produtos da casa: VivaHQ, Trama, Trâmite, Lúmen e o Estúdio.',
  },
  {
    empresa: 'Cisco Systems',
    cargo: 'Consulting Engineer, Collaboration Solutions',
    periodo: 'nov/2018 – mai/2026',
    texto:
      'Consultor de soluções de colaboração para operadoras e grandes empresas: entender o cenário de rede inteiro do cliente, recomendar a solução e entregar relatórios e procedimentos bem documentados.',
  },
  {
    empresa: 'Cisco Systems',
    cargo: 'Customer Support Engineer (nível 3)',
    periodo: 'nov/2014 – nov/2018',
    texto:
      'Suporte de nível 3 ao principal produto de colaboração da Cisco, o CUCM: identificar, analisar e entregar o plano de ação e a solução para clientes com falhas no produto.',
  },
  {
    empresa: 'MRS Logística',
    cargo: 'Analista de suporte de redes',
    periodo: 'fev/2008 – nov/2014',
    texto:
      'Segundo nível de rede, telefonia, servidores e terminais de colaboração, rede do datacenter e interconexões. Pesquisa, planejamento e implantação de tecnologias novas, coordenando a equipe de campo.',
  },
  {
    empresa: 'SOL Informática',
    cargo: 'Sócio',
    periodo: 'mai/2004 – fev/2008',
    texto:
      'Manutenção de computadores e pequenos projetos de redes de dados e voz, software, sites e sistemas web para residências e pequenas empresas.',
  },
];

export const FORMACAO = [
  { curso: 'MBA em Gestão de Projetos', onde: 'Universidade Federal de Juiz de Fora (UFJF)', ano: '2013' },
  { curso: 'Tecnologia em Redes de Computadores e Internet', onde: 'Universidade Salgado de Oliveira (UNIVERSO), Juiz de Fora', ano: '2007' },
];

export const CERTIFICACOES = [
  { nome: 'CCIE Collaboration', detalhe: '#58006', emissor: 'Cisco' },
  { nome: 'SSCA (SIP School Certified Associate)', detalhe: '', emissor: 'The SIP School' },
];

export const HABILIDADES = [
  {
    grupo: 'Software',
    itens: ['NestJS + Prisma', 'React + TypeScript', 'Node.js', 'Python & Django', 'Angular', 'Java', 'PHP', 'SQL e NoSQL'],
  },
  {
    grupo: 'Arquitetura e operação',
    itens: ['Arquitetura multi-tenant', 'DevOps & CI/CD', 'Kubernetes', 'Virtualização e containers', 'AWS', 'Google Cloud'],
  },
  {
    grupo: 'Redes, voz e segurança',
    itens: ['Cisco Collaboration (CUCM)', 'Cisco BroadWorks', 'Roteadores e switches Cisco', 'Firewalls e segurança', 'DNS'],
  },
  {
    grupo: 'Gestão e IA',
    itens: ['Gestão de projetos', 'Liderança técnica (CTO sob demanda)', 'Agentes de IA no desenvolvimento', 'Claude Code'],
  },
];

export const IDIOMAS = [
  { idioma: 'Português', nivel: 'nativo' },
  { idioma: 'Inglês', nivel: 'fluente' },
  { idioma: 'Espanhol', nivel: 'fluente' },
];
