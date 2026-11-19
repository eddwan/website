// Gera src/data/repositorios.json a partir da planilha do canal (roda na máquina do Eddwan).
// Uso: npm run exportar-catalogo -- [caminho do projeto do canal]
// Padrão: ~/Projetos/hallentech/youtube-channel
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { inflateRawSync } from 'node:zlib';

const ABA = 'Ranking completo';
const SAIDA = resolve(import.meta.dirname, '../src/data/repositorios.json');

// --- Leitor de xlsx sem dependências (zip + XML) ---

function lerZip(caminho) {
  const buf = readFileSync(caminho);
  // Fim do diretório central: assinatura 0x06054b50 nos últimos bytes
  let fim = buf.length - 22;
  while (fim >= 0 && buf.readUInt32LE(fim) !== 0x06054b50) fim--;
  if (fim < 0) throw new Error(`${caminho} não parece um xlsx`);
  const total = buf.readUInt16LE(fim + 10);
  let p = buf.readUInt32LE(fim + 16);
  const arquivos = new Map();
  for (let i = 0; i < total; i++) {
    const metodo = buf.readUInt16LE(p + 10);
    const tamanho = buf.readUInt32LE(p + 20);
    const nomeLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const comentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const nome = buf.toString('utf8', p + 46, p + 46 + nomeLen);
    arquivos.set(nome, () => {
      const inicio = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const dados = buf.subarray(inicio, inicio + tamanho);
      return (metodo === 8 ? inflateRawSync(dados) : dados).toString('utf8');
    });
    p += 46 + nomeLen + extraLen + comentLen;
  }
  return arquivos;
}

const entidades = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const desescapar = (s) =>
  s.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (m, e) =>
    e[0] === '#' ? String.fromCodePoint(Number(e[1] === 'x' ? '0' + e.slice(1) : e.slice(1))) : (entidades[e] ?? m),
  );
