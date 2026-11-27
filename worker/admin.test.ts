// Testes das rotas de moderação (/api/admin/*), passando pelo fetch do Worker de verdade.
// O banco é um D1 local descartável numa pasta temporária (as migrações de migrations/ rodam antes),
// pelo getPlatformProxy do wrangler; o banco do wrangler dev não é tocado. Rodar: npm test
// O token vem assinado por um par RSA gerado na hora (worker/teste-jwt.ts); a busca das chaves do
// Access (fetch para .../cdn-cgi/access/certs) é trocada por uma que devolve a chave pública desse par.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, mock, test } from 'node:test';
import { getPlatformProxy } from 'wrangler';
import { gerarToken, sha256 } from './cripto.ts';
import worker from './index.ts';
import { assinar, AUD, corpoValido, EQUIPE, novoPar, URL_CERTS, type Par } from './teste-jwt.ts';

const BASE = 'https://eddwan.com';
let pasta: string;
let proxy: Awaited<ReturnType<typeof getPlatformProxy<Env>>>;
let env: Env;
let par: Par;
let token: string;

// Pedido ao Worker. token: string = cabeçalho do Access; null = sem cabeçalho.
async function pedir(caminho: string, opcoes: { metodo?: string; corpo?: unknown; token?: string | null; origem?: string } = {}) {
  const headers = new Headers();
  const jwt = opcoes.token === undefined ? token : opcoes.token;
  if (jwt !== null) headers.set('Cf-Access-Jwt-Assertion', jwt);
  if (opcoes.corpo !== undefined) headers.set('Content-Type', 'application/json');
  if (opcoes.origem) headers.set('Origin', opcoes.origem);
  const request = new Request(`${BASE}${caminho}`, {
    method: opcoes.metodo ?? 'GET',
    headers,
    body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
  });
  const resposta = await worker.fetch!(request as never, env, proxy.ctx as never);
  return { status: resposta.status, corpo: (await resposta.json()) as Record<string, any> };
}

before(async () => {
  pasta = mkdtempSync(join(tmpdir(), 'eddwan-admin-'));
  execFileSync('npx', ['wrangler', 'd1', 'migrations', 'apply', 'eddwan-votos', '--local', '--persist-to', pasta], {
    stdio: 'ignore',
  });
  // --persist-to grava em <pasta>/v3; o getPlatformProxy quer a pasta v3
  proxy = await getPlatformProxy<Env>({ persist: { path: join(pasta, 'v3') } });
  // caches.default (placar) no Node vem do proxy
  (globalThis as any).caches ??= proxy.caches;
  env = { ...proxy.env, ACCESS_AUD: AUD, ACCESS_EQUIPE: EQUIPE };

  par = await novoPar('chave-teste');
  token = await assinar(par, corpoValido('admin@exemplo.com'));
  const fetchOriginal = globalThis.fetch;
  mock.method(globalThis, 'fetch', async (entrada: RequestInfo | URL, init?: RequestInit) => {
    if (String(entrada) === URL_CERTS) return Response.json({ keys: [par.publica] });
    return fetchOriginal(entrada, init);
  });
  mock.method(console, 'log', () => {});
  mock.method(console, 'warn', () => {});

  // Uma pessoa com três sugestões pendentes (a rodada 1, aberta, vem da migração 0004)
  const agora = Math.floor(Date.now() / 1000);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO usuarios (id, email_hmac, criado_em) VALUES (900, 'hmac-teste', ?)").bind(agora),
    ...['Dono/Aprovado', 'Dono/Recusado', 'Dono/Outro'].map((nome, i) =>
      env.DB.prepare(
        `INSERT INTO sugestoes (repo, nome, usuario_id, motivo, licenca, estrelas, ultimo_commit, criado_em)
         VALUES (lower(?1), ?1, 900, 'motivo de quem sugeriu', 'MIT', 100, ?2, ?3)`,
      ).bind(nome, agora, agora - 100 + i),
    ),
  ]);
});

