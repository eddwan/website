// Worker do site: só roda em /api/* (run_worker_first no wrangler.jsonc). O resto do site continua
// sendo servido direto do dist/ pela Cloudflare, sem passar por aqui.
// Tipos (Env, ExportedHandler): npm run cf:types gera worker/worker-configuration.d.ts.
// env.DB é o banco D1 eddwan-votos (migrações em migrations/).
// env.TURNSTILE_SECRET: no ar via wrangler secret put; no local, em .dev.vars (modelo em .dev.vars.example).
// env.EMAIL_PEPPER, env.EMAIL_MODO, env.RESEND_API_KEY e env.GITHUB_TOKEN: idem. env.LIMITE_IP: Rate Limiting dos Workers (wrangler.jsonc).
// env.ACCESS_AUD e env.ACCESS_EQUIPE: vars do wrangler.jsonc (Cloudflare Access, rotas /api/admin/*).

import { verificarAccess } from './access.ts';
import { gerarCodigo, gerarToken, hmac, normalizarEmail, sha256 } from './cripto.ts';
import { enviarCodigo } from './email.ts';
import { conferirRepo, lerRepo } from './github.ts';
import { verificarTurnstile } from './turnstile.ts';

const VALIDADE_CODIGO = 600; // 10 minutos, em segundos
const JANELA_LIMITE_EMAIL = 3600; // 1 hora: no máximo 3 códigos por e-mail nesse período
const CODIGOS_POR_HORA = 3;
const MAX_TENTATIVAS = 5; // tentativas de código por código enviado
const VALIDADE_SESSAO = 2_592_000; // 30 dias, em segundos (também é o Max-Age do cookie)
// __Host-: o navegador só aceita com Secure, Path=/ e sem Domain (o cookie fica preso a eddwan.com)
const COOKIE_SESSAO = '__Host-sessao';
const FORMATO_CODIGO = /^\d{6}$/;
const FORMATO_TOKEN = /^[A-Za-z0-9_-]{43}$/; // 32 bytes em base64url, como gerarToken()
// Formato mínimo: algo@algo.tld, sem espaços, até 254 caracteres (limite prático de um endereço)
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// dono/nome como no GitHub: dono com letras, números e hífen (até 39); nome com letras, números, . _ - (até 100)
const FORMATO_REPO = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/;
const PREFIXO_VOTO = '/api/votos/';
const PREFIXO_SUGESTAO = '/api/sugestoes/';
const PREFIXO_ADMIN = '/api/admin/'; // protegido pelo Cloudflare Access (worker/access.ts)
const PREFIXO_ADMIN_SUGESTAO = '/api/admin/sugestoes/'; // + <dono>/<nome>/aprovar ou /recusar
const MAX_RESUMO = 200; // caracteres do resumo de um candidato aprovado
const MAX_MOTIVO = 280; // caracteres, igual ao CHECK da tabela sugestoes
const SUGESTOES_POR_DIA = 3; // por pessoa, numa janela de 24 horas
const JANELA_SUGESTOES = 86_400; // 24 horas, em segundos

function json(dados: unknown, status = 200, cabecalhos: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(dados), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...cabecalhos,
    },
  });
}

