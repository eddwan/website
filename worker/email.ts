// Envio do código de login por e-mail.
// EMAIL_MODO=console (só local): escreve o código no log do wrangler dev, sem mandar nada.
// Qualquer outro valor: manda pela API do Resend (https://resend.com/docs/api-reference/emails/send-email),
// com fetch, sem SDK. Chave em env.RESEND_API_KEY (no ar: npx wrangler secret put RESEND_API_KEY).
// Privacidade: o e-mail de quem pede nunca vai para o log. Para cruzar com o banco, o log usa só
// o começo do email_hmac (refLog).

const RESEND = 'https://api.resend.com/emails';
const REMETENTE = 'eddwan.com <login@eddwan.com>';

interface ErroResend {
  name?: string;
  message?: string;
}

function texto(codigo: string): string {
  return [
    `Seu código para entrar: ${codigo}`,
    '',
    'Ele vale por 10 minutos.',
    '',
    'Se não foi você, é só ignorar este e-mail.',
  ].join('\n');
}

// Sem links de propósito: quem recebe só copia o código. O código só tem dígitos (vem de gerarCodigo),
// então entra no HTML sem escapar.
function html(codigo: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<body style="margin:0;padding:24px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;background:#fff">
  <p style="margin:0 0 16px;font-size:16px">Seu código para entrar:</p>
  <p style="margin:0 0 16px;font-size:36px;font-weight:700;letter-spacing:8px;font-family:ui-monospace,Menlo,Consolas,monospace">${codigo}</p>
  <p style="margin:0 0 16px;font-size:16px">Ele vale por 10 minutos.</p>
  <p style="margin:0;font-size:14px;color:#555">Se não foi você, é só ignorar este e-mail.</p>
</body>
</html>`;
}

export async function enviarCodigo(email: string, codigo: string, refLog: string, env: Env): Promise<void> {
  if (env.EMAIL_MODO === 'console') {
    console.log(`[EMAIL_MODO=console] Código ${codigo} (email_hmac ${refLog}…)`);
    return;
  }

  const chave = (env as Env & { RESEND_API_KEY?: string }).RESEND_API_KEY;
  if (!chave) throw new Error('RESEND_API_KEY não configurada');

  let resposta: Response;
  try {
    resposta = await fetch(RESEND, {
      method: 'POST',
      headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: REMETENTE,
        to: [email],
        subject: `Seu código para entrar no eddwan.com: ${codigo}`,
        text: texto(codigo),
        html: html(codigo),
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (erro) {
    // Erro de rede ou timeout: a mensagem do fetch não traz o corpo do pedido
    throw new Error(`Resend: falha de rede (${erro instanceof Error ? erro.name : 'desconhecida'})`);
  }

  if (!resposta.ok) {
    // A mensagem do Resend pode repetir o endereço (ex.: erro de validação do "to"): sai do log
    let detalhe = '';
    try {
      const dados = (await resposta.json()) as ErroResend;
      detalhe = `${dados.name ?? ''}: ${(dados.message ?? '').split(email).join('[e-mail]')}`;
    } catch {
      detalhe = 'corpo ilegível';
    }
    throw new Error(`Resend respondeu HTTP ${resposta.status} (${detalhe})`);
  }
}
