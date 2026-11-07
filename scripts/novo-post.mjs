#!/usr/bin/env node
// Cria um post novo em src/content/blog/<slug>.md
// Uso: npm run novo-post -- "Título do post" [--tipo=noticia|artigo|lista|explicativo] [--youtube=ID]
import { existsSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const titulo = args.find((a) => !a.startsWith('--'));
if (!titulo) {
  console.error('Uso: npm run novo-post -- "Título do post" [--tipo=artigo] [--youtube=ID]');
  process.exit(1);
}
const opcao = (nome) => args.find((a) => a.startsWith(`--${nome}=`))?.split('=')[1];
const tipo = opcao('tipo') ?? 'artigo';
const youtube = opcao('youtube');
const slug = titulo
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');
const arquivo = `src/content/blog/${slug}.md`;
if (existsSync(arquivo)) {
  console.error(`Já existe: ${arquivo}`);
  process.exit(1);
}
const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const fm = [
  '---',
  `titulo: '${titulo.replace(/'/g, "''")}'`,
  "descricao: 'Resumo em uma ou duas frases (aparece na lista, no Google e na imagem de compartilhamento).'",
  `data: ${hoje}`,
  `tipo: ${tipo}`,
  'tags: []',
  ...(youtube ? ['youtube:', `  id: ${youtube}`, '  formato: video'] : []),
  'fontes: []',
  'rascunho: true',
  '---',
  '',
  'Texto do post em Markdown.',
  '',
];
writeFileSync(arquivo, fm.join('\n'));
console.log(`Criado: ${arquivo} (rascunho: true; mude para false quando for publicar)`);