function cookieSessao(token: string, maxAge: number): string {
  return `${COOKIE_SESSAO}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

// Token do cookie de sessão, ou null se não houver um com formato válido
function lerTokenSessao(request: Request): string | null {
  for (const parte of (request.headers.get('Cookie') ?? '').split(';')) {
    const [nome, ...resto] = parte.trim().split('=');
    if (nome === COOKIE_SESSAO) {
      const token = resto.join('=');
      return FORMATO_TOKEN.test(token) ? token : null;
    }
  }
  return null;
}

// Limite por IP (env.LIMITE_IP, 5 a cada 60 s), dividido entre /api/entrar e /api/verificar.
// O IP só serve de chave do contador, não vai para o banco. Passou do limite: devolve o 429.
async function limitarIp(request: Request, env: Env, rota: string): Promise<Response | null> {
  const ip = request.headers.get('CF-Connecting-IP');
  const { success } = await env.LIMITE_IP.limit({ key: ip ?? 'sem-ip' });
  if (success) return null;
  console.warn(`${rota}: limite por IP atingido`);
  return json({ ok: false, erro: 'Muitos pedidos. Tente de novo em instantes.' }, 429, { 'Retry-After': '60' });
}

// POST /api/entrar { email, turnstile }: manda um código de 6 dígitos para o e-mail.
// Checagens das mais baratas para as mais caras. Deu certo: sempre 200 { ok: true }, sem dizer se o
// e-mail já tem conta (o usuário só é criado no /api/verificar).
async function entrar(request: Request, env: Env): Promise<Response> {
  // 1. Limite por IP
  const bloqueio = await limitarIp(request, env, '/api/entrar');
  if (bloqueio) return bloqueio;
  const ip = request.headers.get('CF-Connecting-IP');

  // 2. Corpo: JSON com email e turnstile em texto
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return json({ ok: false, erro: 'Pedido inválido' }, 400);
  }
  const { email: emailBruto, turnstile } = (corpo ?? {}) as Record<string, unknown>;
  if (typeof emailBruto !== 'string' || typeof turnstile !== 'string') {
    return json({ ok: false, erro: 'Pedido inválido' }, 400);
  }

  // 3. Formato do e-mail (antes do Turnstile, para não gastar o siteverify com um pedido que já é 400)
  const email = normalizarEmail(emailBruto);
  if (email.length > 254 || !FORMATO_EMAIL.test(email)) {
    return json({ ok: false, erro: 'E-mail inválido' }, 400);
  }

  // 4. Turnstile
  if (!(await verificarTurnstile(turnstile, ip, env.TURNSTILE_SECRET))) {
    return json({ ok: false, erro: 'Verificação falhou' }, 403);
  }

  if (!env.EMAIL_PEPPER) {
    console.error('/api/entrar: EMAIL_PEPPER não configurado');
    return json({ ok: false, erro: 'Erro interno' }, 500);
  }

  try {
    // 5. Grava o código, respeitando o limite por e-mail. Contagem e INSERT no mesmo comando:
    // dois pedidos ao mesmo tempo não conseguem passar juntos do terceiro código.
    const agora = Math.floor(Date.now() / 1000);
    const emailHmac = await hmac(env.EMAIL_PEPPER, email);
    const codigo = gerarCodigo();
    const codigoHash = await hmac(env.EMAIL_PEPPER, `${emailHmac}:${codigo}`);
    const gravado = await env.DB.prepare(
      `INSERT INTO codigos (email_hmac, codigo_hash, expira_em, criado_em)
       SELECT ?1, ?2, ?3, ?4
       WHERE (SELECT COUNT(*) FROM codigos WHERE email_hmac = ?1 AND criado_em > ?5) < ?6`,
    )
      .bind(emailHmac, codigoHash, agora + VALIDADE_CODIGO, agora, agora - JANELA_LIMITE_EMAIL, CODIGOS_POR_HORA)
      .run();
    if (gravado.meta.changes === 0) {
      console.warn('/api/entrar: limite de códigos por e-mail atingido');
      return json({ ok: false, erro: 'Muitos pedidos. Tente de novo mais tarde.' }, 429, { 'Retry-After': '3600' });
    }

    // 6. Envio. Falhou: apaga o código, para um erro nosso não gastar um dos 3 da pessoa.
    try {
      await enviarCodigo(email, codigo, emailHmac.slice(0, 12), env);
    } catch (erro) {
      // Só a mensagem: enviarCodigo já tira o e-mail dela
      console.error(`/api/entrar: falha ao enviar o código (email_hmac ${emailHmac.slice(0, 12)}…): ${erro instanceof Error ? erro.message : 'erro desconhecido'}`);
      await env.DB.prepare('DELETE FROM codigos WHERE id = ?').bind(gravado.meta.last_row_id).run();
      return json({ ok: false, erro: 'Não foi possível enviar o código' }, 503);
    }
  } catch (erro) {
    console.error('/api/entrar: falha no banco', erro);
    return json({ ok: false, erro: 'Erro interno' }, 500);
  }

  return json({ ok: true });
}

// POST /api/verificar { email, codigo }: confere o código mais recente e ainda válido do e-mail.
// Certo: cria o usuário (se for o primeiro login) e uma sessão de 30 dias em cookie HttpOnly.
async function verificar(request: Request, env: Env): Promise<Response> {
  const bloqueio = await limitarIp(request, env, '/api/verificar');
  if (bloqueio) return bloqueio;

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return json({ ok: false, erro: 'Pedido inválido' }, 400);
  }
  const { email: emailBruto, codigo } = (corpo ?? {}) as Record<string, unknown>;
  if (typeof emailBruto !== 'string' || typeof codigo !== 'string') {
    return json({ ok: false, erro: 'Pedido inválido' }, 400);
  }
  const email = normalizarEmail(emailBruto);
  if (email.length > 254 || !FORMATO_EMAIL.test(email)) {
    return json({ ok: false, erro: 'E-mail inválido' }, 400);
  }
  // Fora do formato nem chega ao banco (e não gasta tentativa)
  if (!FORMATO_CODIGO.test(codigo)) {
    return json({ ok: false, erro: 'Código inválido' }, 400);
  }
  if (!env.EMAIL_PEPPER) {
    console.error('/api/verificar: EMAIL_PEPPER não configurado');
    return json({ ok: false, erro: 'Erro interno' }, 500);
  }

  try {
    const agora = Math.floor(Date.now() / 1000);
    const emailHmac = await hmac(env.EMAIL_PEPPER, email);

    const registro = await env.DB.prepare(
      `SELECT id, codigo_hash, tentativas FROM codigos
       WHERE email_hmac = ? AND expira_em > ? ORDER BY criado_em DESC, id DESC LIMIT 1`,
    )
      .bind(emailHmac, agora)
      .first<{ id: number; codigo_hash: string; tentativas: number }>();
    // Sem código válido: mesma resposta de código errado (não diz se o e-mail pediu código)
    if (!registro) return json({ ok: false, erro: 'Código inválido' }, 400);

    // Reserva a tentativa antes de comparar, num UPDATE condicional: pedidos simultâneos não
    // conseguem passar de 5 tentativas. Se o código estiver certo, ele é apagado logo abaixo.
    const reserva = await env.DB.prepare('UPDATE codigos SET tentativas = tentativas + 1 WHERE id = ? AND tentativas < ?')
      .bind(registro.id, MAX_TENTATIVAS)
      .run();
    if (reserva.meta.changes === 0) {
      console.warn(`/api/verificar: ${MAX_TENTATIVAS} tentativas esgotadas (email_hmac ${emailHmac.slice(0, 12)}…)`);
      return json({ ok: false, erro: 'Tentativas esgotadas. Peça um código novo.' }, 429);
    }

    const esperado = codificar(registro.codigo_hash);
    const recebido = codificar(await hmac(env.EMAIL_PEPPER, `${emailHmac}:${codigo}`));
    if (esperado.byteLength !== recebido.byteLength || !crypto.subtle.timingSafeEqual(esperado, recebido)) {
      return json({ ok: false, erro: 'Código inválido' }, 400);
    }

    // Código certo: tudo numa transação (env.DB.batch). A sessão só é criada se o código ainda
    // existir, então o mesmo código não vale duas vezes nem com dois pedidos ao mesmo tempo.
    const token = gerarToken();
    const [, sessao] = await env.DB.batch([
      env.DB.prepare('INSERT INTO usuarios (email_hmac, criado_em) VALUES (?, ?) ON CONFLICT(email_hmac) DO NOTHING').bind(
        emailHmac,
        agora,
      ),
      env.DB.prepare(
        `INSERT INTO sessoes (token_hash, usuario_id, expira_em, criado_em)
         SELECT ?, id, ?, ? FROM usuarios
         WHERE email_hmac = ? AND EXISTS (SELECT 1 FROM codigos WHERE id = ?)`,
      ).bind(await sha256(token), agora + VALIDADE_SESSAO, agora, emailHmac, registro.id),
      env.DB.prepare('DELETE FROM codigos WHERE email_hmac = ?').bind(emailHmac),
    ]);
    if (sessao.meta.changes === 0) return json({ ok: false, erro: 'Código inválido' }, 400);

    return json({ ok: true }, 200, { 'Set-Cookie': cookieSessao(token, VALIDADE_SESSAO) });
  } catch (erro) {
    console.error('/api/verificar: falha no banco', erro);
    return json({ ok: false, erro: 'Erro interno' }, 500);
  }
}

function codificar(texto: string): Uint8Array {
  return new TextEncoder().encode(texto);
}

// Sessão válida do cookie: id do usuário e quando a sessão começou (segundos Unix), ou null.
// Sem cookie válido nem consulta o banco. Erro no banco sobe para quem chamou.
async function usuarioDaSessao(request: Request, env: Env): Promise<{ usuarioId: number; desde: number } | null> {
  const token = lerTokenSessao(request);
  if (!token) return null;
  const sessao = await env.DB.prepare('SELECT usuario_id, criado_em FROM sessoes WHERE token_hash = ? AND expira_em > ?')
    .bind(await sha256(token), Math.floor(Date.now() / 1000))
    .first<{ usuario_id: number; criado_em: number }>();
  return sessao ? { usuarioId: sessao.usuario_id, desde: sessao.criado_em } : null;
}

// Rodada aberta: a de maior id com aberta = 1
const SQL_RODADA_ABERTA = 'SELECT id FROM rodadas WHERE aberta = 1 ORDER BY id DESC LIMIT 1';

// POST /api/votos { repo } (votado = true) e DELETE /api/votos/<dono>/<nome> (votado = false):
// marca ou desmarca o voto da pessoa num candidato da rodada aberta. Repetir dá a mesma resposta,
// sem somar nem tirar de novo (a chave primária de votos garante um voto por pessoa e repositório).
async function mudarVoto(request: Request, env: Env, votado: boolean): Promise<Response> {
  const rota = votado ? 'POST /api/votos' : 'DELETE /api/votos';
  try {
    const sessao = await usuarioDaSessao(request, env);
    if (!sessao) return json({ ok: false, erro: 'Entre para votar' }, 401);

    let repo: unknown;
    if (votado) {
      try {
        repo = ((await request.json()) as Record<string, unknown> | null)?.repo;
      } catch {
        return json({ ok: false, erro: 'Pedido inválido' }, 400);
      }
    } else {
      repo = new URL(request.url).pathname.slice(PREFIXO_VOTO.length);
    }
    if (typeof repo !== 'string' || !FORMATO_REPO.test(repo)) {
      return json({ ok: false, erro: 'Repositório inválido' }, 400);
    }

    // Rodada aberta e se o repo é candidato dela, numa consulta só
    const alvo = await env.DB.prepare(
      `SELECT id, EXISTS (SELECT 1 FROM repositorios WHERE rodada_id = rodadas.id AND repo = ?) AS candidato
       FROM rodadas WHERE aberta = 1 ORDER BY id DESC LIMIT 1`,
    )
      .bind(repo)
      .first<{ id: number; candidato: number }>();
    if (!alvo) return json({ ok: false, erro: 'Nenhuma votação aberta' }, 409);
    if (!alvo.candidato) return json({ ok: false, erro: 'Repositório não está na votação' }, 404);

    // Grava (ou apaga) e conta na mesma transação: o total já inclui a mudança
    const mudanca = votado
      ? env.DB.prepare(
          'INSERT INTO votos (rodada_id, repo, usuario_id, criado_em) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING',
        ).bind(alvo.id, repo, sessao.usuarioId, Math.floor(Date.now() / 1000))
      : env.DB.prepare('DELETE FROM votos WHERE rodada_id = ? AND repo = ? AND usuario_id = ?').bind(
          alvo.id,
          repo,
          sessao.usuarioId,
        );
    const [, total] = await env.DB.batch<{ votos: number }>([
      mudanca,
      env.DB.prepare('SELECT COUNT(*) AS votos FROM votos WHERE rodada_id = ? AND repo = ?').bind(alvo.id, repo),
    ]);
    return json({ ok: true, repo, votado, votos: total.results[0]?.votos ?? 0 });
  } catch (erro) {
    console.error(`${rota}: falha no banco`, erro);
    return json({ ok: false, erro: 'Erro interno' }, 500);
  }
}

// GET /api/votos: os repos em que a pessoa votou na rodada aberta (lista vazia se não houver rodada aberta)
async function meusVotos(request: Request, env: Env): Promise<Response> {
  try {
    const sessao = await usuarioDaSessao(request, env);
    if (!sessao) return json({ conectado: false });
    const { results } = await env.DB.prepare(
      `SELECT repo FROM votos WHERE usuario_id = ? AND rodada_id = (${SQL_RODADA_ABERTA}) ORDER BY repo`,
    )
      .bind(sessao.usuarioId)
      .all<{ repo: string }>();
    return json({ conectado: true, votos: results.map((linha) => linha.repo) });
  } catch (erro) {
    console.error('GET /api/votos: falha no banco', erro);
    return json({ ok: false, erro: 'Erro interno' }, 500);
  }
}

// Repo (dono/nome em minúsculas) já sugerido ou já candidato da rodada aberta: devolve a resposta
// de "repetida" (200), ou null se for novo. repositorios.repo guarda a grafia do GitHub, daí o lower().
async function sugestaoRepetida(env: Env, repo: string): Promise<Response | null> {
  const conhecido = await env.DB.prepare(
    `SELECT EXISTS (SELECT 1 FROM sugestoes WHERE repo = ?1) AS sugerida,
            EXISTS (SELECT 1 FROM repositorios WHERE rodada_id = (${SQL_RODADA_ABERTA}) AND lower(repo) = ?1) AS candidato`,
  )
    .bind(repo)
    .first<{ sugerida: number; candidato: number }>();
  if (conhecido?.sugerida) return json({ ok: true, repetida: true, mensagem: 'Esse já foi sugerido. Obrigado!' });
  if (conhecido?.candidato) return json({ ok: true, repetida: true, mensagem: 'Esse já está na votação: vote nele!' });
  return null;
}

// POST /api/sugestoes { link, motivo }: sugere um repositório para as próximas rodadas.
// Checagens da mais barata para a mais cara; o GitHub só é chamado no fim, se tudo o mais passou.
// Logs só com o repo: nunca o motivo (texto livre de quem sugeriu) nem dado da pessoa.
async function sugerir(request: Request, env: Env): Promise<Response> {
  try {
    // 1. Sessão
    const sessao = await usuarioDaSessao(request, env);
    if (!sessao) return json({ ok: false, erro: 'Entre para sugerir' }, 401);

    // 2. Corpo: link e motivo em texto
    let corpo: unknown;
    try {
      corpo = await request.json();
    } catch {
      return json({ ok: false, erro: 'Pedido inválido' }, 400);
    }
    const { link, motivo: motivoBruto } = (corpo ?? {}) as Record<string, unknown>;
    if (typeof link !== 'string' || typeof motivoBruto !== 'string') {
      return json({ ok: false, erro: 'Pedido inválido' }, 400);
    }
    // Conta caracteres como o length() do SQLite (um emoji é 1, não 2 como no .length do JS)
    const motivo = motivoBruto.trim();
    const tamanho = [...motivo].length;
    if (tamanho === 0 || tamanho > MAX_MOTIVO) {
      return json({ ok: false, erro: `Conte por que esse repositório merece entrar, em até ${MAX_MOTIVO} caracteres` }, 400);
    }
    const alvo = lerRepo(link);
    if (!alvo) {
      return json({ ok: false, erro: 'Cole o link de um repositório do GitHub, como github.com/dono/nome' }, 400);
    }

    // 3. Já sugerido ou já na votação (antes do limite: repetir não gasta uma das 3 do dia)
    const repetida = await sugestaoRepetida(env, `${alvo.dono}/${alvo.nome}`.toLowerCase());
    if (repetida) return repetida;

    // 4. Limite por dia, contado em envios_sugestao (não em sugestoes: remover uma sugestão não
    // devolve a vaga). Conferido de novo no INSERT, que é o que vale com pedidos simultâneos;
    // este aqui só evita gastar uma chamada ao GitHub com quem já passou do limite.
    const agora = Math.floor(Date.now() / 1000);
    const limite = json({ ok: false, erro: `Você já sugeriu ${SUGESTOES_POR_DIA} repositórios hoje. Volte amanhã!` }, 429, {
      'Retry-After': '3600',
    });
    const hoje = await env.DB.prepare('SELECT COUNT(*) AS total FROM envios_sugestao WHERE usuario_id = ? AND criado_em > ?')
      .bind(sessao.usuarioId, agora - JANELA_SUGESTOES)
      .first<{ total: number }>();
    if ((hoje?.total ?? 0) >= SUGESTOES_POR_DIA) return limite;

    // 5. GitHub
    if (!env.GITHUB_TOKEN) {
      console.error('POST /api/sugestoes: GITHUB_TOKEN não configurado');
      return json({ ok: false, erro: 'Erro interno' }, 500);
    }
    const conferencia = await conferirRepo(alvo.dono, alvo.nome, env.GITHUB_TOKEN);
    if (!conferencia.ok) {
      if (conferencia.indisponivel) {
        return json({ ok: false, erro: 'Não consegui falar com o GitHub agora. Tente de novo em instantes.' }, 503, {
          'Retry-After': '60',
        });
      }
      console.log(`POST /api/sugestoes: ${alvo.dono}/${alvo.nome} recusado (${conferencia.motivo})`);
      return json({ ok: false, erro: conferencia.motivo }, 422);
    }

    // O GitHub segue repositórios renomeados: o full_name pode ser outro. Nesse caso, confere de novo.
    const repo = conferencia.nome.toLowerCase();
    if (repo !== `${alvo.dono}/${alvo.nome}`.toLowerCase()) {
      const renomeado = await sugestaoRepetida(env, repo);
      if (renomeado) return renomeado;
    }

    // 6. Grava, com o limite no mesmo comando (como no /api/entrar). ON CONFLICT(repo): duas
    // pessoas sugerindo o mesmo repo ao mesmo tempo, só a primeira entra.
    // Sugestão e envio numa transação só (env.DB.batch): o envio só entra se a sugestão entrou
    // (changes() é o número de linhas gravadas pela instrução anterior, na mesma conexão).
    const [gravado] = await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO sugestoes (repo, nome, usuario_id, motivo, licenca, estrelas, ultimo_commit, criado_em)
         SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8
         WHERE (SELECT COUNT(*) FROM envios_sugestao WHERE usuario_id = ?3 AND criado_em > ?9) < ?10
         ON CONFLICT(repo) DO NOTHING`,
      ).bind(
        repo,
        conferencia.nome,
        sessao.usuarioId,
        motivo,
        conferencia.licenca,
        conferencia.estrelas,
        conferencia.ultimoCommit,
        agora,
        agora - JANELA_SUGESTOES,
        SUGESTOES_POR_DIA,
      ),
      env.DB.prepare('INSERT INTO envios_sugestao (usuario_id, criado_em) SELECT ?1, ?2 WHERE changes() = 1').bind(
        sessao.usuarioId,
        agora,
      ),
    ]);
    if (gravado.meta.changes === 0) {
      // Não entrou: ou alguém sugeriu o mesmo repo agora há pouco, ou o limite estourou no meio
      return (await sugestaoRepetida(env, repo)) ?? limite;
    }

    console.log(`POST /api/sugestoes: ${conferencia.nome} gravado como pendente`);
    return json({ ok: true, repo: conferencia.nome, status: 'pendente' }, 201);
  } catch (erro) {
    console.error('POST /api/sugestoes: falha no banco', erro);
    return json({ ok: false, erro: 'Erro interno' }, 500);
  }
}

