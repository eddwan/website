// Conferência do Turnstile (anti-robô da Cloudflare) no Worker.
// Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
// Fail closed: qualquer dúvida (token ausente, rede, resposta estranha) vira false. O motivo vai só para o log.

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TAMANHO_MAXIMO = 2048; // limite de tamanho do token, pela documentação da Cloudflare

interface RespostaSiteverify {
  success: boolean;
  'error-codes'?: string[];
}

export async function verificarTurnstile(
  token: string | null | undefined,
  ip: string | null,
  segredo: string,
): Promise<boolean> {
  // Sem token ou token grande demais: recusa sem gastar uma chamada à Cloudflare
  if (!token || token.length > TAMANHO_MAXIMO) return false;

  const corpo = new URLSearchParams({ secret: segredo, response: token });
  if (ip) corpo.set('remoteip', ip);

  try {
    const resposta = await fetch(SITEVERIFY, {
      method: 'POST',
      body: corpo,
      signal: AbortSignal.timeout(5000),
    });
    if (!resposta.ok) {
      console.error(`Turnstile: siteverify respondeu HTTP ${resposta.status}`);
      return false;
    }
    const dados = (await resposta.json()) as RespostaSiteverify;
    if (dados.success !== true) {
      console.warn('Turnstile: verificação recusada', dados['error-codes'] ?? []);
      return false;
    }
    return true;
  } catch (erro) {
    console.error('Turnstile: falha ao chamar o siteverify', erro);
    return false;
  }
}
