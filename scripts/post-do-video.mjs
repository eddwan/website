#!/usr/bin/env node
// Monta o RASCUNHO de um post do blog a partir do material de publicação de um vídeo do canal
// (youtube-channel/video/publicar/<id>/: youtube.json, enviados.json, descricoes/*.txt, fontes.md).
//
// Uso:
//   npm run post-do-video -- --listar          vídeos enviados ao YouTube que ainda não têm post
//   npm run post-do-video -- v25-top15         cria src/content/blog/<slug>.md com rascunho: true
//   npm run post-do-video -- v25-top15 --forcar  sobrescreve um post que já exista
//   npm run post-do-video -- v25-top15 --publicar  cria já publicado (rascunho: false)
//   npm run post-do-video -- --feed=ID [--publicar]  monta o post só com o feed público do YouTube (título,
//                                              descrição e shorts), sem a pasta de publicação
//   npm run post-do-video -- --novos           cria e publica o post de cada vídeo longo que já está público no
//                                              canal e ainda não tem post: usa a pasta de publicação quando existe
//                                              e o feed do YouTube quando não (é o que o deploy agendado roda)
//
// A pasta de publicação vem de YOUTUBE_PUBLICAR (padrão: ~/Projetos/hallentech/youtube-channel/video/publicar).
// O post sai como rascunho: revise o título, a descrição e o texto, e troque para rascunho: false.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, isAbsolute, basename } from 'node:path';
import { execFileSync } from 'node:child_process';

const PUBLICAR = process.env.YOUTUBE_PUBLICAR ?? join(homedir(), 'Projetos/hallentech/youtube-channel/video/publicar');
const BLOG = new URL('../src/content/blog/', import.meta.url).pathname;
const CANAL = 'UCkA2rpzr8nCPKqvqojveLkw';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const alvo = args.find((a) => !a.startsWith('--'));

const lerJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const aspas = (t) => `'${String(t).replace(/'/g, "''")}'`;
const slugify = (t) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)
    .replace(/-$/, '');
const semEmoji = (t) => t.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '').replace(/^\s+/, '');
const eShort = (item) => /#shorts/i.test(item.titulo ?? '') || /^short/.test(item.id);