// DELETE /api/sugestoes/<dono>/<nome>: a pessoa desiste de uma sugestão sua que ainda está pendente.
// Aprovada ou recusada já passou pela curadoria (Live 8) e fica. Dono e status vão no próprio
// DELETE: não há janela entre conferir e apagar em que a curadoria mude o status.
// Removida, o repo fica livre para ser sugerido de novo, mas o envio continua contando no limite
// do dia (envios_sugestao): sugerir e remover em loop não abre vaga nova.
async function removerSugestao(request: Request, env: Env): Promise<Response> {
  try {
    const sessao = await usuarioDaSessao(request, env);
    if (!sessao) return json({ ok: false, erro: 'Entre para remover' }, 401);

    const caminho = new URL(request.url).pathname.slice(PREFIXO_SUGESTAO.length);
    if (!FORMATO_REPO.test(caminho)) return json({ ok: false, erro: 'Repositório inválido' }, 400);
    const repo = caminho.toLowerCase();

    const removida = await env.DB.prepare(
      "DELETE FROM sugestoes WHERE repo = ? AND usuario_id = ? AND status = 'pendente' RETURNING nome",
    )
      .bind(repo, sessao.usuarioId)
      .first<{ nome: string }>();
    if (removida) {
      console.log(`DELETE /api/sugestoes: ${removida.nome} removido por quem sugeriu`);
      return json({ ok: true, repo: removida.nome, removida: true });
    }

    // Não apagou: ou não existe, ou é de outra pessoa (os dois viram 404, sem dizer qual),
    // ou já passou pela curadoria
    const sua = await env.DB.prepare('SELECT status FROM sugestoes WHERE repo = ? AND usuario_id = ?')
      .bind(repo, sessao.usuarioId)
      .first<{ status: string }>();
    if (!sua) return json({ ok: false, erro: 'Sugestão não encontrada' }, 404);
    return json(
      { ok: false, erro: `Essa sugestão já foi ${sua.status} na curadoria e não pode mais ser removida.`, status: sua.status },
      409,
    );
  } catch (erro) {
    console.error('DELETE /api/sugestoes: falha no banco', erro);
    return json({ ok: false, erro: 'Erro interno' }, 500);
  }
}

