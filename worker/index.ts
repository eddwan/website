// Worker do site: só roda em /api/* (run_worker_first no wrangler.jsonc). O resto do site continua
// sendo servido direto do dist/ pela Cloudflare, sem passar por aqui.
// Tipos (Env, ExportedHandler): npm run cf:types gera worker/worker-configuration.d.ts.
// env.DB é o banco D1 eddwan-votos (migrações em migrations/).
// env.TURNSTILE_SECRET: no ar via wrangler secret put; no local, em .dev.vars (modelo em .dev.vars.example).

import { verificarTurnstile } from './turnstile';

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
