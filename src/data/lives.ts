// AVISO TEMPORÁRIO: lives da votação open source do eddwan.com (17/11 a 02/12/2026).
// O aviso some sozinho depois do fim: o deploy refaz o build a cada 3 horas
// (cron em .github/workflows/deploy.yml) e o build compara a data abaixo.
// Para tirar de vez: apagar este arquivo e os trechos marcados com "LIVES-VOTACAO" em src/pages/index.astro.

export const LIVES_VOTACAO = {
  // Horário de Brasília (UTC−3)
  inicio: new Date('2026-11-17T20:00:00-03:00'),
  // Esconde o aviso depois da última live (02/12, 21h30)
  expira: new Date('2026-12-02T21:30:00-03:00'),
  link: 'https://www.youtube.com/@eddwan/streams',
};

/** Texto do aviso no momento do build, ou null se as lives já acabaram. */
export function avisoLives(agora = new Date()) {
  if (agora >= LIVES_VOTACAO.expira) return null;
  const comecou = agora >= LIVES_VOTACAO.inicio;
  return {
    rotulo: 'Ao vivo',
    texto: comecou
      ? 'Lives ter a sex, 20h às 21h30, até 02/12: a votação do site ao vivo com IA'
      : 'Lives a partir de 17/11, ter a sex, 20h às 21h30: a votação do site com IA',
    link: LIVES_VOTACAO.link,
  };
}
