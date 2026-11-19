// Worker do site: só roda em /api/* (run_worker_first no wrangler.jsonc). O resto do site continua
// sendo servido direto do dist/ pela Cloudflare, sem passar por aqui.
// Tipos (Env, ExportedHandler): npm run cf:types gera worker/worker-configuration.d.ts.
// env.DB é o banco D1 eddwan-votos (migrações em migrations/).

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
      return json({ erro: 'Não encontrado' }, 404);
    }

    // Rede de segurança: com run_worker_first só em /api/*, o resto nem chega ao Worker.
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
