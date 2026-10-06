/**
 * fuentes-locales.mjs — pone Font Awesome en este dominio.
 *
 *   node scripts/fuentes-locales.mjs
 *
 * La web vieja pide Font Awesome 6.4.0 a cdnjs.cloudflare.com. Aqui sale del
 * paquete oficial de npm, EXACTAMENTE la misma version (package.json la fija
 * sin ^), copiado a public/fontawesome/ (css/all.min.css + webfonts/).
 * scripts/partir-paginas.mjs cambia el <link> de cdnjs por
 * /fontawesome/css/all.min.css (src/data/cabeza.json).
 *
 * Las letras del texto (Baloo Bhaijaan 2 y Lato) NO pasan por aqui: la web
 * vieja ya las servia desde su propio dominio
 * (/wp-content/uploads/elementor/google-fonts/) y se copian tal cual, con sus
 * mismas hojas y ficheros (scripts/publicar-recursos.mjs).
 *
 * public/fontawesome/ no sube a Git: lo genera la orden de compilacion.
 * FALLA (codigo 1) si falta el paquete o la version no es la esperada.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('.');
const VERSION = '6.4.0';
const PAQUETE = path.join(RAIZ, 'node_modules', '@fortawesome', 'fontawesome-free');
const DESTINO = path.join(RAIZ, 'public', 'fontawesome');

if (!fs.existsSync(PAQUETE)) { console.error('falta @fortawesome/fontawesome-free — ejecuta antes:  npm install'); process.exit(1); }
const v = JSON.parse(fs.readFileSync(path.join(PAQUETE, 'package.json'), 'utf8')).version;
if (v !== VERSION) { console.error(`Font Awesome instalado es ${v} y la web vieja usa ${VERSION}`); process.exit(1); }

fs.rmSync(DESTINO, { recursive: true, force: true });
fs.mkdirSync(path.join(DESTINO, 'css'), { recursive: true });
fs.mkdirSync(path.join(DESTINO, 'webfonts'), { recursive: true });
fs.copyFileSync(path.join(PAQUETE, 'css', 'all.min.css'), path.join(DESTINO, 'css', 'all.min.css'));
let n = 0;
for (const f of fs.readdirSync(path.join(PAQUETE, 'webfonts'))) {
  if (!/\.(woff2|ttf)$/.test(f)) continue;
  fs.copyFileSync(path.join(PAQUETE, 'webfonts', f), path.join(DESTINO, 'webfonts', f));
  n++;
}
console.log(`iconos: Font Awesome ${v} en public/fontawesome (all.min.css + ${n} ficheros de letra)`);
