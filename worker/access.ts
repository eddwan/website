// Conferência do JWT do Cloudflare Access (issue #22), só com a WebCrypto, sem dependência.
// O Access fica na frente de eddwan.com/admin e eddwan.com/api/admin e, para quem passou pelo login,
// manda o token no cabeçalho Cf-Access-Jwt-Assertion. O Worker confere o token mesmo assim: se um
// dia a regra do Access sumir ou mudar de caminho, as rotas /api/admin/* continuam fechadas.
// Referência: https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
// Sem modo de desenvolvimento: no wrangler dev não há Access, então /api/admin/* sempre recusa.
// Logs só com o motivo da recusa: nunca o token nem o e-mail.

const CABECALHO = 'Cf-Access-Jwt-Assertion';
const ALGORITMO = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } as const;
const FOLGA = 60; // segundos de tolerância no relógio para exp, nbf e iat
const VALIDADE_CACHE = 3_600_000; // 1 hora, em ms: depois disso as chaves são buscadas de novo
const TIMEOUT = 5000; // ms para buscar as chaves
const FORMATO_EQUIPE = /^[a-z0-9-]{1,63}$/i; // vira subdomínio na URL: nada além de letras, números e hífen
const FORMATO_PARTE = /^[A-Za-z0-9_-]+$/; // base64url sem '='

// Chave pública como o Access publica em /cdn-cgi/access/certs (campo keys)
export interface ChaveJwk {
  kid?: unknown;
  kty?: unknown;
  n?: unknown;
  e?: unknown;
}
export type BuscarChaves = (url: string) => Promise<ChaveJwk[]>;

// Busca padrão: GET nas chaves da equipe. Falhou (rede, status, JSON): lança, e quem chamou recusa.
async function buscarChavesAccess(url: string): Promise<ChaveJwk[]> {
  const resposta = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
  if (!resposta.ok) throw new Error(`certs do Access responderam ${resposta.status}`);
  const corpo = (await resposta.json()) as { keys?: unknown };
  if (!Array.isArray(corpo.keys)) throw new Error('certs do Access sem o campo keys');
  return corpo.keys as ChaveJwk[];
}

// Cache na memória do isolate (cada isolate tem o seu e ele some quando o isolate é reciclado).
// Guardado por URL, já importado como CryptoKey.
let cache: { url: string; chaves: Map<string, CryptoKey>; buscadoEm: number } | null = null;

async function carregarChaves(url: string, buscar: BuscarChaves): Promise<Map<string, CryptoKey>> {
  const chaves = new Map<string, CryptoKey>();
  for (const jwk of await buscar(url)) {
    if (jwk.kty !== 'RSA' || typeof jwk.kid !== 'string') continue;
    if (typeof jwk.n !== 'string' || typeof jwk.e !== 'string') continue;
    try {
      const chave = await crypto.subtle.importKey('jwk', { kty: 'RSA', n: jwk.n, e: jwk.e, ext: true }, ALGORITMO, false, ['verify']);
      chaves.set(jwk.kid, chave);
    } catch {
      // Chave malformada: ignora só ela
    }
  }
  // Só troca o cache se a busca deu certo: uma falha não apaga as chaves que já funcionavam
  cache = { url, chaves, buscadoEm: Date.now() };
  return chaves;
}

// Chave do kid: do cache se ainda vale; se o kid não estiver lá, busca de novo uma vez, porque a
// Cloudflare roda as chaves e um token novo pode vir assinado por uma chave que o cache não conhece.
async function chaveDoKid(kid: string, url: string, buscar: BuscarChaves): Promise<CryptoKey | null> {
  const valido = cache !== null && cache.url === url && Date.now() - cache.buscadoEm < VALIDADE_CACHE;
  const chaves = valido ? cache!.chaves : await carregarChaves(url, buscar);
  const chave = chaves.get(kid);
  if (chave) return chave;
  if (!valido) return null; // acabou de buscar: buscar de novo não muda nada
  return (await carregarChaves(url, buscar)).get(kid) ?? null;
}

function deBase64url(parte: string): Uint8Array<ArrayBuffer> {
  const base64 = parte.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (parte.length % 4)) % 4);
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