// IDs de vídeo que já têm post no blog
function idsComPost() {
  const ids = new Set();
  for (const f of readdirSync(BLOG).filter((f) => f.endsWith('.md'))) {
    const m = readFileSync(join(BLOG, f), 'utf8').match(/^youtube:\s*\n\s+id:\s*['"]?([\w-]{11})/m);
    if (m) ids.add(m[1]);
  }
  return ids;
}

// Lê o material de um vídeo: item principal, ID no YouTube e shorts enviados
function material(pasta) {
  const yt = join(pasta, 'youtube.json');
  const env = join(pasta, 'enviados.json');
  if (!existsSync(yt) || !existsSync(env)) return undefined;
  const cfg = lerJson(yt);
  const enviados = lerJson(env);
  const itens = (cfg.itens ?? []).filter((i) => enviados[i.id]);
  if (itens.length === 0) return undefined;
  const principal = itens.find((i) => !eShort(i)) ?? itens[0];
  return {
    cfg,
    principal,
    id: enviados[principal.id],
    formato: eShort(principal) ? 'short' : 'video',
    shorts: itens.filter((i) => i !== principal && eShort(i)).map((i) => ({ ...i, yt: enviados[i.id] })),
  };
}

// Data de publicação registrada na LISTA de src/data/canal.ts
function dataDaLista(id) {
  const canal = readFileSync(new URL('../src/data/canal.ts', import.meta.url), 'utf8');
  return canal.split('\n').find((l) => l.includes(`id: '${id}'`))?.match(/data: '(\d{4}-\d{2}-\d{2})'/)?.[1];
}

if (flag('listar')) {
  const comPost = idsComPost();
  const pendentes = readdirSync(PUBLICAR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({ nome: d.name, m: material(join(PUBLICAR, d.name)) }))
    .filter(({ m }) => m && m.formato === 'video' && !comPost.has(m.id))
    .map((p) => ({ ...p, data: dataDaLista(p.m.id) ?? '' }))
    .sort((a, b) => b.data.localeCompare(a.data) || b.nome.localeCompare(a.nome, 'pt', { numeric: true }));
  console.log(`Vídeos enviados sem post no blog (${pendentes.length}):\n`);
  for (const { nome, m, data } of pendentes) console.log(`  ${(data || '          ').padEnd(11)} ${nome.padEnd(26)} ${m.id}  ${m.principal.titulo}`);
  console.log('\nPara criar o rascunho: npm run post-do-video -- <pasta>');
  process.exit(0);
}

// Feeds públicos do canal: uploads longos (UULF) e todos os uploads, com shorts (canal)
const FEED_LONGOS = `https://www.youtube.com/feeds/videos.xml?playlist_id=UULF${CANAL.slice(2)}`;
const FEED_CANAL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CANAL}`;
const desescapa = (t) =>
  t.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
async function lerFeed(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`feed do YouTube: HTTP ${r.status}`);
  return (await r.text())
    .split('<entry>')
    .slice(1)
    .map((e) => ({
      id: e.match(/<yt:videoId>([^<]+)</)?.[1],
      titulo: desescapa(e.match(/<title>([^<]*)</)?.[1] ?? ''),
      short: /youtube\.com\/shorts\//.test(e),
      descricao: desescapa(e.match(/<media:description>([\s\S]*?)<\/media:description>/)?.[1] ?? ''),
    }));
}

// Pastas de publicação por ID do YouTube (vazio quando a pasta do canal não existe, como no GitHub Actions)
function pastasPorId() {
  const mapa = new Map();
  if (!existsSync(PUBLICAR)) return mapa;
  for (const d of readdirSync(PUBLICAR, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const m = material(join(PUBLICAR, d.name));
    if (m) mapa.set(m.id, d.name);
  }
  return mapa;
}

if (flag('novos')) {
  const longos = await lerFeed(FEED_LONGOS);
  const comPost = idsComPost();
  const pastas = pastasPorId();
  const novos = longos.filter((v) => v.id && !comPost.has(v.id));
  if (novos.length === 0) console.log('Nenhum vídeo público novo sem post.');
  for (const v of novos) {
    const origem = pastas.get(v.id) ?? `--feed=${v.id}`;
    execFileSync(process.execPath, [new URL(import.meta.url).pathname, origem, '--publicar'], { stdio: 'inherit' });
  }
  process.exit(0);
}

const idFeed = args.find((a) => a.startsWith('--feed='))?.slice(7);
if (!alvo && !idFeed) {
  console.error('Uso: npm run post-do-video -- <pasta em publicar/> [--forcar]   (ou --listar)');
  process.exit(1);
}

// Material só do feed: título e descrição do vídeo; shorts do canal com o mesmo sufixo no título ("| Vol. 25")
async function materialDoFeed(id) {
  const [longos, canal] = await Promise.all([lerFeed(FEED_LONGOS), lerFeed(FEED_CANAL)]);
  const v = longos.find((x) => x.id === id) ?? canal.find((x) => x.id === id);
  if (!v) return undefined;
  const sufixo = v.titulo.split(' | ').slice(1).join(' | ').trim();
  const shorts = sufixo
    ? canal.filter((x) => x.short && x.titulo.replace(/\s*#shorts\b/i, '').trim().endsWith(`| ${sufixo}`))
    : [];
  // Tags padrão por série (o feed não traz as tags do vídeo)
  const tags = /^Vol\./.test(sufixo)
    ? ['open source', 'github']
    : /Git e GitHub/i.test(sufixo)
      ? ['git', 'github']
      : /com IA/i.test(sufixo)
        ? ['inteligência artificial', 'agentes de código']
        : [];
  return {
    principal: { titulo: v.titulo, tags },
    id,
    formato: v.short ? 'short' : 'video',
    // Ordem da contagem: "#15 a #11", "#10 a #6", "Top 5"
    shorts: shorts
      .map((x) => ({ titulo: x.titulo, yt: x.id, n: Number(x.titulo.match(/#(\d+) a #|Top (\d+)/i)?.slice(1).find(Boolean) ?? 0) }))
      .sort((a, b) => b.n - a.n),
    descricaoTexto: v.descricao,
    // Tipo do post pelo sufixo, como faria o prefixo da pasta (v = lista, e = explicativo, esp = especial)
    prefixo: /^Vol\./.test(sufixo) ? 'v' : /#\d+$/.test(sufixo) && !/^Especial/i.test(sufixo) ? 'e' : /^Especial/i.test(sufixo) ? 'esp' : 'a',
  };
}

const pasta = idFeed ? '' : isAbsolute(alvo) ? alvo : join(PUBLICAR, alvo);
const nomePasta = idFeed ? '' : basename(pasta);
const m = idFeed ? await materialDoFeed(idFeed) : material(pasta);
if (!m) {
  console.error(idFeed ? `Vídeo ${idFeed} não está nos feeds do canal.` : `Nada enviado ao YouTube em ${pasta} (falta youtube.json, enviados.json ou o ID do vídeo).`);
  process.exit(1);
}

// ── Descrição do YouTube: a matéria-prima do post ──
const arquivoDescricao = !idFeed && m.principal.descricao && join(pasta, m.principal.descricao);
const descricaoYT =
  m.descricaoTexto ?? (arquivoDescricao && existsSync(arquivoDescricao) ? readFileSync(arquivoDescricao, 'utf8') : '');
const blocos = descricaoYT
  .split(/\n\s*\n/)
  .map((b) => b.trim())
  .filter(Boolean);

// Blocos que são do canal, não do conteúdo (comunidade, parceiros, oferecimento, hashtags, série)
const doCanal = (b) =>
  /chat\.whatsapp\.com|hallentech\.com|hostinger|parceiros|oferecimento|^#\w|youtube\.com\/playlist|youtu\.be\/|conta nos coment|comenta aqui|inscrev/i.test(
    b,
  );

const tituloYT = m.principal.titulo.replace(/\s*#shorts\b/i, '').trim();
const [tituloBase, ...sufixo] = tituloYT.split(' | ');
const serieTitulo = sufixo.join(' | ');
const vol = serieTitulo.match(/Vol\. (\d+)/)?.[1];
const ep = serieTitulo.match(/#(\d+)$/)?.[1];

const prefixo = m.prefixo ?? nomePasta.match(/^[a-z]+/)?.[0] ?? '';
const tipo = vol || prefixo === 'esp' ? 'lista' : prefixo === 's' && m.formato === 'short' ? 'noticia' : ['e', 'x'].includes(prefixo) ? 'explicativo' : 'artigo';

// Capítulos com link (listas): "0:10 #15 Nome: descrição" + URL na linha seguinte
const capitulos = [];
for (const b of blocos) {
  const linhas = b.split('\n');
  const c = linhas[0].match(/^\d+:\d{2}(?::\d{2})?\s+#(\d+)\s+([^:]+):\s*(.+)$/);
  if (c) capitulos.push({ pos: Number(c[1]), nome: c[2].trim(), texto: c[3].trim(), url: linhas.find((l) => /^https?:\/\//.test(l))?.trim() });
}
// Capítulos simples (explicativos): bloco que começa com "Capítulos"
const blocoCapitulos = blocos.find((b) => /^cap[ií]tulos/i.test(semEmoji(b)));
const listaCapitulos = blocoCapitulos
  ? blocoCapitulos
      .split('\n')
      .slice(1)
      .map((l) => l.match(/^\d+:\d{2}(?::\d{2})?\s+(.+)$/)?.[1])
      .filter((t) => t && !/^(introdução|abertura|encerramento|resumo)$/i.test(t))
  : [];

// Fontes: bloco "Links"/"Fontes" da descrição ("Título: URL") e publicar/<id>/fontes.md (links Markdown)
const fontes = [];
const blocoLinks = blocos.find((b) => /^(links|fontes)\b/i.test(semEmoji(b)));
for (const l of blocoLinks?.split('\n').slice(1) ?? []) {
  const f = l.match(/^(.+?):\s*(https?:\/\/\S+)$/);
  if (f) fontes.push({ titulo: f[1].trim(), url: f[2] });
}
const arquivoFontes = join(pasta, 'fontes.md');
if (!idFeed && existsSync(arquivoFontes)) {
  for (const f of readFileSync(arquivoFontes, 'utf8').matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)) {
    if (!fontes.some((x) => x.url === f[2])) fontes.push({ titulo: f[1], url: f[2] });
  }
}

// Data da publicação: a LISTA de src/data/canal.ts, depois o feed do canal (horário de Brasília), senão hoje
async function dataPublicacao(id) {
  const daLista = dataDaLista(id);
  if (daLista) return daLista;
  try {
    const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CANAL}`, { signal: AbortSignal.timeout(8000) });
    const xml = await r.text();
    const entrada = xml.split('<entry>').find((e) => e.includes(`<yt:videoId>${id}<`));
    const iso = entrada?.match(/<published>([^<]+)</)?.[1];
    if (iso) return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(iso));
  } catch {}
  console.warn('Aviso: data de publicação não encontrada (nem em canal.ts nem no feed); usando a de hoje.');
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}
const data = await dataPublicacao(m.id);

