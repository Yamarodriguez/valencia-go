/**
 * fuentes-locales.mjs — genera la hoja de tipografias del sitio a partir de
 * los paquetes @fontsource (versiones exactas de package.json) y copia sus
 * ficheros a public/fonts/texto/. Tambien copia Font Awesome a public/webfonts/.
 *
 *   node scripts/fuentes-locales.mjs
 *
 * La web vieja carga "Baloo Bhaijaan 2" y "Lato" desde una copia que Elementor
 * guardo en el servidor (/wp-content/uploads/elementor/google-fonts/), con
 * nombres ilegibles. Aqui son LAS MISMAS letras de Google, con los mismos
 * grosores y estilos, desde los paquetes oficiales. Solo los alfabetos
 * latinos (latin, latin-ext) y con unicode-range.
 *
 * Escribe css-original/comunes/NN-tipografias.css, donde NN es el sitio que
 * ocupaban las hojas de Google en la web vieja (css-original/orden.json), y
 * borra las NN-elementor-gf-*.css originales, que apuntaban al servidor viejo.
 * FALLA (codigo 1) si falta algun fichero latin de los grosores pedidos.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('.');
const MODULOS = path.join(RAIZ, 'node_modules', '@fontsource');
const DESTINO_FICHEROS = path.join(RAIZ, 'public', 'fonts', 'texto');
const COMUNES = path.join(RAIZ, 'css-original', 'comunes');
const ORDEN = path.join(RAIZ, 'css-original', 'orden.json');

// familia -> [paquete, grosores, estilos] tal como los carga la web vieja
// (baloobhaijaan2.css: 400-800 normal; lato.css: 100-900 normal e italic)
const FAMILIAS = [
  ['Baloo Bhaijaan 2', 'baloo-bhaijaan-2', [400, 500, 600, 700, 800], ['normal']],
  ['Lato', 'lato', [100, 300, 400, 700, 900], ['normal', 'italic']],
];
const SUBCONJUNTOS = ['latin', 'latin-ext'];

if (!fs.existsSync(MODULOS)) { console.error('faltan los paquetes @fontsource — ejecuta antes:  npm install'); process.exit(1); }
if (!fs.existsSync(COMUNES)) { console.error('falta css-original/comunes — ejecuta antes scripts/css-original.mjs'); process.exit(1); }

const orden = fs.existsSync(ORDEN) ? JSON.parse(fs.readFileSync(ORDEN, 'utf8')) : {};
const nn = String(orden.tipografias || 46).padStart(2, '0');
const DESTINO_HOJA = path.join(COMUNES, `${nn}-tipografias.css`);

fs.rmSync(DESTINO_FICHEROS, { recursive: true, force: true });
fs.mkdirSync(DESTINO_FICHEROS, { recursive: true });

function rangos(paquete, peso, estilo) {
  const css = path.join(MODULOS, paquete, `${peso}${estilo === 'italic' ? '-italic' : ''}.css`);
  if (!fs.existsSync(css)) return {};
  const salida = {};
  for (const m of fs.readFileSync(css, 'utf8').matchAll(/@font-face\s*\{([\s\S]*?)\}/g)) {
    const fichero = (m[1].match(/url\(\.\/files\/([^)]+\.woff2)\)/) || [])[1];
    const rango = (m[1].match(/unicode-range:\s*([^;]+);/) || [])[1];
    if (fichero && rango) salida[fichero] = rango.trim();
  }
  return salida;
}

const reglas = [];
const faltan = [];
let copiados = 0;
for (const [familia, paquete, grosores, estilos] of FAMILIAS) {
  const dir = path.join(MODULOS, paquete, 'files');
  if (!fs.existsSync(dir)) { faltan.push(`paquete ${paquete}`); continue; }
  const version = JSON.parse(fs.readFileSync(path.join(MODULOS, paquete, 'package.json'), 'utf8')).version;
  for (const peso of grosores) for (const estilo of estilos) {
    const rango = rangos(paquete, peso, estilo);
    for (const sub of SUBCONJUNTOS) {
      const nombre = `${paquete}-${sub}-${peso}-${estilo}.woff2`;
      const origen = path.join(dir, nombre);
      if (!fs.existsSync(origen)) { if (sub === 'latin') faltan.push(nombre); continue; }
      fs.copyFileSync(origen, path.join(DESTINO_FICHEROS, nombre));
      copiados++;
      reglas.push(`@font-face{font-family:'${familia}';font-style:${estilo};font-weight:${peso};font-display:swap;` +
        `src:url(/fonts/texto/${nombre}) format('woff2')${rango[nombre] ? `;unicode-range:${rango[nombre]}` : ''}}`);
    }
  }
  console.log(`  ${familia}: @fontsource/${paquete}@${version}`);
}

fs.writeFileSync(DESTINO_HOJA,
  '/* Tipografias del sitio (Baloo Bhaijaan 2, Lato) servidas desde este dominio.\n' +
  '   Las genera scripts/fuentes-locales.mjs desde los paquetes @fontsource: son las\n' +
  '   mismas letras de Google que cargaba la web en WordPress. */\n' + reglas.join('\n') + '\n');
for (const f of fs.readdirSync(COMUNES)) if (/^\d\d-elementor-gf-.*\.css$/.test(f)) fs.rmSync(path.join(COMUNES, f));
console.log(`tipografias: ${reglas.length} variantes, ${copiados} ficheros -> ${path.relative(RAIZ, DESTINO_HOJA)}`);

// Font Awesome: la hoja va en css-original/comunes (css-original.mjs) y busca ../webfonts/
const faDir = path.join(RAIZ, 'node_modules', '@fortawesome', 'fontawesome-free', 'webfonts');
if (!fs.existsSync(faDir)) faltan.push('paquete @fortawesome/fontawesome-free');
else {
  const dest = path.join(RAIZ, 'public', 'webfonts');
  fs.mkdirSync(dest, { recursive: true });
  let k = 0;
  for (const f of fs.readdirSync(faDir)) if (/\.(woff2|ttf)$/.test(f)) { fs.copyFileSync(path.join(faDir, f), path.join(dest, f)); k++; }
  const v = JSON.parse(fs.readFileSync(path.join(RAIZ, 'node_modules', '@fortawesome', 'fontawesome-free', 'package.json'), 'utf8')).version;
  console.log(`iconos: Font Awesome ${v}, ${k} ficheros en public/webfonts`);
}
for (const f of faltan) console.log('  FALTA ' + f);
process.exit(faltan.length ? 1 : 0);
