/**
 * fuentes-locales.mjs — genera las hojas de tipografia del sitio a partir de
 * los paquetes @fontsource, y copia sus ficheros a public/fonts/texto/.
 *
 *   node scripts/fuentes-locales.mjs
 *
 * Por que existe:
 * La web en vivo carga Roboto, Roboto Slab, Roboto Condensed, Abel, Satisfy y
 * Ubuntu desde una copia que Elementor guardo en el servidor de WordPress, con
 * nombres de fichero ilegibles (roboto-kfo5cnqeu92fr1mu53zec9_vu3r1gihoszmk...).
 * Son 89 ficheros y muchos son de alfabetos que esta web no usa (cirilico,
 * griego, vietnamita).
 *
 * Aqui se sustituyen por LAS MISMAS tipografias de Google, con los mismos
 * grosores, tomadas de los paquetes oficiales @fontsource. La letra que ve el
 * visitante es exactamente la misma; lo unico que cambia es de donde sale el
 * fichero y como se llama. Se quedan solo los alfabetos latinos, que es lo que
 * usa la web: menos ficheros y carga mas rapida.
 *
 * Genera css-original/comunes/19-tipografias.css y borra las hojas originales
 * 19..26 de fuentes, que apuntaban al servidor antiguo.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('.');
const MODULOS = path.join(RAIZ, 'node_modules', '@fontsource');
const DESTINO_FICHEROS = path.join(RAIZ, 'public', 'fonts', 'texto');
const DESTINO_HOJA = path.join(RAIZ, 'css-original', 'comunes', '19-tipografias.css');

// familia -> [paquete, grosores que usa la web]
const FAMILIAS = [
  ['Roboto', 'roboto', [100, 300, 400, 500, 700, 900]],
  ['Roboto Slab', 'roboto-slab', [100, 300, 400, 500, 700, 900]],
  ['Roboto Condensed', 'roboto-condensed', [300, 400, 700]],
  ['Abel', 'abel', [400]],
  ['Satisfy', 'satisfy', [400]],
  ['Ubuntu', 'ubuntu', [300, 400, 500, 700]],
  // Tipografias del rediseño (rama "rediseno"): Archivo para los titulares,
  // IBM Plex Sans para el texto e IBM Plex Mono para datos y etiquetas.
  ['Archivo', 'archivo', [500, 600, 700]],
  ['IBM Plex Sans', 'ibm-plex-sans', [400, 500, 600]],
  ['IBM Plex Mono', 'ibm-plex-mono', [500, 600]],
];

// Solo alfabeto latino: es lo unico que usa esta web.
const SUBCONJUNTOS = ['latin', 'latin-ext'];

if (!fs.existsSync(MODULOS)) {
  console.error('faltan los paquetes @fontsource — ejecuta antes:  npm install');
  process.exit(1);
}

fs.rmSync(DESTINO_FICHEROS, { recursive: true, force: true });
fs.mkdirSync(DESTINO_FICHEROS, { recursive: true });

const reglas = [];
let copiados = 0, ausentes = 0;

/* El rango de letras de cada fichero (unicode-range), tal cual lo declara el
 * propio paquete en su <peso>.css. Sin el, el navegador no sabe que el fichero
 * "latin-ext" solo hace falta para letras de otros idiomas (ł, ő, ş...) y lo
 * descarga siempre: eran 8 ficheros y unos 113 KB de mas en cada pagina. */
function rangos(paquete, peso) {
  const css = path.join(MODULOS, paquete, `${peso}.css`);
  if (!fs.existsSync(css)) return {};
  const salida = {};
  for (const m of fs.readFileSync(css, 'utf8').matchAll(/@font-face\s*\{([\s\S]*?)\}/g)) {
    const fichero = (m[1].match(/url\(\.\/files\/([^)]+\.woff2)\)/) || [])[1];
    const rango = (m[1].match(/unicode-range:\s*([^;]+);/) || [])[1];
    if (fichero && rango) salida[fichero] = rango.trim();
  }
  return salida;
}

for (const [familia, paquete, grosores] of FAMILIAS) {
  const dir = path.join(MODULOS, paquete, 'files');
  if (!fs.existsSync(dir)) { console.log(`  aviso: falta el paquete ${paquete}`); continue; }
  for (const peso of grosores) {
    const rango = rangos(paquete, peso);
    for (const sub of SUBCONJUNTOS) {
      const nombre = `${paquete}-${sub}-${peso}-normal.woff2`;
      const origen = path.join(dir, nombre);
      if (!fs.existsSync(origen)) { ausentes++; continue; }
      fs.copyFileSync(origen, path.join(DESTINO_FICHEROS, nombre));
      copiados++;
      reglas.push(
        `@font-face{font-family:'${familia}';font-style:normal;font-weight:${peso};` +
        `font-display:swap;src:url(/fonts/texto/${nombre}) format('woff2')` +
        (rango[nombre] ? `;unicode-range:${rango[nombre]}` : '') + '}');
    }
  }
}

fs.writeFileSync(DESTINO_HOJA,
  '/* Tipografias del sitio (Roboto, Roboto Slab, Roboto Condensed, Abel,\n' +
  '   Satisfy, Ubuntu) servidas desde este mismo dominio. Las genera\n' +
  '   scripts/fuentes-locales.mjs desde los paquetes oficiales @fontsource:\n' +
  '   son las mismas letras de Google que usaba la web en WordPress. */\n' +
  reglas.join('\n') + '\n');

// las hojas originales apuntaban al servidor antiguo: ya no hacen falta
for (const f of ['19-roboto.css', '20-robotoslab.css', '21-robotocondensed.css',
                 '22-abel.css', '24-satisfy.css', '26-ubuntu.css']) {
  const p = path.join(RAIZ, 'css-original', 'comunes', f);
  if (fs.existsSync(p)) fs.rmSync(p);
}

console.log(`tipografias: ${reglas.length} variantes, ${copiados} ficheros copiados` +
  (ausentes ? ` (${ausentes} no existian en el paquete y se omiten)` : ''));
console.log('hoja generada: css-original/comunes/19-tipografias.css');

/* --------------------------------------------------------------- iconos
 * Los iconos de las tarjetas (el rayo, el reloj de arena, la hoja...) y los
 * del tema no son dibujos: son LETRAS. Font Awesome y Simple Line Icons son
 * tipografias en las que cada "letra" es un icono. Si el fichero no esta, el
 * navegador no sabe que dibujar y pinta un cuadrado vacio — que es justo lo
 * que se veia. Se copian desde los paquetes oficiales de npm a las carpetas
 * donde las hojas originales los buscan.
 */
const ICONOS = [
  ['@fortawesome/fontawesome-free/webfonts', 'webfonts', /^fa-.*\.(woff2|ttf)$/],
  ['simple-line-icons/src/fonts', 'fonts/simple-line-icons', /^Simple-Line-Icons\./],
];

for (const [desde, hacia, filtro] of ICONOS) {
  const dirOrigen = path.join(RAIZ, 'node_modules', desde);
  if (!fs.existsSync(dirOrigen)) { console.log(`  aviso: falta el paquete ${desde}`); continue; }
  const dirDestino = path.join(RAIZ, 'public', hacia);
  fs.mkdirSync(dirDestino, { recursive: true });
  let n = 0;
  for (const f of fs.readdirSync(dirOrigen)) {
    if (!filtro.test(f)) continue;
    fs.copyFileSync(path.join(dirOrigen, f), path.join(dirDestino, f));
    n++;
  }
  console.log(`iconos: ${n} ficheros en public/${hacia}`);
}
