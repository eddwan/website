// Validação de repositórios sugeridos, na API REST do GitHub (issue #21). Sem SDK: só fetch.
// Docs: https://docs.github.com/rest/repos/repos#get-a-repository
// Token em env.GITHUB_TOKEN (só leitura de repositórios públicos). No ar: npx wrangler secret put GITHUB_TOKEN.
//
// SSRF (Server-Side Request Forgery): se o Worker fizesse fetch do link que a pessoa mandou, ela
// poderia apontar para qualquer endereço (outro site, um serviço interno, uma URL que gasta nosso
// limite) e o pedido sairia da Cloudflare em nosso nome, talvez com o nosso token no cabeçalho.
// Por isso o texto recebido nunca vira URL de fetch: lerRepo só extrai dono e nome, confere os dois
// contra o formato do GitHub, e a URL da API é montada aqui, com host fixo e encodeURIComponent.

// Critérios de uma sugestão válida. Ficam aqui para mudar num lugar só (e na live, com o chat).
// Repositório parado há mais que isso provavelmente foi abandonado, mesmo sem estar arquivado.
const MAX_DIAS_SEM_COMMIT = 365;
// Piso de estrelas: filtra repositório recém-criado ou de teste, sem barrar os pequenos e bons.
const MIN_ESTRELAS = 20;

const API = 'https://api.github.com';
const TIMEOUT = 5000; // em ms, para as duas chamadas juntas
const TAMANHO_MAXIMO = 500; // texto maior que isso nem é analisado

// Formatos do GitHub: dono com letras, números e hífen, sem começar com hífen (até 39);
// nome com letras, números, . _ - (até 100), e nunca "." ou ".."
const FORMATO_DONO = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const FORMATO_NOME = /^[A-Za-z0-9._-]{1,100}$/;

export interface Repo {
  dono: string;
  nome: string;
}

export type Conferencia =
  | { ok: true; nome: string; licenca: string; estrelas: number; ultimoCommit: number }
  | { ok: false; motivo: string; indisponivel?: false }
  | { ok: false; indisponivel: true };

function validar(dono: string | undefined, nomeBruto: string | undefined): Repo | null {
  if (!dono || !nomeBruto) return null;
  const nome = nomeBruto.endsWith('.git') ? nomeBruto.slice(0, -4) : nomeBruto;
  if (!FORMATO_DONO.test(dono) || !FORMATO_NOME.test(nome)) return null;
  if (nome === '.' || nome === '..') return null;
  return { dono, nome };
}

// Aceita https://github.com/dono/nome (com ou sem www, barra no fim, .git, /tree/... ou qualquer
// caminho depois do nome) ou só dono/nome. Qualquer outra coisa: null.
export function lerRepo(texto: string): Repo | null {
  const t = texto.trim();
  if (t.length === 0 || t.length > TAMANHO_MAXIMO) return null;

  if (/^https:\/\//i.test(t)) {
    let url: URL;
    try {
      url = new URL(t);
    } catch {
      return null;
    }
    // Só github.com, na porta padrão e sem usuário:senha (https://github.com@outro.site/ cai aqui)
    if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') return null;
    if (url.port !== '' || url.username !== '' || url.password !== '') return null;
    const [dono, nome] = url.pathname.split('/').filter(Boolean);
    return validar(dono, nome);
  }

  // Só dono/nome: exatamente duas partes
  const partes = t.split('/');
  if (partes.length !== 2) return null;
  return validar(partes[0], partes[1]);
}

interface RespostaRepo {
  full_name: string;
  private: boolean;
  archived: boolean;
  stargazers_count: number;
  default_branch: string;
  license: { spdx_id: string | null } | null;
}

interface RespostaCommit {
  commit: { committer: { date: string } | null };
}

// Erro do nosso lado ou do GitHub (limite, 5xx, timeout, resposta estranha): a pessoa não tem
// culpa, então a API responde "tente mais tarde" em vez de recusar a sugestão. O motivo vai só para o log.
function indisponivel(motivo: string): Conferencia {
  console.error(`GitHub: ${motivo}`);
  return { ok: false, indisponivel: true };
}

const recusa = (motivo: string): Conferencia => ({ ok: false, motivo });

export async function conferirRepo(dono: string, nome: string, token: string): Promise<Conferencia> {
  const cabecalhos = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'eddwan.com-votacao', // a API do GitHub recusa pedido sem User-Agent
  };
  const signal = AbortSignal.timeout(TIMEOUT);
  const base = `${API}/repos/${encodeURIComponent(dono)}/${encodeURIComponent(nome)}`;

  try {
    // 1. O repositório
    const r = await fetch(base, { headers: cabecalhos, signal });
    if (r.status === 404) return recusa('não encontrei esse repositório no GitHub (ele é público?)');
    if (!r.ok) return indisponivel(`/repos respondeu HTTP ${r.status}`);
    const repo = (await r.json()) as RespostaRepo;

    // Se um dia o token enxergar algum repositório privado, ele continua "não encontrado"
    if (repo.private) return recusa('não encontrei esse repositório no GitHub (ele é público?)');
    if (repo.archived) return recusa('esse repositório está arquivado');
    // Sem licença o código é "todos os direitos reservados". NOASSERTION (licença que o GitHub
    // não reconheceu) passa: existe um arquivo de licença, e a Live 8 olha caso a caso.
    if (!repo.license) return recusa('esse repositório não tem licença, e sem licença ninguém pode usar o código');
    // Estrelas antes do commit: já vieram nesta resposta, e recusar aqui poupa a segunda chamada
    if (repo.stargazers_count < MIN_ESTRELAS) return recusa(`ainda tem poucas estrelas (mínimo ${MIN_ESTRELAS})`);

    // 2. O último commit do branch principal
    const c = await fetch(`${base}/commits/${encodeURIComponent(repo.default_branch)}`, { headers: cabecalhos, signal });
    if (c.status === 409) return recusa('esse repositório está vazio'); // o GitHub responde 409 para repositório sem commits
    if (!c.ok) return indisponivel(`/commits respondeu HTTP ${c.status}`);
    const commit = (await c.json()) as RespostaCommit;
    const ms = Date.parse(commit.commit?.committer?.date ?? '');
    if (Number.isNaN(ms)) return indisponivel('commit sem data');
    const ultimoCommit = Math.floor(ms / 1000);
    if (Date.now() / 1000 - ultimoCommit > MAX_DIAS_SEM_COMMIT * 86_400) {
      return recusa('o último commit foi há mais de um ano');
    }

    return {
      ok: true,
      nome: repo.full_name,
      licenca: repo.license.spdx_id ?? 'NOASSERTION',
      estrelas: repo.stargazers_count,
      ultimoCommit,
    };
  } catch (erro) {
    // Timeout (AbortSignal), rede ou JSON inválido
    return indisponivel(`falha na chamada (${erro instanceof Error ? erro.name : 'erro desconhecido'})`);
  }
}
