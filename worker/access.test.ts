// Testes do verificarAccess (worker/access.ts), com node:test e a WebCrypto do Node. Rodar: npm test
// Um par RSA gerado na hora faz o papel da chave do Access; buscarChaves devolve a parte pública.
// Cada recusa também confere o motivo no log e que o log não traz o token nem o e-mail.

import assert from 'node:assert/strict';
import { afterEach, before, beforeEach, mock, test } from 'node:test';
import { verificarAccess, type ChaveJwk } from './access.ts';

const EQUIPE = 'equipe-teste';
const AUD = 'aud-teste-0123456789abcdef';
const ISS = `https://${EQUIPE}.cloudflareaccess.com`;
const EMAIL = 'admin@exemplo.com';
const ENV = { ACCESS_AUD: AUD, ACCESS_EQUIPE: EQUIPE } as unknown as Env;
const ALGORITMO = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } as const;

type Par = { kid: string; privada: CryptoKey; publica: ChaveJwk };
let chaveA: Par; // publicada pelo "Access"
let chaveB: Par; // de fora: não publicada (até o teste da rotação)
let publicadas: ChaveJwk[] = [];
let buscas = 0;
let urlsBuscadas: string[] = [];
const buscar = async (url: string): Promise<ChaveJwk[]> => {
  buscas++;
  urlsBuscadas.push(url);
  return publicadas;
};

async function novoPar(kid: string): Promise<Par> {
  const par = await crypto.subtle.generateKey(
    { ...ALGORITMO, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
    true,
    ['sign', 'verify'],
  );
  const publica = await crypto.subtle.exportKey('jwk', par.publicKey);
  return { kid, privada: par.privateKey, publica: { ...publica, kid } };
}

const b64url = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64url');
const b64json = (valor: unknown) => b64url(new TextEncoder().encode(JSON.stringify(valor)));

function corpoValido(extra: Record<string, unknown> = {}) {
  const agora = Math.floor(Date.now() / 1000);
  return { aud: [AUD], iss: ISS, email: EMAIL, iat: agora - 10, nbf: agora - 10, exp: agora + 600, ...extra };
}

async function assinar(par: Par, corpo: Record<string, unknown>, cabecalho: Record<string, unknown> = {}) {
  const inicio = `${b64json({ alg: 'RS256', kid: par.kid, typ: 'JWT', ...cabecalho })}.${b64json(corpo)}`;
  const assinatura = await crypto.subtle.sign(ALGORITMO, par.privada, new TextEncoder().encode(inicio));
  return `${inicio}.${b64url(new Uint8Array(assinatura))}`;
}

function pedido(token?: string): Request {
  const headers = new Headers();
  if (token !== undefined) headers.set('Cf-Access-Jwt-Assertion', token);
  return new Request('https://eddwan.com/api/admin/sugestoes', { headers });
}

let avisos: ReturnType<typeof mock.method>;

// Confere a recusa: null, o motivo esperado no log, e nada do token nem do e-mail no log
async function recusa(token: string | undefined, motivo: string) {
  assert.equal(await verificarAccess(pedido(token), ENV, buscar), null);
  const logs = avisos.mock.calls.map((c) => String(c.arguments[0]));
  assert.ok(logs.some((l) => l.includes(motivo)), `esperava "${motivo}" no log, veio ${JSON.stringify(logs)}`);
  for (const l of logs) {
    assert.ok(!l.includes(EMAIL), 'o e-mail não pode ir para o log');
    if (token) assert.ok(!l.includes(token), 'o token não pode ir para o log');
  }
}

before(async () => {
  chaveA = await novoPar('chave-a');
  chaveB = await novoPar('chave-b');
  publicadas = [chaveA.publica];
});
beforeEach(() => {
  avisos = mock.method(console, 'warn', () => {});
});
afterEach(() => mock.restoreAll());

// Token assinado pela chave publicada, com aud, iss, exp, nbf e iat certos: devolve o e-mail.
test('token válido passa e devolve o e-mail', async () => {
  assert.deepEqual(await verificarAccess(pedido(await assinar(chaveA, corpoValido())), ENV, buscar), { email: EMAIL });
  assert.equal(urlsBuscadas[0], `${ISS}/cdn-cgi/access/certs`);
});

// aud como texto (e não lista) também é aceito, como diz a documentação do Access.
test('aud em texto também passa', async () => {
  const token = await assinar(chaveA, corpoValido({ aud: AUD }));
  assert.deepEqual(await verificarAccess(pedido(token), ENV, buscar), { email: EMAIL });
});

// Mesmo kid da chave publicada, mas assinado por outra chave privada: a assinatura não bate.
test('assinatura de outra chave é recusada', async () => {
  await recusa(await assinar({ ...chaveB, kid: chaveA.kid }, corpoValido()), 'assinatura inválida');
});

// Token de outro aplicativo do Access (outra AUD Tag): assinatura boa, mas não é para nós.
test('aud errado é recusado', async () => {
  await recusa(await assinar(chaveA, corpoValido({ aud: ['aud-de-outro-app'] })), 'aud não confere');
});

// Emitido por outra equipe do Zero Trust: o iss não é o nosso.
test('iss errado é recusado', async () => {
  await recusa(await assinar(chaveA, corpoValido({ iss: 'https://outra-equipe.cloudflareaccess.com' })), 'iss não confere');
});

// exp há 2 minutos: além dos 60 s de folga.
test('token vencido é recusado', async () => {
  const agora = Math.floor(Date.now() / 1000);
  await recusa(await assinar(chaveA, corpoValido({ exp: agora - 120, iat: agora - 3600, nbf: agora - 3600 })), 'token vencido');
});

// alg "none" sem assinatura: o ataque clássico de JWT; só RS256 é aceito.
test('alg "none" é recusado', async () => {
  const token = `${b64json({ alg: 'none', kid: chaveA.kid })}.${b64json(corpoValido())}.`;
  await recusa(token, 'alg diferente de RS256');
});

// Pedido que não passou pelo Access (sem o cabeçalho).
test('cabeçalho ausente é recusado', async () => {
  await recusa(undefined, 'cabeçalho ausente');
});

// nbf daqui a 5 minutos: ainda não vale, mesmo com a folga.
test('nbf no futuro é recusado', async () => {
  const agora = Math.floor(Date.now() / 1000);
  await recusa(await assinar(chaveA, corpoValido({ nbf: agora + 300 })), 'nbf');
});

// Chaves em cache: um segundo token válido não busca as chaves de novo.
test('chaves ficam em cache', async () => {
  const antes = buscas;
  assert.ok(await verificarAccess(pedido(await assinar(chaveA, corpoValido())), ENV, buscar));
  assert.equal(buscas, antes);
});

// kid que ninguém publicou: busca de novo uma vez (pode ser rotação) e recusa.
test('kid desconhecido busca de novo uma vez e é recusado', async () => {
  const antes = buscas;
  await recusa(await assinar(chaveB, corpoValido()), 'kid desconhecido');
  assert.equal(buscas, antes + 1);
});

// Rotação: a Cloudflare publica a chave B; o token assinado por ela passa depois de uma nova busca.
test('rotação de chave: kid novo passa depois de buscar de novo', async () => {
  publicadas = [chaveA.publica, chaveB.publica];
  const antes = buscas;
  assert.deepEqual(await verificarAccess(pedido(await assinar(chaveB, corpoValido())), ENV, buscar), { email: EMAIL });
  assert.equal(buscas, antes + 1);
});