// GET /api/sugestoes: as sugestões da pessoa, da mais nova para a mais velha (criado_em em segundos Unix).
// motivo_recusa vem preenchido só nas recusadas (null nas outras): quem sugeriu sabe por quê.
async function minhasSugestoes(request: Request, env: Env): Promise<Response> {
  try {
    const sessao = await usuarioDaSessao(request, env);
    if (!sessao) return json({ conectado: false });
    const { results } = await env.DB.prepare(
      'SELECT nome, status, motivo_recusa, criado_em FROM sugestoes WHERE usuario_id = ? ORDER BY criado_em DESC, id DESC',
    )
      .bind(sessao.usuarioId)
      .all<{ nome: string; status: string; motivo_recusa: string | null; criado_em: number }>();
    return json({ conectado: true, sugestoes: results });
  } catch (erro) {
    console.error('GET /api/sugestoes: falha no banco', erro);
    return json({ ok: false, erro: 'Erro interno' }, 500);
  }
}

// GET /api/votacao: placar público da rodada aberta, igual para todo mundo.
// Por que os votos da pessoa não vêm aqui: esta resposta fica 60 s no cache (caches.default e
// navegador), com a URL como chave e sem cookie. Se ela dissesse "você votou em X", a resposta de
// uma pessoa poderia ser servida a outra, ou o cache teria de ser por pessoa, e cada visita voltaria
// a consultar o D1. Por isso nem lemos o cookie aqui: o que é de cada um fica no GET /api/votos,
// sempre no-store, e a página junta as duas respostas.
const CACHE_PLACAR = 60; // segundos

