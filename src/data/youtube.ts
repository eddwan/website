// Lê os vídeos mais recentes do canal @eddwan pelo feed público do YouTube, sem chave de API.
// A playlist UULF<canal> é a de uploads só com vídeos longos (sem shorts); o feed traz os 15 últimos.
// Se o YouTube não responder, o build segue só com a LISTA de canal.ts (nunca quebra o deploy).
import type { Serie, VideoCanal } from './canal';

const CANAL = 'UCkA2rpzr8nCPKqvqojveLkw';
const FEED = `https://www.youtube.com/feeds/videos.xml?playlist_id=UULF${CANAL.slice(2)}`;

// "Título | Série #N" (padrão dos títulos do canal) → série e rótulo do cartão
const REGRAS: { padrao: RegExp; serie: Serie; rotulo: (n: string) => string }[] = [
  { padrao: /^Vol\. (\d+)/i, serie: 'open-source', rotulo: (n) => `Vol. ${n}` },
  { padrao: /^Git e GitHub do zero #(\d+)/i, serie: 'git', rotulo: (n) => `Ep. ${n}` },
  { padrao: /^Programando com IA do zero #(\d+)/i, serie: 'ia', rotulo: (n) => `Ep. ${n}` },
  { padrao: /^Especial #(\d+)/i, serie: 'especiais', rotulo: (n) => `Especial #${n}` },
];

const desescapa = (t: string) =>
  t
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

// Data da publicação no horário de Brasília (o feed vem em UTC; vídeo das 21h30 não pode virar o dia seguinte)
const dataBrasilia = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(iso));

export function classifica(tituloCompleto: string): Pick<VideoCanal, 'titulo' | 'serie' | 'rotulo'> {
  const [titulo, ...resto] = tituloCompleto.split(' | ');
  const sufixo = resto.join(' | ').trim();
  for (const r of REGRAS) {
    const m = sufixo.match(r.padrao);
    if (m) return { titulo: titulo.trim(), serie: r.serie, rotulo: r.rotulo(m[1]) };
  }
  return { titulo: titulo.trim(), serie: 'especiais', rotulo: 'Vídeo' };
}

let cache: Promise<VideoCanal[]> | undefined;

export function videosDoFeed(): Promise<VideoCanal[]> {
  cache ??= buscar();
  return cache;
}

async function buscar(): Promise<VideoCanal[]> {
  if (process.env.SEM_FEED_YOUTUBE) return [];
  try {
    const resposta = await fetch(FEED, { signal: AbortSignal.timeout(10_000) });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const xml = await resposta.text();
    const videos = xml
      .split('<entry>')
      .slice(1)
      .map((e) => {
        const id = e.match(/<yt:videoId>([^<]+)</)?.[1];
        const titulo = e.match(/<title>([^<]+)</)?.[1];
        const publicado = e.match(/<published>([^<]+)</)?.[1];
        if (!id || !titulo || !publicado) return undefined;
        return { id, data: dataBrasilia(publicado), ...classifica(desescapa(titulo)) };
      })
      .filter((v): v is VideoCanal => v !== undefined);
    console.log(`[youtube] feed do canal: ${videos.length} vídeos`);
    return videos;
  } catch (erro) {
    console.warn(`[youtube] feed indisponível (${(erro as Error).message}); seguindo só com a lista de canal.ts`);
    return [];
  }
}