function lerJson(parte: string): Record<string, unknown> | null {
  try {
    const valor: unknown = JSON.parse(new TextDecoder().decode(deBase64url(parte)));
    return valor !== null && typeof valor === 'object' && !Array.isArray(valor) ? (valor as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// Confere o token e devolve o motivo da recusa, ou o e-mail de quem entrou
async function conferir(request: Request, env: Env, buscar: BuscarChaves): Promise<{ email: string } | { motivo: string }> {
  const aud = env.ACCESS_AUD;
  const equipe = env.ACCESS_EQUIPE;
  if (!aud || !equipe) return { motivo: 'ACCESS_AUD ou ACCESS_EQUIPE não configurados' };
  if (!FORMATO_EQUIPE.test(equipe)) return { motivo: 'ACCESS_EQUIPE com formato inválido' };
  const emissor = `https://${equipe}.cloudflareaccess.com`;

  const token = request.headers.get(CABECALHO);
  if (!token) return { motivo: 'cabeçalho ausente' };

  const partes = token.split('.');
  if (partes.length !== 3) return { motivo: 'token sem 3 partes' };
  const [parteCabecalho, parteCorpo, parteAssinatura] = partes;

  // alg antes de tudo: só RS256 (nada de "none" nem HS256 com a chave pública como segredo)
  const cabecalho = FORMATO_PARTE.test(parteCabecalho) ? lerJson(parteCabecalho) : null;
  if (!cabecalho) return { motivo: 'cabeçalho do token ilegível' };
  if (cabecalho.alg !== 'RS256') return { motivo: 'alg diferente de RS256' };
  if (typeof cabecalho.kid !== 'string') return { motivo: 'token sem kid' };

  if (!FORMATO_PARTE.test(parteCorpo) || !FORMATO_PARTE.test(parteAssinatura)) return { motivo: 'token malformado' };

  let chave: CryptoKey | null;
  try {
    chave = await chaveDoKid(cabecalho.kid, `${emissor}/cdn-cgi/access/certs`, buscar);
  } catch (erro) {
    console.error('Access: falha ao buscar as chaves', erro);
    return { motivo: 'chaves indisponíveis' };
  }
  if (!chave) return { motivo: 'kid desconhecido' };

  // Assinatura antes de olhar o conteúdo: sem ela, nada do corpo é confiável
  let assinaturaOk = false;
  try {
    const assinado = new TextEncoder().encode(`${parteCabecalho}.${parteCorpo}`);
    assinaturaOk = await crypto.subtle.verify(ALGORITMO, chave, deBase64url(parteAssinatura), assinado);
  } catch {
    assinaturaOk = false;
  }
  if (!assinaturaOk) return { motivo: 'assinatura inválida' };

  const corpo = lerJson(parteCorpo);
  if (!corpo) return { motivo: 'corpo do token ilegível' };

  // aud pode vir como texto ou lista
  const auds = Array.isArray(corpo.aud) ? corpo.aud : [corpo.aud];
  if (!auds.includes(aud)) return { motivo: 'aud não confere' };
  if (corpo.iss !== emissor) return { motivo: 'iss não confere' };

  const agora = Math.floor(Date.now() / 1000);
  if (typeof corpo.exp !== 'number' || corpo.exp + FOLGA <= agora) return { motivo: 'token vencido' };
  if (corpo.nbf !== undefined && (typeof corpo.nbf !== 'number' || corpo.nbf - FOLGA > agora)) {
    return { motivo: 'token ainda não vale (nbf)' };
  }
  if (corpo.iat !== undefined && (typeof corpo.iat !== 'number' || corpo.iat - FOLGA > agora)) {
    return { motivo: 'token emitido no futuro (iat)' };
  }

  if (typeof corpo.email !== 'string' || corpo.email === '') return { motivo: 'token sem e-mail' };
  return { email: corpo.email };
}

// { email } de quem passou pelo Access, ou null (com o motivo no log, sem token nem e-mail).
// buscarChaves só é passado nos testes; no Worker vai a busca padrão.
export async function verificarAccess(
  request: Request,
  env: Env,
  buscarChaves: BuscarChaves = buscarChavesAccess,
): Promise<{ email: string } | null> {
  const resultado = await conferir(request, env, buscarChaves);
  if ('motivo' in resultado) {
    console.warn(`Access: recusado (${resultado.motivo})`);
    return null;
  }
  return resultado;
}