after(async () => {
  mock.restoreAll();
  await proxy?.dispose();
  if (pasta) rmSync(pasta, { recursive: true, force: true });
});

// A fila lista as pendentes da mais velha para a mais nova, sem usuario_id nem e-mail.
test('GET /api/admin/sugestoes lista as pendentes, sem dados de quem sugeriu', async () => {
  const { status, corpo } = await pedir('/api/admin/sugestoes');
  assert.equal(status, 200);
  assert.deepEqual(
    corpo.sugestoes.map((s: { nome: string }) => s.nome),
    ['Dono/Aprovado', 'Dono/Recusado', 'Dono/Outro'],
  );
  assert.deepEqual(Object.keys(corpo.sugestoes[0]).sort(), ['criado_em', 'estrelas', 'licenca', 'motivo', 'nome', 'ultimo_commit']);
});

// Aprovar uma pendente: vira candidato da rodada aberta, com nome e url montados do repo.
test('aprovar uma pendente: aparece em /api/votacao', async () => {
  const { status, corpo } = await pedir('/api/admin/sugestoes/Dono/Aprovado/aprovar', {
    metodo: 'POST',
    corpo: { resumo: '  Um resumo curto do repositório.  ' },
  });
  assert.equal(status, 200);
  assert.equal(corpo.candidato, true);
  const placar = await pedir('/api/votacao', { token: null });
  const candidato = placar.corpo.candidatos.find((c: { repo: string }) => c.repo === 'Dono/Aprovado');
  assert.deepEqual(candidato, {
    repo: 'Dono/Aprovado',
    nome: 'Aprovado',
    url: 'https://github.com/Dono/Aprovado',
    resumo: 'Um resumo curto do repositório.',
    votos: 0,
  });
});

// Aprovar de novo: já decidida, 409, e nenhum candidato duplicado.
test('aprovar de novo dá 409', async () => {
  const { status } = await pedir('/api/admin/sugestoes/dono/aprovado/aprovar', { metodo: 'POST', corpo: { resumo: 'outro' } });
  assert.equal(status, 409);
  const linhas = await env.DB.prepare("SELECT COUNT(*) AS n FROM repositorios WHERE repo = 'Dono/Aprovado'").first<{ n: number }>();
  assert.equal(linhas?.n, 1);
});

// Recusar sem motivo (só espaços): 400, e a sugestão segue pendente.
test('recusar sem motivo dá 400', async () => {
  const { status } = await pedir('/api/admin/sugestoes/Dono/Recusado/recusar', { metodo: 'POST', corpo: { motivo: '   ' } });
  assert.equal(status, 400);
  const linha = await env.DB.prepare("SELECT status FROM sugestoes WHERE repo = 'dono/recusado'").first<{ status: string }>();
  assert.equal(linha?.status, 'pendente');
});

// Recusar com motivo: grava status, motivo_recusa e revisado_em; sai da fila.
test('recusar com motivo grava o motivo e tira da fila', async () => {
  const { status } = await pedir('/api/admin/sugestoes/Dono/Recusado/recusar', {
    metodo: 'POST',
    corpo: { motivo: 'Fora do tema do canal.' },
  });
  assert.equal(status, 200);
  const linha = await env.DB.prepare("SELECT status, motivo_recusa, revisado_em FROM sugestoes WHERE repo = 'dono/recusado'").first<{
    status: string;
    motivo_recusa: string;
    revisado_em: number | null;
  }>();
  assert.equal(linha?.status, 'recusada');
  assert.equal(linha?.motivo_recusa, 'Fora do tema do canal.');
  assert.ok(linha?.revisado_em);
  const fila = await pedir('/api/admin/sugestoes');
  assert.deepEqual(
    fila.corpo.sugestoes.map((s: { nome: string }) => s.nome),
    ['Dono/Outro'],
  );
});

