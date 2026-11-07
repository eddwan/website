import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const fontes = [
  { name: 'Inter', weight: 400 as const, style: 'normal' as const, data: readFileSync(join(process.cwd(), 'src/assets/fonts/inter-latin-400-normal.woff')) },
  { name: 'Inter', weight: 700 as const, style: 'normal' as const, data: readFileSync(join(process.cwd(), 'src/assets/fonts/inter-latin-700-normal.woff')) },
  { name: 'Bricolage', weight: 800 as const, style: 'normal' as const, data: readFileSync(join(process.cwd(), 'src/assets/fonts/bricolage-grotesque-latin-800-normal.woff')) },
];

type No = { type: string; props: Record<string, unknown> & { children?: unknown } };
const h = (type: string, style: Record<string, unknown>, children?: unknown): No => ({ type, props: { style, children } });

/** Gera a imagem Open Graph (1200x630, PNG) de um post ou página. */
export async function imagemOg({ titulo, rotulo, rodape }: { titulo: string; rotulo?: string; rodape: string }) {
  const tamanho = titulo.length > 70 ? 60 : titulo.length > 45 ? 72 : 88;
  const arvore = h(
    'div',
    {
      width: 1200,
      height: 630,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      backgroundColor: '#05070b',
      backgroundImage:
        'radial-gradient(circle at 92% 0%, rgba(1,131,251,0.35), transparent 45%), radial-gradient(circle at 0% 100%, rgba(254,118,2,0.3), transparent 45%)',
      color: '#e6e9ef',
      fontFamily: 'Inter',
      padding: '64px 72px',
      
    },
    [
      h('div', { display: 'flex', alignItems: 'center', gap: 16 }, [
        h('div', { display: 'flex', fontFamily: 'Bricolage', fontSize: 40, letterSpacing: -1.5 }, [
          h('span', { color: '#FE7602', marginRight: 6 }, '›'),
          h('span', {}, 'eddwan'),
          h('span', { width: 18, height: 36, marginLeft: 6, marginTop: 8, background: '#03E7FC', borderRadius: 3 }),
        ]),
        rotulo
          ? h(
              'div',
              {
                marginLeft: 16,
                fontSize: 22,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 2,
                color: '#021',
                background: 'linear-gradient(90deg, #03E7FC, #0183FB)',
                padding: '6px 16px',
                borderRadius: 999,
              },
              rotulo,
            )
          : h('div', {}),
      ]),
      h('div', { display: 'flex', width: 1056, fontFamily: 'Bricolage', fontSize: tamanho, lineHeight: 1.02, letterSpacing: -3 }, titulo),
      h('div', { display: 'flex', width: 1056, justifyContent: 'space-between', alignItems: 'center', fontSize: 26, color: '#a3adbf' }, [
        h('div', { display: 'flex' }, rodape),
        h('div', { display: 'flex', width: 220, height: 8, borderRadius: 4, background: 'linear-gradient(90deg, #FFC301, #FE7602, #0183FB, #03E7FC)' }),
      ]),
    ],
  );
  const svg = await satori(arvore as never, { width: 1200, height: 630, fonts: fontes });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}