// ── Texto ──
const ordinal = (n) => `${n}º`;
const tituloShort = (t) => {
  const limpo = t.replace(/(\s+#[\p{L}\w]+)+\s*$/u, '').trim();
  const faixa = limpo.match(/#(\d+) a #(\d+)/);
  if (faixa) return `Do ${ordinal(faixa[1])} ao ${ordinal(faixa[2])} lugar`;
  const top = limpo.match(/^Top (\d+)\b/i);
  if (top) return `Do ${ordinal(top[1])} ao 1º lugar`;
  return limpo.split(' | ')[0];
};
const host = (u) => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

// Comandos de terminal e arquivos YAML viram bloco de código. O trecho começa na primeira linha que parece
// código e segue enquanto as linhas forem recuadas, chaves YAML, itens de lista, comentários ou comandos.
const comando = /^(git|gh|npm|npx|pnpm|yarn|pip|python3?|node|docker|kubectl|curl|cd|ls|cat|echo|brew|mkdir|touch|rm|mv|cp|gitleaks|pre-commit|claude|codex)\b/;
const chaveYaml = /^[a-z_][\w.-]*:(\s|$)/;
const pareceCodigo = (l) => comando.test(l) || chaveYaml.test(l) || /^\s+\S/.test(l) || /^-\s/.test(l) || /^#\s/.test(l);
function comCodigo(texto) {
  const saida = [];
  let codigo = [];
  const fecha = () => {
    if (codigo.length) saida.push(codigo.some((l) => chaveYaml.test(l.trim())) ? '```yaml' : '```bash', ...codigo, '```');
    codigo = [];
  };
  let json = false;
  for (const l of texto.split('\n')) {
    if (json || l === '{') {
      if (!json) fecha();
      json = true;
      codigo.push(l);
      if (l === '}') {
        saida.push('```json', ...codigo, '```');
        codigo = [];
        json = false;
      }
      continue;
    }
    const inicio = comando.test(l) || (chaveYaml.test(l) && !/[.!?]$/.test(l));
    if ((codigo.length && pareceCodigo(l)) || inicio) codigo.push(l);
    else {
      fecha();
      // Fora do código: minutagem vira item de lista; as outras linhas viram parágrafos separados
      const tempo = l.match(/^(\d+:\d{2}(?::\d{2})?)\s+(.+)$/);
      if (tempo) saida.push(`- \`${tempo[1]}\` ${tempo[2]}`);
      else if (/^(\d+\.|-)\s/.test(l)) saida.push(l);
      else saida.push('', l, '');
    }
  }
  fecha();
  return saida.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

const resumo = blocos[0] ? semEmoji(blocos[0]) : `[Resumo do vídeo “${tituloBase}”.]`;
const apresentacao = blocos.slice(1).find((b) => /^📺/u.test(b));
const corpo = [];

// Da apresentação ("📺 Vigésimo quarto volume...") fica a primeira linha, sem as frases com link
const semLinks = (t) =>
  t
    .replace(/\s*(Episódio anterior|Próximo episódio)\b.*$/i, '')
    .split(/(?<=[.!?])\s+/)
    .filter((f) => !/https?:\/\//.test(f))
    .join(' ')
    .replace(/\s*(Episódio anterior|Próximo episódio)[^.]*$/i, '')
    .trim();
const intro = apresentacao ? semLinks(semEmoji(apresentacao).split('\n')[0]) : '';
if (intro) corpo.push(intro, '');

if (capitulos.length > 0) {
  const ordem = [...capitulos].sort((a, b) => b.pos - a.pos);
  corpo.push(`## A lista, do ${ordinal(ordem[0].pos)} ao ${ordinal(ordem.at(-1).pos)}`, '');
  for (const c of ordem) {
    // Descrição com maiúscula no começo e ponto no fim (algumas descrições do YouTube vêm sem)
    const texto = c.texto.charAt(0).toUpperCase() + c.texto.slice(1) + (/[.!?)]$/.test(c.texto) ? '' : '.');
    corpo.push(`### ${c.pos}. ${c.nome}`, '', texto);
    if (c.url) corpo.push(`[${host(c.url)}](${c.url})`);
    corpo.push('');
  }
} else {
  if (listaCapitulos.length > 0) corpo.push('## Neste vídeo', '', ...listaCapitulos.map((t) => `- ${t}`), '');
  // O resto da descrição (passo a passo, comandos) entra como material para revisar
  const resto = blocos.slice(1).filter((b) => b !== apresentacao && b !== blocoCapitulos && b !== blocoLinks && !doCanal(b));
  if (resto.length > 0) {
    corpo.push(tipo === 'explicativo' ? '## Passo a passo' : '## Sobre o vídeo', '');
    for (const b of resto) {
      const [primeira, ...demais] = b.split('\n');
      // "1) Título" ou uma linha curta sem ponto final ("Comandos do vídeo", "Faixas:") vira subtítulo
      const titulo =
        primeira.match(/^\d+\)\s*(.+)$/)?.[1] ??
        (demais.length > 0 && primeira.length < 50 && !/[.!?]$/.test(primeira) && !comando.test(primeira) && !chaveYaml.test(primeira)
          ? primeira.replace(/:$/, '')
          : undefined);
      if (titulo) corpo.push(`### ${titulo}`, '', comCodigo(demais.join('\n')), '');
      else corpo.push(comCodigo(b), '');
    }
  }
}

// Título e endereço do post
// Listas: "Top 10" ou "Top 15", conforme o título do vídeo ("10 projetos...", "Mais 15 projetos...")
const tamanho = tituloBase.match(/\b(\d+) projetos/)?.[1] ?? '15';
// Destaques da lista: os primeiros itens depois dos dois-pontos no resumo ("...: um CAD 3D, uma alternativa ao
// Figma, ... e muito mais"), enquanto o título couber em ~110 caracteres
function destaques(prefixo) {
  const depois = resumo.split(/:\s/).slice(1).join(': ');
  if (!depois || /[.!?]\s/.test(depois)) return undefined; // mais de uma frase: sem destaques automáticos
  const itens = depois
    .replace(/\s+e muito mais\.?$|\s+e mais\.?$|\.$/i, '')
    .split(/,\s+|\s+e\s+(?=(?:um|uma|o|a|os|as)\s)/)
    .map((t) => t.trim())
    .filter(Boolean);
  const escolhidos = [];
  for (const item of itens) {
    const juntos = [...escolhidos, item];
    const texto = juntos.length > 1 ? `${juntos.slice(0, -1).join(', ')} e ${juntos.at(-1)}` : juntos[0];
    if (escolhidos.length >= 1 && (prefixo + texto).length > 110) break;
    escolhidos.push(item);
    if (escolhidos.length === 3) break;
  }
  if (escolhidos.length === 0) return undefined;
  return escolhidos.length > 1 ? `${escolhidos.slice(0, -1).join(', ')} e ${escolhidos.at(-1)}` : escolhidos[0];
}
// Volume especial (título fora do padrão "N projetos open source do GitHub ..."): título do vídeo + volume
const especial = vol && !/projetos open source do GitHub/i.test(tituloBase);
const prefixoLista = `Top ${tamanho} open source do GitHub, Vol. ${vol}: `;
const titulo = !vol
  ? tituloBase
  : especial
    ? `${tituloBase}, Vol. ${vol}`
    : destaques(prefixoLista)
      ? prefixoLista + destaques(prefixoLista)
      : prefixoLista.replace(/: $/, '');
const slug = vol && !especial ? `top-${tamanho}-open-source-vol-${vol}` : slugify(especial ? `${tituloBase} vol ${vol}` : tituloBase);
const arquivo = join(BLOG, `${slug}.md`);
if (existsSync(arquivo) && !flag('forcar')) {
  console.error(`Já existe: src/content/blog/${slug}.md (use --forcar para sobrescrever)`);
  process.exit(1);
}
if (idsComPost().has(m.id) && !flag('forcar')) {
  console.error(`O vídeo ${m.id} já tem post no blog (use --forcar para criar outro).`);
  process.exit(1);
}

// Tags: sinônimos de src/data/tags.json e só as que já existem no blog (o vocabulário não cresce sozinho)
const SINONIMOS = lerJson(new URL('../src/data/tags.json', import.meta.url).pathname);
const vocabulario = new Set(
  readdirSync(BLOG)
    .filter((f) => f.endsWith('.md'))
    .flatMap((f) => readFileSync(join(BLOG, f), 'utf8').match(/^tags: \[(.*)\]$/m)?.[1].split(',').map((t) => t.trim()) ?? [])
    .filter(Boolean),
);
const padraoSerie = vol ? ['open source', 'github'] : /Git e GitHub/i.test(serieTitulo) ? ['git', 'github'] : ['programação'];
const tags = [
  ...new Set(
    [...(m.principal.tags ?? []), ...padraoSerie]
      .map((t) => SINONIMOS[t] ?? t)
      .filter((t) => vocabulario.size === 0 || vocabulario.has(t)),
  ),
].slice(0, 5);
const fm = [
  '---',
  `titulo: ${aspas(titulo)}`,
  `descricao: ${aspas(resumo.replace(/\s+/g, ' '))}`,
  `data: ${data}`,
  `tipo: ${tipo}`,
  `tags: [${tags.join(', ')}]`,
  'youtube:',
  `  id: ${m.id}`,
  ...(m.formato === 'short' ? ['  formato: short'] : []),
  ...(m.shorts.length
    ? ['  shorts:', ...m.shorts.flatMap((s) => [`    - id: ${s.yt}`, `      titulo: ${aspas(tituloShort(s.titulo))}`])]
    : []),
  ...(fontes.length ? ['fontes:', ...fontes.flatMap((f) => [`  - titulo: ${aspas(f.titulo)}`, `    url: ${f.url}`])] : []),
  ...(flag('publicar')
    ? ['rascunho: false']
    : ['# Rascunho gerado por scripts/post-do-video.mjs: revise e troque para false para publicar', 'rascunho: true']),
  '---',
  '',
];

writeFileSync(arquivo, [...fm, ...corpo].join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n');
console.log(`Criado: src/content/blog/${slug}.md
  vídeo ${m.id}${m.shorts.length ? ` + ${m.shorts.length} shorts` : ''} · tipo ${tipo} · data ${data}${fontes.length ? ` · ${fontes.length} fontes` : ''}
  ${flag('publicar') ? 'publicado (rascunho: false).' : 'rascunho: true. Revise o título, a descrição e o texto; veja em npm run dev.'}`);