async function placar(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  // Chave só com origem e caminho: query string (?x=1) não cria entradas novas nem fura o cache
  const url = new URL(request.url);
  const chave = new Request(`${url.origin}${url.pathname}`, { method: 'GET' });
  const cache = caches.default;

  const guardada = await cache.match(chave);
  if (guardada) {
    console.log('/api/votacao: do cache');
    return guardada;
  }

  try {
    // Uma consulta: rodada aberta, candidatos e contagem de votos. LEFT JOIN em votos para o
    // candidato sem voto aparecer com 0; LEFT JOIN em repositorios para a rodada sem candidatos
    // vir numa linha com repo NULL. Sem rodada aberta, nenhuma linha.
    const { results } = await env.DB.prepare(
      `WITH aberta AS (SELECT id, titulo FROM rodadas WHERE aberta = 1 ORDER BY id DESC LIMIT 1)
       SELECT a.id, a.titulo, r.repo, r.nome, r.url, r.resumo, COUNT(v.usuario_id) AS votos
       FROM aberta a
       LEFT JOIN repositorios r ON r.rodada_id = a.id
       LEFT JOIN votos v ON v.rodada_id = r.rodada_id AND v.repo = r.repo
       GROUP BY a.id, r.repo
       ORDER BY votos DESC, r.nome COLLATE NOCASE, r.repo`,
    ).all<{
      id: number;
      titulo: string;
      repo: string | null;
      nome: string | null;
      url: string | null;
      resumo: string | null;
      votos: number;
    }>();

    const primeira = results[0];
    const corpo = primeira
      ? {
          rodada: { id: primeira.id, titulo: primeira.titulo },
          candidatos: results
            .filter((linha) => linha.repo !== null)
            .map(({ repo, nome, url, resumo, votos }) => ({ repo, nome, url, resumo, votos })),
        }
      : { rodada: null, candidatos: [] };

    const resposta = json(corpo, 200, { 'Cache-Control': `public, max-age=${CACHE_PLACAR}` });
    // Guarda sem segurar a resposta; o cache respeita o max-age e descarta depois de 60 s
    ctx.waitUntil(cache.put(chave, resposta.clone()));
    console.log('/api/votacao: do banco');
    return resposta;
  } catch (erro) {
    // Erro não vai para o cache (json() usa no-store por padrão)
    console.error('/api/votacao: falha no banco', erro);
    return json({ ok: false, erro: 'Erro interno' }, 500);
  }
}

