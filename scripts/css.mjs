/**
 * css.mjs — prepara las hojas de estilo originales para el sitio estatico.
 *
 *   node scripts/css.mjs             junta las hojas tal cual (lo normal)
 *   node scripts/css.mjs --limpiar   ademas quita las reglas que no se usan
 *
 * De donde sale cada cosa:
 *   css-original/comunes/   hojas del tema, de Elementor, de los iconos y de
 *                           las fuentes. El numero del nombre es el ORDEN en
 *                           que las cargaba la web en vivo, y ese orden manda:
 *                           en CSS gana la ultima regla que se lee.
 *   css-original/paginas/   una hoja por pagina, escrita por el propio Elementor.
 *
 * EL ORDEN IMPORTA Y NO ES "TODO LO COMUN Y LUEGO LA PAGINA".
 * En la web en vivo la secuencia real es:
 *
 *     01..17  tema + Elementor + kit + widgets basicos
 *     post-ID.css                      <-- la hoja de ESTA pagina
 *     18..26  widgets de Elementor + fuentes
 *
 * Por eso se generan DOS hojas comunes y la de la pagina va en medio:
 *     public/css/comunes.css        (01..17)
 *     public/css/post-ID.css        (la de la pagina)
 *     public/css/comunes-final.css  (18..26)
 * Si se juntara todo antes de la pagina, reglas como las de 18-widgets.css
 * dejarian de ganar donde deben y el resultado no seria identico al original.
 *
 * Tambien se corrigen las direcciones absolutas (https://casascontenedores.es/…)
 * que llevan dentro las hojas de fuentes, para que apunten a los ficheros
 * que estan en public/ y no al sitio antiguo.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('.');
const ORIGEN = path.join(RAIZ, 'css-original');
const DESTINO = path.join(RAIZ, 'public', 'css');
const DIST = path.join(RAIZ, 'dist');
const limpiando = process.argv.includes('--limpiar');

if (!fs.existsSync(ORIGEN)) {
  console.error('falta css-original/ — ejecuta antes scripts/descargar-css.mjs');
  process.exit(1);
}

/* ------------------------------------------- 0. direcciones dentro del CSS */

/**
 * Las hojas de fuentes traen la direccion completa del sitio antiguo. Si se
 * dejan, el navegador pide las letras a casascontenedores.es (que el dia de
 * la mudanza ya sera esta misma web, pero mientras tanto no carga y ademas
 * delata que la web no es autonoma). Se pasan a rutas de este sitio.
 *
 * Las direcciones relativas (../webfonts/…, ../fonts/…) NO se tocan: como la
 * hoja vive en /css/, resuelven solas a /webfonts/… y /fonts/… y ahi es donde
 * se guardan los ficheros.
 */
function rutasPropias(css) {
  return css.replace(/https?:\/\/(?:www\.)?casascontenedores\.es\//g, '/');
}

/* ------------------------------------------------- 1. recoger lo que se usa */

/** Clases, ids y etiquetas que aparecen en el HTML compilado. */
function vocabulario() {
  const clases = new Set();
  const ids = new Set();
  const etiquetas = new Set();
  const recorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { recorrer(p); continue; }
      if (!e.name.endsWith('.html')) continue;
      const html = fs.readFileSync(p, 'utf8');
      for (const m of html.matchAll(/class="([^"]*)"/g)) {
        for (const c of m[1].split(/\s+/)) if (c) clases.add(c);
      }
      for (const m of html.matchAll(/\sid="([^"]*)"/g)) ids.add(m[1]);
      for (const m of html.matchAll(/<([a-z][a-z0-9]*)[\s>]/g)) etiquetas.add(m[1]);
    }
  };
  if (fs.existsSync(DIST)) recorrer(DIST);
  return { clases, ids, etiquetas };
}

/* -------------------------------------------------- 2. trocear y filtrar CSS */

/** Parte una hoja en reglas de primer nivel, respetando @media y @supports. */
function trocear(css) {
  const trozos = [];
  let i = 0;
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  while (i < css.length) {
    const llave = css.indexOf('{', i);
    if (llave === -1) break;
    const cabeza = css.slice(i, llave).trim();
    let prof = 1;
    let j = llave + 1;
    while (j < css.length && prof > 0) {
      if (css[j] === '{') prof++;
      else if (css[j] === '}') prof--;
      j++;
    }
    trozos.push({ cabeza, cuerpo: css.slice(llave + 1, j - 1), fin: j });
    i = j;
  }
  return trozos;
}

const SIEMPRE = /^@(font-face|import|charset|keyframes|-webkit-keyframes|page|counter-style|property|layer)/i;

