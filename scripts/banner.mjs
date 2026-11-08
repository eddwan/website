// Gera o banner do README (.github/banner.png, 1280x400 em 2x) com a mesma identidade das imagens
// Open Graph do site (src/lib/og.ts): fundo escuro, brilhos laranja e azul, título em Bricolage.
// Uso: npm run banner
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const raiz = process.cwd();
const fonte = (arquivo) => readFileSync(join(raiz, 'src/assets/fonts', arquivo));
const fontes = [
  { name: 'Inter', weight: 400, style: 'normal', data: fonte('inter-latin-400-normal.woff') },
  { name: 'Inter', weight: 700, style: 'normal', data: fonte('inter-latin-700-normal.woff') },
  { name: 'Bricolage', weight: 800, style: 'normal', data: fonte('bricolage-grotesque-latin-800-normal.woff') },
];
const foto = `data:image/jpeg;base64,${readFileSync(join(raiz, 'public/img/eddwan-perfil.jpg')).toString('base64')}`;

const L = 1280;
const A = 400;
const h = (type, style, children, extra = {}) => ({ type, props: { style, children, ...extra } });

const arvore = h(
  'div',
  {
    width: L,
    height: A,
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#05070b',
    backgroundImage:
      'radial-gradient(circle at 95% 0%, rgba(1,131,251,0.38), transparent 45%), radial-gradient(circle at 0% 100%, rgba(254,118,2,0.32), transparent 45%)',
    color: '#e6e9ef',
    fontFamily: 'Inter',
    padding: '48px 64px',
  },
  [
    h('div', { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', width: 860 }, [
      h('div', { display: 'flex', fontFamily: 'Bricolage', fontSize: 34, letterSpacing: -1.2 }, [
        h('span', { color: '#FE7602', marginRight: 6 }, '›'),
        h('span', {}, 'eddwan'),
        h('span', { width: 15, height: 30, marginLeft: 6, marginTop: 7, background: '#03E7FC', borderRadius: 3 }),
      ]),
      h('div', { display: 'flex', flexDirection: 'column', fontFamily: 'Bricolage', fontSize: 64, lineHeight: 1.0, letterSpacing: -2.5 }, [
        h('span', {}, 'Open source, Git e segurança,'),
        h(
          'span',
          { backgroundImage: 'linear-gradient(90deg, #FFC301, #FE7602)', backgroundClip: 'text', color: 'transparent' },
          'sem enrolação.',
        ),
      ]),
      h('div', { display: 'flex', alignItems: 'center', fontSize: 22, color: '#a3adbf' }, [
        h('span', { color: '#e6e9ef', fontWeight: 700 }, 'eddwan.com'),
        h('span', { margin: '0 14px', color: '#4a5468' }, '·'),
        h('span', {}, 'Blog, vídeos, portfólio e currículo'),
        h('span', { margin: '0 14px', color: '#4a5468' }, '·'),
        h('span', {}, 'Astro + Cloudflare'),
      ]),
    ]),
    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }, [
      h(
        'div',
        {
          display: 'flex',
          padding: 5,
          borderRadius: 999,
          backgroundImage: 'linear-gradient(135deg, #FFC301, #FE7602 40%, #0183FB 70%, #03E7FC)',
        },
        [h('img', { width: 220, height: 220, borderRadius: 999, objectFit: 'cover' }, undefined, { src: foto, width: 220, height: 220 })],
      ),
      h('div', { display: 'flex', width: 160, height: 6, borderRadius: 3, background: 'linear-gradient(90deg, #FFC301, #FE7602, #0183FB, #03E7FC)' }),
    ]),
  ],
);

const svg = await satori(arvore, { width: L, height: A, fonts: fontes });
const png = new Resvg(svg, { fitTo: { mode: 'width', value: L * 2 } }).render().asPng();
writeFileSync(join(raiz, '.github/banner.png'), png);
console.log(`.github/banner.png (${L * 2}x${A * 2}, ${(png.length / 1024).toFixed(0)} KB)`);