// Quem sugeriu vê o motivo da recusa no GET /api/sugestoes (null nas que não foram recusadas).
test('GET /api/sugestoes de quem sugeriu traz motivo_recusa', async () => {
  const sessao = gerarToken();
  const agora = Math.floor(Date.now() / 1000);
  await env.DB.prepare('INSERT INTO sessoes (token_hash, usuario_id, expira_em, criado_em) VALUES (?, 900, ?, ?)')
    .bind(await sha256(sessao), agora + 3600, agora)
    .run();
  const request = new Request(`${BASE}/api/sugestoes`, { headers: { Cookie: `__Host-sessao=${sessao}` } });
  const resposta = await worker.fetch!(request as never, env, proxy.ctx as never);
  const corpo = (await resposta.json()) as { sugestoes: { nome: string; status: string; motivo_recusa: string | null }[] };
  const porNome = Object.fromEntries(corpo.sugestoes.map((s) => [s.nome, s]));
  assert.equal(porNome['Dono/Recusado'].status, 'recusada');
  assert.equal(porNome['Dono/Recusado'].motivo_recusa, 'Fora do tema do canal.');
  assert.equal(porNome['Dono/Aprovado'].motivo_recusa, null);
});

// Sem o cabeçalho do Access: 403 antes de qualquer outra coisa, nas três rotas.
test('sem token dá 403', async () => {
  for (const [caminho, metodo] of [
    ['/api/admin/sugestoes', 'GET'],
    ['/api/admin/sugestoes/Dono/Outro/aprovar', 'POST'],
    ['/api/admin/sugestoes/Dono/Outro/recusar', 'POST'],
  ]) {
    const { status, corpo } = await pedir(caminho, { metodo, token: null, corpo: metodo === 'POST' ? { resumo: 'x', motivo: 'x' } : undefined });
    assert.equal(status, 403, caminho);
    assert.equal(corpo.erro, 'Acesso negado');
  }
});

// Sugestão que não existe: 404.
test('sugestão inexistente dá 404', async () => {
  const { status } = await pedir('/api/admin/sugestoes/ninguem/nada/recusar', { metodo: 'POST', corpo: { motivo: 'x' } });
  assert.equal(status, 404);
});

// Outro método num caminho de moderação: 405 com Allow.
test('método errado dá 405', async () => {
  assert.equal((await pedir('/api/admin/sugestoes/Dono/Outro/aprovar')).status, 405);
  assert.equal((await pedir('/api/admin/sugestoes', { metodo: 'POST', corpo: {} })).status, 405);
});

// Token válido, mas POST vindo de outro site: o CSRF por Origin recusa.
test('POST com Origin de outro site dá 403', async () => {
  const { status, corpo } = await pedir('/api/admin/sugestoes/Dono/Outro/recusar', {
    metodo: 'POST',
    corpo: { motivo: 'x' },
    origem: 'https://mal.exemplo',
  });
  assert.equal(status, 403);
  assert.equal(corpo.erro, 'Origem não permitida');
});

// Sem rodada aberta: 409, e a sugestão continua pendente (o UPDATE nem mudou a linha).
test('aprovar sem rodada aberta dá 409 e não muda nada', async () => {
  await env.DB.prepare('UPDATE rodadas SET aberta = 0').run();
  const { status, corpo } = await pedir('/api/admin/sugestoes/Dono/Outro/aprovar', { metodo: 'POST', corpo: { resumo: 'x' } });
  await env.DB.prepare('UPDATE rodadas SET aberta = 1 WHERE id = 1').run();
  assert.equal(status, 409);
  assert.match(corpo.erro, /rodada aberta/);
  const linha = await env.DB.prepare("SELECT status FROM sugestoes WHERE repo = 'dono/outro'").first<{ status: string }>();
  assert.equal(linha?.status, 'pendente');
});
