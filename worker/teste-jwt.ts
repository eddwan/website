// Só para os testes (npm test): pares RSA e tokens assinados como os do Cloudflare Access.
// Não entra no Worker (nada no worker/index.ts importa este arquivo).

import type { ChaveJwk } from './access.ts';

export const EQUIPE = 'equipe-teste';
export const AUD = 'aud-teste-0123456789abcdef';
export const ISS = `https://${EQUIPE}.cloudflareaccess.com`;
export const URL_CERTS = `${ISS}/cdn-cgi/access/certs`;
const ALGORITMO = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } as const;

export type Par = { kid: string; privada: CryptoKey; publica: ChaveJwk };

export async function novoPar(kid: string): Promise<Par> {
  const par = await crypto.subtle.generateKey(
    { ...ALGORITMO, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
    true,
    ['sign', 'verify'],
  );
  const publica = await crypto.subtle.exportKey('jwk', par.publicKey);
  return { kid, privada: par.privateKey, publica: { ...publica, kid } };
}

export const b64url = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64url');
export const b64json = (valor: unknown) => b64url(new TextEncoder().encode(JSON.stringify(valor)));

// Corpo de um token válido agora (aud, iss, email, iat, nbf, exp), com o que vier em extra por cima
export function corpoValido(email: string, extra: Record<string, unknown> = {}) {
  const agora = Math.floor(Date.now() / 1000);
  return { aud: [AUD], iss: ISS, email, iat: agora - 10, nbf: agora - 10, exp: agora + 600, ...extra };
}

export async function assinar(par: Par, corpo: Record<string, unknown>, cabecalho: Record<string, unknown> = {}) {
  const inicio = `${b64json({ alg: 'RS256', kid: par.kid, typ: 'JWT', ...cabecalho })}.${b64json(corpo)}`;
  const assinatura = await crypto.subtle.sign(ALGORITMO, par.privada, new TextEncoder().encode(inicio));
  return `${inicio}.${b64url(new Uint8Array(assinatura))}`;
}