// GET /api/eu: diz se há sessão válida e desde quando. Nunca devolve e-mail.
async function eu(request: Request, env: Env): Promise<Response> {
  try {
    const sessao = await usuarioDaSessao(request, env);
    if (!sessao) return json({ conectado: false });
    return json({ conectado: true, desde: new Date(sessao.desde * 1000).toISOString() });
  } catch (erro) {
    console.error('/api/eu: falha no banco', erro);
    return json({ ok: false, erro: 'Erro interno' }, 500);
  }
}

// POST /api/sair: apaga a sessão no banco e o cookie. Sem sessão, responde igual.
async function sair(request: Request, env: Env): Promise<Response> {
  const token = lerTokenSessao(request);
  if (token) {
    try {
      await env.DB.prepare('DELETE FROM sessoes WHERE token_hash = ?').bind(await sha256(token)).run();
    } catch (erro) {
      console.error('/api/sair: falha no banco', erro);
      return json({ ok: false, erro: 'Erro interno' }, 500);
    }
  }
  return json({ ok: true }, 200, { 'Set-Cookie': cookieSessao('', 0) });
}

// CSRF: qualquer método que muda algo (fora GET, HEAD e OPTIONS) vindo de outro site (Origin
// presente e diferente do nosso) é recusado. Sem Origin (curl, alguns clientes antigos) passa:
// o cookie SameSite=Lax cobre o resto (e, no admin, o Access).
function origemDeFora(request: Request): boolean {
  const origem = request.headers.get('Origin');
  const metodoSeguro = request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS';
  return !metodoSeguro && origem !== null && origem !== new URL(request.url).origin;
}

// --- Administração (issue #22). Só chega aqui quem passou pelo verificarAccess. ---
// Logs só com o repo: nunca o e-mail de quem moderou, nem o resumo ou o motivo.

// Corpo { [campo]: texto } com 1 a max caracteres depois do trim (contados como o length() do SQLite).
// Devolve o texto, ou a resposta 400.
async function lerTextoDoCorpo(request: Request, campo: string, max: number, erro: string): Promise<string | Response> {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return json({ ok: false, erro: 'Pedido inválido' }, 400);
  }
  const valor = ((corpo ?? {}) as Record<string, unknown>)[campo];
  const texto = typeof valor === 'string' ? valor.trim() : '';
  const tamanho = [...texto].length;
  if (tamanho === 0 || tamanho > max) return json({ ok: false, erro }, 400);
  return texto;
}

// Nada mudou no UPDATE: diz por quê. Inexistente, 404; já decidida, 409. null: ainda pendente
// (no aprovar, quer dizer que faltou a rodada aberta).
async function sugestaoNaoPendente(env: Env, repo: string): Promise<Response | null> {
  const sugestao = await env.DB.prepare('SELECT status FROM sugestoes WHERE repo = ?').bind(repo).first<{ status: string }>();
  if (!sugestao) return json({ ok: false, erro: 'Sugestão não encontrada' }, 404);
  if (sugestao.status !== 'pendente') {
    return json({ ok: false, erro: `Essa sugestão já foi ${sugestao.status}.`, status: sugestao.status }, 409);
  }
  return null;
}

// GET /api/admin/sugestoes: a fila de pendentes, da mais velha para a mais nova. Sem e-mail nem
// usuario_id: a curadoria decide pelo repositório, não por quem sugeriu. no-store (padrão do json()).
async function filaDeSugestoes(env: Env): Promise<Response> {
  try {
    const { results } = await env.DB.prepare(
      `SELECT nome, motivo, licenca, estrelas, ultimo_commit, criado_em
       FROM sugestoes WHERE status = 'pendente' ORDER BY criado_em, id`,
    ).all();
    return json({ ok: true, sugestoes: results });
  } catch (erro) {
    console.error('GET /api/admin/sugestoes: falha no banco', erro);
    return json({ ok: false, erro: 'Erro interno' }, 500);
  }
}

