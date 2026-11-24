// Funções de criptografia do login, só com a Web Crypto do Workers (sem dependências).

const codificador = new TextEncoder();

function paraHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Mesmo e-mail escrito de jeitos diferentes ("  Fulano@X.com ") vira a mesma chave
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

// HMAC-SHA256 em hex
export async function hmac(segredo: string, texto: string): Promise<string> {
  const chave = await crypto.subtle.importKey(
    'raw',
    codificador.encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return paraHex(await crypto.subtle.sign('HMAC', chave, codificador.encode(texto)));
}

// SHA-256 em hex
export async function sha256(texto: string): Promise<string> {
  return paraHex(await crypto.subtle.digest('SHA-256', codificador.encode(texto)));
}

// Código de 6 dígitos sem viés de módulo: 2^32 não é múltiplo de 1.000.000, então os valores
// acima do maior múltiplo (4.294.000.000) são descartados e sorteados de novo.
const LIMITE_SEM_VIES = Math.floor(2 ** 32 / 1_000_000) * 1_000_000;

export function gerarCodigo(): string {
  const sorteio = new Uint32Array(1);
  do {
    crypto.getRandomValues(sorteio);
  } while (sorteio[0] >= LIMITE_SEM_VIES);
  return String(sorteio[0] % 1_000_000).padStart(6, '0');
}

// Token de sessão: 32 bytes aleatórios em base64url (sem padding)
export function gerarToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
