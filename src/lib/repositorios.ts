/** Minúsculas e sem acento, para a busca casar "codigo" com "Código". O script da /repositorios faz o mesmo com o termo digitado. */
export function normaliza(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/** Conta quantos repositórios têm cada valor, do mais comum ao menos comum (empate em ordem alfabética). */
export function contagem(listas: string[][]): { valor: string; total: number }[] {
  const mapa = new Map<string, number>();
  for (const lista of listas) for (const v of new Set(lista)) mapa.set(v, (mapa.get(v) ?? 0) + 1);
  return [...mapa]
    .map(([valor, total]) => ({ valor, total }))
    .sort((a, b) => b.total - a.total || a.valor.localeCompare(b.valor, 'pt-BR'));
}