// POST /api/admin/sugestoes/<dono>/<nome>/aprovar { resumo }: a sugestão vira candidato da rodada aberta.
// Atômico: as duas instruções vão num env.DB.batch, que o D1 roda numa transação só (tudo ou nada,
// em sequência, sem outra escrita no meio). O UPDATE só muda a linha se ela ainda estiver pendente
// e houver rodada aberta. O INSERT só acontece se o UPDATE mudou exatamente uma linha:
// changes() = 1 lê o resultado da instrução anterior, e status = 'aprovada' AND revisado_em = ?2
// pega justamente a linha que ele acabou de aprovar. Duas aprovações ao mesmo tempo: a segunda
// encontra status 'aprovada', o UPDATE dela muda 0 linhas e o INSERT dela não roda (409).
// repositorios.repo leva a grafia do GitHub (sugestoes.nome), como os outros candidatos.
async function aprovarSugestao(request: Request, env: Env, repo: string): Promise<Response> {
  const resumo = await lerTextoDoCorpo(request, 'resumo', MAX_RESUMO, `Escreva um resumo de 1 a ${MAX_RESUMO} caracteres`);
  if (resumo instanceof Response) return resumo;
  try {
    const agora = Math.floor(Date.now() / 1000);
    const [aprovada, candidato] = await env.DB.batch([
      env.DB.prepare(
        `UPDATE sugestoes SET status = 'aprovada', revisado_em = ?2
         WHERE repo = ?1 AND status = 'pendente' AND EXISTS (${SQL_RODADA_ABERTA})`,
      ).bind(repo, agora),
      // ON CONFLICT: se o repo já virou candidato por outro caminho, aprova sem duplicar
      env.DB.prepare(
        `INSERT INTO repositorios (rodada_id, repo, nome, url, resumo, criado_em)
         SELECT (${SQL_RODADA_ABERTA}), s.nome, substr(s.nome, instr(s.nome, '/') + 1), 'https://github.com/' || s.nome, ?3, ?2
         FROM sugestoes s
         WHERE changes() = 1 AND s.repo = ?1 AND s.status = 'aprovada' AND s.revisado_em = ?2
         ON CONFLICT (rodada_id, repo) DO NOTHING`,
      ).bind(repo, agora, resumo),
    ]);
    if (aprovada.meta.changes === 0) {
      return (
        (await sugestaoNaoPendente(env, repo)) ??
        json({ ok: false, erro: 'Não há rodada aberta para receber o candidato.' }, 409)
      );
    }
    // O placar fica 60 s em cache: apaga a cópia deste local para o candidato aparecer já
    // (nos outros locais da Cloudflare aparece em até 60 s)
    await caches.default.delete(new Request(`${new URL(request.url).origin}/api/votacao`)).catch(() => false);
    console.log(`POST /api/admin: ${repo} aprovado${candidato.meta.changes === 0 ? ' (já era candidato)' : ''}`);
    return json({ ok: true, repo, status: 'aprovada', candidato: candidato.meta.changes === 1 });
  } catch (erro) {
    console.error('POST /api/admin aprovar: falha no banco', erro);
    return json({ ok: false, erro: 'Erro interno' }, 500);
  }
}

// POST /api/admin/sugestoes/<dono>/<nome>/recusar { motivo }: recusa com o motivo, que quem sugeriu
// vê no GET /api/sugestoes. Uma instrução só, condicionada a status = 'pendente'.
async function recusarSugestao(request: Request, env: Env, repo: string): Promise<Response> {
  const motivo = await lerTextoDoCorpo(request, 'motivo', MAX_MOTIVO, `Escreva o motivo da recusa em 1 a ${MAX_MOTIVO} caracteres`);
  if (motivo instanceof Response) return motivo;
  try {
    const agora = Math.floor(Date.now() / 1000);
    const recusada = await env.DB.prepare(
      `UPDATE sugestoes SET status = 'recusada', motivo_recusa = ?2, revisado_em = ?3
       WHERE repo = ?1 AND status = 'pendente'`,
    )
      .bind(repo, motivo, agora)
      .run();
    if (recusada.meta.changes === 0) {
      return (await sugestaoNaoPendente(env, repo)) ?? json({ ok: false, erro: 'Erro interno' }, 500);
    }
    console.log(`POST /api/admin: ${repo} recusado`);
    return json({ ok: true, repo, status: 'recusada' });
  } catch (erro) {
    console.error('POST /api/admin recusar: falha no banco', erro);
    return json({ ok: false, erro: 'Erro interno' }, 500);
  }
}