const textoDe = (xml) => desescapar([...xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(''));

function colunaParaIndice(ref) {
  let n = 0;
  for (const c of ref.match(/^[A-Z]+/)[0]) n = n * 26 + c.charCodeAt(0) - 64;
  return n - 1;
}

// Devolve as linhas da aba como arrays de valores (string, número ou null)
function lerAba(caminho, nomeAba) {
  const zip = lerZip(caminho);
  const ler = (nome) => {
    const f = zip.get(nome);
    if (!f) throw new Error(`${nome} não encontrado no xlsx`);
    return f();
  };
  const compartilhadas = zip.has('xl/sharedStrings.xml')
    ? [...ler('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textoDe(m[1]))
    : [];
  const abas = [...ler('xl/workbook.xml').matchAll(/<sheet\b[^>]*>/g)].map((m) => ({
    nome: desescapar(m[0].match(/name="([^"]*)"/)[1]),
    rid: m[0].match(/r:id="([^"]*)"/)[1],
  }));
  const aba = abas.find((a) => a.nome === nomeAba);
  if (!aba) throw new Error(`Aba "${nomeAba}" não existe (abas: ${abas.map((a) => a.nome).join(', ')})`);
  const alvo = [...ler('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)]
    .map((m) => m[0])
    .find((r) => r.includes(`Id="${aba.rid}"`))
    .match(/Target="([^"]*)"/)[1];
  const xml = ler(alvo.startsWith('/') ? alvo.slice(1) : `xl/${alvo}`);

  return [...xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map((linha) => {
    const valores = [];
    for (const c of linha[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1];
      const corpo = c[2] ?? '';
      const i = colunaParaIndice(attrs.match(/r="([A-Z]+\d+)"/)[1]);
      const tipo = attrs.match(/t="([^"]*)"/)?.[1];
      const v = corpo.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let valor = null;
      if (tipo === 's') valor = compartilhadas[Number(v)];
      else if (tipo === 'inlineStr') valor = textoDe(corpo);
      else if (tipo === 'str' || tipo === 'e') valor = v != null ? desescapar(v) : null;
      else if (tipo === 'b') valor = v === '1';
      else if (v != null) valor = Number(v);
      valores[i] = valor;
    }
    return Array.from(valores, (x) => x ?? null);
  });
}

// --- Conversões ---

const lista = (texto) =>
  String(texto ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

// Data da planilha: número serial do Excel (dias desde 30/12/1899) ou texto dd/mm/aaaa
function paraData(valor) {
  if (typeof valor === 'number') return new Date(Math.round((valor - 25569) * 86400000)).toISOString().slice(0, 10);
  const m = String(valor ?? '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

// "V29 · #1", "V06 · Top 10 Vol. 6", "S01 · Short avulso …", "E03 · …"
const ROTULO = { V: 'Vol.', S: 'Short', E: 'Ep.' };
function lerVideo(texto) {
  const m = String(texto ?? '').match(/^([VSE])(\d+)\s*·\s*(.*)$/i);
  if (!m) return null;
  const tipo = m[1].toUpperCase();
  const numero = Number(m[2]);
  return {
    codigo: `${tipo.toLowerCase()}${m[2]}`,
    volume: `${ROTULO[tipo]} ${numero}`,
    posicao: Number(m[3].match(/^#(\d+)/)?.[1] ?? Infinity),
  };
}

// videoId do vídeo principal em video/publicar/<código>-*/enviados.json
function criarBuscaVideoId(canal) {
  const base = join(canal, 'video/publicar');
  const pastas = readdirSync(base);
  const cache = new Map();
  return (codigo) => {
    if (cache.has(codigo)) return cache.get(codigo);
    const pasta = pastas.find((p) => p.startsWith(`${codigo}-`) && !p.includes('-short-'));
    let id = null;
    const arquivo = pasta && join(base, pasta, 'enviados.json');
    if (arquivo && existsSync(arquivo)) {
      const enviados = JSON.parse(readFileSync(arquivo, 'utf8'));
      const principal = Object.keys(enviados).find((k) => !k.startsWith('short'));
      // Short avulso não tem vídeo principal: vale a versão em português
      id = enviados[principal ?? 'short-pt'] ?? null;
    }
    cache.set(codigo, { pasta, id });
    return cache.get(codigo);
  };
}

// --- Exportação ---

const canal = resolve((process.argv[2] ?? '~/Projetos/hallentech/youtube-channel').replace(/^~(?=$|\/)/, homedir()));
const planilha = join(canal, 'repositorios-para-videos.xlsx');
if (!existsSync(planilha)) {
  console.error(`Planilha não encontrada: ${planilha}`);
  process.exit(1);
}

const [cabecalho, ...linhas] = lerAba(planilha, ABA);
const coluna = (nome) => {
  const i = cabecalho.indexOf(nome);
  if (i < 0) throw new Error(`Coluna "${nome}" não existe na aba "${ABA}"`);
  return i;
};
const C = {
  repo: coluna('Repositório'),
  link: coluna('Link'),
  categoria: coluna('Categoria'),
  subcategoria: coluna('Subcategoria'),
  resumo: coluna('Resumo'),
  status: coluna('Status YouTube'),
  video: coluna('Vídeo'),
  data: coluna('Data de publicação'),
  tags: coluna('Tags'),
  alternativa: coluna('Alternativa a'),
  linguagem: coluna('Linguagem'),
  licenca: coluna('Licença'),
};

const buscarVideoId = criarBuscaVideoId(canal);
// Uma entrada por repositório: quem saiu em mais de um vídeo junta as aparições
const catalogo = new Map();
const semVideoId = [];
const incompletos = [];

for (const l of linhas) {
  if (l[C.status] !== 'Publicado') continue;
  const id = String(l[C.repo] ?? '').trim();
  const video = lerVideo(l[C.video]);
  const { pasta, id: videoId } = video ? buscarVideoId(video.codigo) : {};
  if (!videoId) {
    semVideoId.push(`${id} (${l[C.video] ?? 'sem Vídeo'}${pasta ? `, pasta ${pasta}` : ''})`);
    continue;
  }

  // Só os campos do esquema: notas, alertas, peso e posição ficam na planilha
  const repo = {
    id,
    nome: id.split('/')[1],
    url: String(l[C.link] ?? '').trim(),
    resumo: String(l[C.resumo] ?? '').trim(),
    categoria: String(l[C.categoria] ?? '').trim(),
    subcategoria: String(l[C.subcategoria] ?? '').trim(),
    tags: lista(l[C.tags]),
    alternativaA: lista(l[C.alternativa]),
    ...(l[C.linguagem] ? { linguagem: String(l[C.linguagem]).trim() } : {}),
    licenca: String(l[C.licenca] ?? '').trim(),
    aparicoes: [{ videoId, volume: video.volume, data: paraData(l[C.data]) }],
  };

  const faltando = ['url', 'resumo', 'categoria', 'subcategoria', 'licenca'].filter((k) => !repo[k]);
  if (!repo.tags.length) faltando.push('tags');
  if (!repo.aparicoes[0].data) faltando.push('data');
  if (faltando.length) {
    incompletos.push(`${id} (falta ${faltando.join(', ')})`);
    continue;
  }
  const anterior = catalogo.get(id);
  if (!anterior) {
    catalogo.set(id, { repo, posicao: video.posicao });
    continue;
  }
  const aparicoes = [...anterior.repo.aparicoes, ...repo.aparicoes]
    .filter((a, i, todas) => todas.findIndex((b) => b.videoId === a.videoId) === i)
    .sort((a, b) => b.data.localeCompare(a.data));
  // Resumo, tags e demais campos vêm da linha do vídeo mais recente
  const recente = repo.aparicoes[0].data > anterior.repo.aparicoes[0].data ? { repo, posicao: video.posicao } : anterior;
  catalogo.set(id, { repo: { ...recente.repo, aparicoes }, posicao: recente.posicao });
}

// Pela aparição mais recente; no mesmo vídeo, pela ordem do vídeo
const ordenado = [...catalogo.values()].sort(
  (a, b) =>
    b.repo.aparicoes[0].data.localeCompare(a.repo.aparicoes[0].data) ||
    a.posicao - b.posicao ||
    a.repo.id.localeCompare(b.repo.id),
);
const repositorios = ordenado.map((c) => c.repo);
writeFileSync(SAIDA, JSON.stringify(repositorios, null, 2) + '\n');

const videos = new Set(repositorios.flatMap((r) => r.aparicoes.map((a) => a.videoId)));
console.log(`${repositorios.length} repositórios e ${videos.size} vídeos em ${SAIDA}`);
if (semVideoId.length) console.log(`\nSem videoId (${semVideoId.length}), ficaram de fora:\n  ${semVideoId.join('\n  ')}`);
if (incompletos.length) console.log(`\nIncompletos (${incompletos.length}), ficaram de fora:\n  ${incompletos.join('\n  ')}`);
