// Worker do site: só roda em /api/* (run_worker_first no wrangler.jsonc). O resto do site continua
// sendo servido direto do dist/ pela Cloudflare, sem passar por aqui.
// Tipos (Env, ExportedHandler): npm run cf:types gera worker/worker-configuration.d.ts.
// env.DB é o banco D1 eddwan-votos (migrações em migrations/).
// env.TURNSTILE_SECRET: no ar via wrangler secret put; no local, em .dev.vars (modelo em .dev.vars.example).
// env.EMAIL_PEPPER, env.EMAIL_MODO e env.RESEND_API_KEY: idem. env.LIMITE_IP: Rate Limiting dos Workers (wrangler.jsonc).

import { gerarCodigo, gerarToken, hmac, normalizarEmail, sha256 } from './cripto';
import { enviarCodigo } from './email';
import { verificarTurnstile } from './turnstile';

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

// GET /api/eu: diz se há sessão válida e desde quando. Nunca devolve e-mail.
async function eu(request: Request, env: Env): Promise<Response> {
  const token = lerTokenSessao(request);
  if (!token) return json({ conectado: false });
  try {
    const sessao = await env.DB.prepare('SELECT criado_em FROM sessoes WHERE token_hash = ? AND expira_em > ?')
      .bind(await sha256(token), Math.floor(Date.now() / 1000))
      .first<{ criado_em: number }>();
    if (!sessao) return json({ conectado: false });
    return json({ conectado: true, desde: new Date(sessao.criado_em * 1000).toISOString() });
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

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname.startsWith('/api/')) {
      // CSRF: POST vindo de outro site (Origin presente e diferente do nosso) é recusado.
      // Sem Origin (curl, alguns clientes antigos) passa: o cookie SameSite=Lax cobre o resto.
      const origem = request.headers.get('Origin');
      if (request.method === 'POST' && origem !== null && origem !== new URL(request.url).origin) {
        return json({ ok: false, erro: 'Origem não permitida' }, 403);
      }

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
      return json({ erro: 'Não encontrado' }, 404);
    }

    // Rede de segurança: com run_worker_first só em /api/*, o resto nem chega ao Worker.
    return env.ASSETS.fetch(request);
  },

  // Cron Trigger diário (triggers.crons no wrangler.jsonc): apaga códigos e sessões vencidos.
  // Códigos só saem se, além de vencidos, tiverem sido criados há mais de uma hora: o limite de
  // 3 códigos por hora por e-mail conta as linhas com criado_em na última hora, e apagar um código
  // vencido mais novo que isso zeraria a conta e liberaria novos envios antes da hora.
  // Sem rota HTTP: só a Cloudflare dispara. No local, com --test-scheduled, o /__scheduled cai nos
  // arquivos estáticos (run_worker_first só cobre /api/*); use a rota do wrangler (ver wrangler.jsonc).
  async scheduled(controller, env): Promise<void> {
    const agora = Math.floor(controller.scheduledTime / 1000); // segundos Unix, como expira_em
    const umaHoraAtras = agora - 3600; // mesma janela do limite de códigos por hora
    try {
      const [codigos, sessoes] = await env.DB.batch([
        env.DB.prepare('DELETE FROM codigos WHERE expira_em < ? AND criado_em < ?').bind(agora, umaHoraAtras),
        env.DB.prepare('DELETE FROM sessoes WHERE expira_em < ?').bind(agora),
      ]);
      console.log(
        `Limpeza (${controller.cron}): ${codigos.meta.changes} código(s) e ${sessoes.meta.changes} sessão(ões) vencidos apagados`,
      );
    } catch (erro) {
      console.error('Falha na limpeza de códigos e sessões vencidos', erro);
      throw erro; // marca a execução do cron como falha no painel
    }
  },
} satisfies ExportedHandler<Env>;
