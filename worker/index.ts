// Worker do site: só roda em /api/* (run_worker_first no wrangler.jsonc). O resto do site continua
// sendo servido direto do dist/ pela Cloudflare, sem passar por aqui.
// Tipos (Env, ExportedHandler): npm run cf:types gera worker/worker-configuration.d.ts.
// env.DB é o banco D1 eddwan-votos (migrações em migrations/).
// env.TURNSTILE_SECRET: no ar via wrangler secret put; no local, em .dev.vars (modelo em .dev.vars.example).
// env.EMAIL_PEPPER, env.EMAIL_MODO e env.RESEND_API_KEY: idem. env.LIMITE_IP: Rate Limiting dos Workers (wrangler.jsonc).

import { gerarCodigo, hmac, normalizarEmail } from './cripto';
import { enviarCodigo } from './email';
import { verificarTurnstile } from './turnstile';

const VALIDADE_CODIGO = 600; // 10 minutos, em segundos
const JANELA_LIMITE_EMAIL = 3600; // 1 hora: no máximo 3 códigos por e-mail nesse período
const CODIGOS_POR_HORA = 3;
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

// POST /api/entrar { email, turnstile }: manda um código de 6 dígitos para o e-mail.
// Checagens das mais baratas para as mais caras. Deu certo: sempre 200 { ok: true }, sem dizer se o
// e-mail já tem conta (o usuário só é criado no /api/verificar).
async function entrar(request: Request, env: Env): Promise<Response> {
  // 1. Limite por IP (5 a cada 60 s). O IP só serve de chave do contador, não vai para o banco.
  const ip = request.headers.get('CF-Connecting-IP');
  const { success: dentroDoLimite } = await env.LIMITE_IP.limit({ key: ip ?? 'sem-ip' });
  if (!dentroDoLimite) {
    console.warn('/api/entrar: limite por IP atingido');
    return json({ ok: false, erro: 'Muitos pedidos. Tente de novo em instantes.' }, 429, { 'Retry-After': '60' });
  }

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

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname.startsWith('/api/')) {
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