/**
 * Quita lo que va dentro de :not(), :is(), :where() y :has().
 *
 * ESTO ERA EL FALLO GORDO. Elementor escribe los fondos asi:
 *
 *   .elementor-2 .elementor-element-0176463:not(.elementor-motion-effects-element-type-background) > .elementor-widget-wrap,
 *   .elementor-2 .elementor-element-0176463 > .elementor-widget-wrap > .elementor-motion-effects-container > .elementor-motion-effects-layer
 *   { background-image:url(…) }
 *
 * Las clases "motion-effects" no aparecen en el HTML (son de una animacion que
 * esta pagina no usa), pero una clase dentro de :not() NO tiene que existir:
 * precisamente dice "cuando NO este". La version anterior la exigia, daba la
 * regla por inservible y la borraba — y con ella el fondo. Resultado: letras
 * blancas sobre blanco y zonas que parecian vacias.
 */
const sinFiltros = (sel) => sel.replace(/:(not|is|where|has)\(([^()]*|[^()]*\([^()]*\)[^()]*)\)/gi, '');

/** ¿Este trozo de selector puede llegar a aplicar en alguna pagina? */
function parteSeUsa(parte, voc) {
  const util = sinFiltros(parte);
  const clases = [...util.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]);
  const ids = [...util.matchAll(/#(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]);
  if (clases.some((c) => !voc.clases.has(c))) return false;
  if (ids.some((x) => !voc.ids.has(x))) return false;
  if (!clases.length && !ids.length) {
    const tags = [...util.matchAll(/(^|[\s>+~(])([a-z][a-z0-9]*)/g)].map((m) => m[2]);
    if (tags.length && !tags.some((t) => voc.etiquetas.has(t))) return false;
  }
  return true;
}

/**
 * Deja el selector con solo los trozos que pueden aplicar. Si no queda
 * ninguno, devuelve cadena vacia y la regla entera se descarta.
 * Antes se conservaba o se tiraba la regla entera: ahora se recorta.
 */
function recortarSelector(selector, voc) {
  const vivos = selector.split(',').map((s) => s.trim()).filter((s) => s && parteSeUsa(s, voc));
  return vivos.join(',');
}

function limpiar(css, voc) {
  const salida = [];
  for (const { cabeza, cuerpo } of trocear(css)) {
    if (!cabeza) continue;
    if (SIEMPRE.test(cabeza)) { salida.push(`${cabeza}{${cuerpo}}`); continue; }
    if (cabeza.startsWith('@')) {
      const dentro = limpiar(cuerpo, voc);
      if (dentro.trim()) salida.push(`${cabeza}{${dentro}}`);
      continue;
    }
    const sel = recortarSelector(cabeza, voc);
    if (sel) salida.push(`${sel}{${cuerpo}}`);
  }
  return salida.join('\n');
}

/* ------------------------------------------------------------- 3. construir */

fs.rmSync(DESTINO, { recursive: true, force: true });
fs.mkdirSync(DESTINO, { recursive: true });

const voc = limpiando ? vocabulario() : null;
if (voc) {
  console.log(`vocabulario del sitio: ${voc.clases.size} clases, ${voc.ids.size} ids, ${voc.etiquetas.size} etiquetas`);
} else {
  console.log('hojas tal cual, sin quitar reglas (usa --limpiar para adelgazarlas)');
}

let antes = 0, despues = 0;

/** El corte: hasta el 17 van antes de la hoja de la pagina; del 18 en adelante, despues. */
const CORTE = 17;

const dirComunes = path.join(ORIGEN, 'comunes');
const comunes = fs.existsSync(dirComunes) ? fs.readdirSync(dirComunes).filter((f) => f.endsWith('.css')).sort() : [];

function juntar(lista) {
  return lista.map((f) => {
    const css = rutasPropias(fs.readFileSync(path.join(dirComunes, f), 'utf8'));
    antes += css.length;
    return `/* ${f} */\n${voc ? limpiar(css, voc) : css}`;
  }).join('\n');
}

const primeras = comunes.filter((f) => Number(f.slice(0, 2)) <= CORTE);
const ultimas = comunes.filter((f) => Number(f.slice(0, 2)) > CORTE);

for (const [nombre, lista] of [['comunes.css', primeras], ['comunes-final.css', ultimas]]) {
  const texto = juntar(lista);
  fs.writeFileSync(path.join(DESTINO, nombre), texto);
  despues += texto.length;
  console.log(`${nombre.padEnd(18)} ${String(lista.length).padStart(2)} hojas  ${Math.round(texto.length / 1024)} KB`);
}

const dirPaginas = path.join(ORIGEN, 'paginas');
let n = 0;
if (fs.existsSync(dirPaginas)) {
  for (const f of fs.readdirSync(dirPaginas)) {
    if (!f.endsWith('.css')) continue;
    const css = rutasPropias(fs.readFileSync(path.join(dirPaginas, f), 'utf8'));
    antes += css.length;
    const salida = voc ? limpiar(css, voc) : css;
    fs.writeFileSync(path.join(DESTINO, f), salida);
    despues += salida.length;
    n++;
  }
}
console.log(`hojas de pagina:   ${n}`);
console.log(`\ntotal: ${Math.round(antes / 1024)} KB -> ${Math.round(despues / 1024)} KB` +
  (antes ? ` (${Math.round((1 - despues / antes) * 100)} % menos)` : ''));