// Roteador do /api/admin/*. Caminho conhecido com método errado: 405; caminho desconhecido: 404.
async function rotasAdmin(request: Request, env: Env, pathname: string): Promise<Response> {
  if (pathname === '/api/admin/sugestoes') {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return json({ erro: 'Método não permitido' }, 405, { Allow: 'GET, HEAD' });
    }
    return filaDeSugestoes(env);
  }
  if (pathname.startsWith(PREFIXO_ADMIN_SUGESTAO)) {
    const acao = /^(.+)\/(aprovar|recusar)$/.exec(pathname.slice(PREFIXO_ADMIN_SUGESTAO.length));
    if (acao && FORMATO_REPO.test(acao[1])) {
      if (request.method !== 'POST') return json({ erro: 'Método não permitido' }, 405, { Allow: 'POST' });
      const repo = acao[1].toLowerCase();
      return acao[2] === 'aprovar' ? aprovarSugestao(request, env, repo) : recusarSugestao(request, env, repo);
    }
  }
  return json({ erro: 'Não encontrado' }, 404);
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname.startsWith('/api/')) {
      // Administração: antes de qualquer outra coisa, o JWT do Cloudflare Access (worker/access.ts).
      // Sem as vars, 503 (configuração faltando); token ausente ou inválido, 403. O motivo vai para o
      // log dentro de verificarAccess, sem o token nem o e-mail.
      if (pathname === '/api/admin' || pathname.startsWith(PREFIXO_ADMIN)) {
        if (!env.ACCESS_AUD || !env.ACCESS_EQUIPE) {
          console.error('/api/admin: ACCESS_AUD ou ACCESS_EQUIPE não configurados');
          return json({ ok: false, erro: 'Administração indisponível' }, 503);
        }
        const admin = await verificarAccess(request, env);
        if (!admin) return json({ ok: false, erro: 'Acesso negado' }, 403);
        // Depois do Access, o mesmo CSRF por Origin das outras rotas
        if (origemDeFora(request)) return json({ ok: false, erro: 'Origem não permitida' }, 403);
        return rotasAdmin(request, env, pathname);
      }

      if (origemDeFora(request)) return json({ ok: false, erro: 'Origem não permitida' }, 403);

      if (pathname === '/api/saude') {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          return json({ erro: 'Método não permitido' }, 405, { Allow: 'GET, HEAD' });
        }
        // Lê a versão do esquema no D1. Falhou: 503 sem detalhes para quem chamou (o erro vai só para o log)
        try {
          const linha = await env.DB.prepare('SELECT valor FROM meta WHERE chave = ?')
            .bind('esquema')
            .first<{ valor: string }>();
          if (!linha) throw new Error('Linha esquema não encontrada na tabela meta');
          return json({ ok: true, banco: 'ok', esquema: linha.valor });
        } catch (erro) {
          console.error('Falha ao ler o banco em /api/saude', erro);
          return json({ ok: false, banco: 'erro' }, 503);
        }
      }
      if (pathname === '/api/turnstile/teste') {
        if (request.method !== 'POST') {
          return json({ erro: 'Método não permitido' }, 405, { Allow: 'POST' });
        }
        // Formulário ilegível (corpo vazio, Content-Type errado) conta como sem token: recusa
        let token: string | null = null;
        try {
          const campo = (await request.formData()).get('cf-turnstile-response');
          token = typeof campo === 'string' ? campo : null;
        } catch {
          token = null;
        }
        const ip = request.headers.get('CF-Connecting-IP');
        if (await verificarTurnstile(token, ip, env.TURNSTILE_SECRET)) {
          return json({ ok: true });
        }
        return json({ ok: false, erro: 'Verificação falhou' }, 403);
      }
      if (pathname === '/api/entrar') {
        if (request.method !== 'POST') {
          return json({ erro: 'Método não permitido' }, 405, { Allow: 'POST' });
        }
        return entrar(request, env);
      }
      if (pathname === '/api/verificar') {
        if (request.method !== 'POST') {
          return json({ erro: 'Método não permitido' }, 405, { Allow: 'POST' });
        }
        return verificar(request, env);
      }
      if (pathname === '/api/eu') {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          return json({ erro: 'Método não permitido' }, 405, { Allow: 'GET, HEAD' });
        }
        return eu(request, env);
      }
      if (pathname === '/api/sair') {
        if (request.method !== 'POST') {
          return json({ erro: 'Método não permitido' }, 405, { Allow: 'POST' });
        }
        return sair(request, env);
      }
      if (pathname === '/api/votacao') {
        if (request.method === 'HEAD') {
          const resposta = await placar(request, env, ctx);
          return new Response(null, resposta);
        }
        if (request.method !== 'GET') {
          return json({ erro: 'Método não permitido' }, 405, { Allow: 'GET, HEAD' });
        }
        return placar(request, env, ctx);
      }
      if (pathname === '/api/votos') {
        if (request.method === 'GET' || request.method === 'HEAD') return meusVotos(request, env);
        if (request.method === 'POST') return mudarVoto(request, env, true);
        return json({ erro: 'Método não permitido' }, 405, { Allow: 'GET, HEAD, POST' });
      }
      if (pathname === '/api/sugestoes') {
        if (request.method === 'GET' || request.method === 'HEAD') return minhasSugestoes(request, env);
        if (request.method === 'POST') return sugerir(request, env);
        return json({ erro: 'Método não permitido' }, 405, { Allow: 'GET, HEAD, POST' });
      }
      if (pathname.startsWith(PREFIXO_SUGESTAO)) {
        if (request.method !== 'DELETE') {
          return json({ erro: 'Método não permitido' }, 405, { Allow: 'DELETE' });
        }
        return removerSugestao(request, env);
      }
      if (pathname.startsWith(PREFIXO_VOTO)) {
        if (request.method !== 'DELETE') {
          return json({ erro: 'Método não permitido' }, 405, { Allow: 'DELETE' });
        }
        return mudarVoto(request, env, false);
      }
      return json({ erro: 'Não encontrado' }, 404);
    }

    // Rede de segurança: com run_worker_first só em /api/*, o resto nem chega ao Worker.
    return env.ASSETS.fetch(request);
  },

  // Cron Trigger diário (triggers.crons no wrangler.jsonc): apaga códigos e sessões vencidos e
  // envios de sugestão com mais de 2 dias (envios_sugestao, que só serve ao limite de 24 h).
  // Códigos só saem se, além de vencidos, tiverem sido criados há mais de uma hora: o limite de
  // 3 códigos por hora por e-mail conta as linhas com criado_em na última hora, e apagar um código
  // vencido mais novo que isso zeraria a conta e liberaria novos envios antes da hora.
  // Sem rota HTTP: só a Cloudflare dispara. No local, com --test-scheduled, o /__scheduled cai nos
  // arquivos estáticos (run_worker_first só cobre /api/*); use a rota do wrangler (ver wrangler.jsonc).
  async scheduled(controller, env): Promise<void> {
    const agora = Math.floor(controller.scheduledTime / 1000); // segundos Unix, como expira_em
    const umaHoraAtras = agora - 3600; // mesma janela do limite de códigos por hora
    try {
      const [codigos, sessoes, envios] = await env.DB.batch([
        env.DB.prepare('DELETE FROM codigos WHERE expira_em < ? AND criado_em < ?').bind(agora, umaHoraAtras),
        env.DB.prepare('DELETE FROM sessoes WHERE expira_em < ?').bind(agora),
        // Envios de sugestão com mais de 2 dias: o limite só olha as últimas 24 h
        env.DB.prepare('DELETE FROM envios_sugestao WHERE criado_em < ?').bind(agora - 2 * JANELA_SUGESTOES),
      ]);
      console.log(
        `Limpeza (${controller.cron}): ${codigos.meta.changes} código(s), ${sessoes.meta.changes} sessão(ões) vencidos e ` +
          `${envios.meta.changes} envio(s) de sugestão antigos apagados`,
      );
    } catch (erro) {
      console.error('Falha na limpeza de códigos e sessões vencidos', erro);
      throw erro; // marca a execução do cron como falha no painel
    }
  },
} satisfies ExportedHandler<Env>;
