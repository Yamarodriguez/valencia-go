/**
 * montar-referencia.mjs — completa la copia local de la web vieja (referencia/).
 *
 *   node scripts/montar-referencia.mjs [--ensayo] [--solo-es] [--hilos 4]
 *
 * Parte del HTML ya bajado (referencia/<ruta>/index.html) y:
 *   1. saca de cada pagina todo lo que pide al propio dominio: hojas, guiones,
 *      fotos (src, srcset, data-src, data-srcset, fondos en style= y en los
 *      ajustes JSON de Elementor), favicons y videos;
 *   2. baja cada fichero UNA vez a referencia/<misma ruta>, sin la ?ver=;
 *   3. lee las hojas bajadas y baja lo que piden con url(): letras, fondos e
 *      iconos, tambien las que estan dentro de otras hojas (@import);
 *   4. anade las post-ID.css de Elementor de todas las paginas y plantillas
 *      publicadas (IDs del export): LiteSpeed las esconde dentro de su CSS
 *      combinado y hacen falta sueltas para la copia fiel;
 *   5. reescribe en HTML y CSS las direcciones absolutas al dominio (https://,
 *      //, https:\/\/) como relativas, y falla si queda alguna;
 *   6. escribe informes/montar-referencia.md y sale con 1 si fallo alguna
 *      descarga (que no sea un 404 ya apuntado en src/data/fallos-original.json)
 *      o quedo alguna direccion absoluta.
 *
 * Es idempotente: lo que ya esta bajado no se vuelve a pedir.
 */
import fs from 'node:fs';
import path from 'node:path';
import { crearRelativizador } from './lib/relativizar.mjs';

const RAIZ = path.resolve('.');
const REF = path.join(RAIZ, 'referencia');
const INFORME = path.join(RAIZ, 'informes', 'montar-referencia.md');
const site = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', 'site.json'), 'utf8'));
const DOMINIO = site.dominio.replace(/\/$/, '');
const HOST = new URL(DOMINIO).host;                 // www.valenciaandgo.com
const HOST_SIN_WWW = HOST.replace(/^www\./, '');    // valenciaandgo.com
const ENSAYO = process.argv.includes('--ensayo');
const SOLO_ES = process.argv.includes('--solo-es');
const HILOS = Number(process.argv[process.argv.indexOf('--hilos') + 1]) || 4;
const ESPERA = 120;
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 (migracion a Astro)' };

const excepciones = (() => {
  const f = path.join(RAIZ, 'src', 'data', 'fallos-original.json');
  if (!fs.existsSync(f)) return new Set();
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  return new Set((d['404'] || []).map((x) => (typeof x === 'string' ? x : x.ruta)));
})();

/* ------------------------------------------------------------ 1. paginas */

function paginas() {
  const lista = [];
  const recorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'wp-content' || e.name === 'wp-includes') continue;
        if (SOLO_ES && dir === REF && /^(en|it|fr|pl)$/.test(e.name)) continue;
        recorrer(p);
      } else if (e.name === 'index.html') lista.push(p);
    }
  };
  recorrer(REF);
  return lista.sort();
}

/* ------------------------------------------------ 2. recursos de un HTML */

const EXT_IMG = /\.(jpe?g|png|webp|gif|svg|avif|ico)$/i;
const EXT_FUENTE = /\.(woff2?|ttf|otf|eot)$/i;
const EXT_VIDEO = /\.(mp4|webm|mov|ogg)$/i;
function clasificar(ruta) {
  if (/\.css$/i.test(ruta)) return 'hoja';
  if (/\.js$/i.test(ruta)) return 'guion';
  if (EXT_IMG.test(ruta)) return 'foto';
  if (EXT_FUENTE.test(ruta)) return 'letra';
  if (EXT_VIDEO.test(ruta)) return 'video';
  return 'otro';
}

/** Pasa una direccion (absoluta, //, o relativa a la raiz) a ruta del propio
 *  dominio sin ?query ni #. Devuelve '' si no es un fichero nuestro. */
function aRutaPropia(url, base) {
  if (!url) return '';
  let u = url.trim().replace(/&amp;/g, '&').replace(/&#0?38;/g, '&').replace(/\\\//g, '/');
  if (/^(data:|mailto:|tel:|javascript:|#)/i.test(u)) return '';
  try {
    const abs = new URL(u, base || DOMINIO + '/');
    if (abs.host !== HOST && abs.host !== HOST_SIN_WWW) return '';
    let ruta = decodeURI(abs.pathname);
    if (!/^\/(wp-content|wp-includes)\//.test(ruta)) return '';
    if (ruta.endsWith('/') || /\.php$/i.test(ruta)) return '';
    if (!/\.[a-z0-9]{2,5}$/i.test(ruta)) return '';
    return ruta;
  } catch {
    return '';
  }
}

function recursosDeHtml(html) {
  const encontrados = new Set();
  const plano = html.replace(/\\\//g, '/').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'");
  for (const m of plano.matchAll(/\b(?:href|src|data-src|data-bg|data-background|data-lazy-src|poster|content)=["']([^"']+)["']/gi)) {
    const r = aRutaPropia(m[1]); if (r) encontrados.add(r);
  }
  for (const m of plano.matchAll(/\b(?:srcset|data-srcset|data-lazy-srcset)=["']([^"']+)["']/gi)) {
    for (const trozo of m[1].split(',')) { const r = aRutaPropia(trozo.trim().split(/\s+/)[0]); if (r) encontrados.add(r); }
  }
  for (const m of plano.matchAll(/url\((['"]?)([^)'"]+)\1\)/gi)) {
    const r = aRutaPropia(m[2]); if (r) encontrados.add(r);
  }
  // lo que queda en JSON (ajustes de Elementor, JSON-LD): cualquier fichero de uploads
  const rx = new RegExp(`https?://(?:www\\.)?${HOST_SIN_WWW.replace(/\./g, '\\.')}/wp-(?:content|includes)/[^"'\\s)<>&]+`, 'gi');
  for (const m of plano.matchAll(rx)) { const r = aRutaPropia(m[0]); if (r) encontrados.add(r); }
  return encontrados;
}

function recursosDeCss(css, rutaCss) {
  const encontrados = new Set();
  const base = DOMINIO + rutaCss;
  for (const m of css.matchAll(/url\((['"]?)([^)'"]+)\1\)/gi)) {
    const r = aRutaPropia(m[2], base); if (r) encontrados.add(r);
  }
  for (const m of css.matchAll(/@import\s+(?:url\()?["']?([^"')\s;]+)/gi)) {
    const r = aRutaPropia(m[1], base); if (r) encontrados.add(r);
  }
  return encontrados;
}

/* ------------------------------------------------- 3. hojas post-ID.css */

function idsDelExport() {
  const xmls = fs.readdirSync(RAIZ).filter((f) => f.endsWith('.xml')).map((f) => path.join(RAIZ, f));
  if (!xmls.length) return [];
  const xml = fs.readFileSync(xmls.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0], 'utf8');
  const ids = [];
  for (const it of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const b = it[1];
    const tipo = (b.match(/<wp:post_type><!\[CDATA\[(.*?)\]\]>/) || [, ''])[1];
    const estado = (b.match(/<wp:status><!\[CDATA\[(.*?)\]\]>/) || [, ''])[1];
    if (estado !== 'publish' || !['page', 'post', 'product', 'atraccion', 'elementor_library'].includes(tipo)) continue;
    if (!/_elementor_data/.test(b) && tipo !== 'product' && tipo !== 'atraccion') continue;
    const id = (b.match(/<wp:post_id>(\d+)<\/wp:post_id>/) || [, ''])[1];
    if (id) ids.push(id);
  }
  return ids;
}

/* ------------------------------------------------------------ 4. bajar */

const resultado = new Map(); // ruta -> {estado, bytes, tipo}

async function bajar(ruta) {
  const destino = path.join(REF, ruta);
  if (fs.existsSync(destino) && fs.statSync(destino).size > 0) {
    return { estado: 'ya', bytes: fs.statSync(destino).size };
  }
  if (ENSAYO) return { estado: 'ensayo', bytes: 0 };
  let ultimo = '';
  for (let intento = 1; intento <= 3; intento++) {
    try {
      const r = await fetch(DOMINIO + encodeURI(ruta), { headers: UA, signal: AbortSignal.timeout(40000) });
      if (r.status === 404 || r.status === 410) return { estado: '404', bytes: 0 };
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const datos = Buffer.from(await r.arrayBuffer());
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.writeFileSync(destino, datos);
      return { estado: 'ok', bytes: datos.length };
    } catch (e) {
      ultimo = e.message || String(e);
      await new Promise((f) => setTimeout(f, 1500 * intento));
    }
  }
  return { estado: 'error', bytes: 0, motivo: ultimo };
}

async function bajarTodas(rutas) {
  const cola = [...rutas].filter((r) => !resultado.has(r));
  let i = 0;
  const obrero = async () => {
    while (i < cola.length) {
      const ruta = cola[i++];
      const res = await bajar(ruta);
      res.tipo = clasificar(ruta);
      resultado.set(ruta, res);
      if (res.estado === 'ok') await new Promise((f) => setTimeout(f, ESPERA));
    }
  };
  await Promise.all(Array.from({ length: HILOS }, obrero));
}

/* ------------------------------------------------- 5. reescribir rutas */

// La misma funcion que usa la web nueva (scripts/partir-paginas.mjs): asi las dos
// copias hacen exactamente lo mismo con las direcciones.
// En los HTML no se toca el texto visible; las hojas de estilo, enteras.
const rel = crearRelativizador(DOMINIO);
const reescribir = (texto, f) => (/\.css$/i.test(f) ? rel.relativizar(texto) : rel.relativizarHtml(texto));
const quedanAbsolutas = (texto, f) => (/\.css$/i.test(f) ? rel.contar(texto) : rel.contarHtml(texto)) > 0;

function ficherosDeTexto() {
  const lista = [];
  const recorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) recorrer(p);
      else if (/\.(html|css)$/i.test(e.name)) lista.push(p);
    }
  };
  recorrer(REF);
  return lista;
}

/* ------------------------------------------------------------- 6. main */

const t0 = Date.now();
const lista = paginas();
console.log(`[1/5] ${lista.length} paginas en referencia/ (${SOLO_ES ? 'solo castellano' : 'todos los idiomas'})`);

const pedidas = new Set();
const porPagina = new Map();
for (const f of lista) {
  const html = fs.readFileSync(f, 'utf8');
  const rec = recursosDeHtml(html);
  porPagina.set(f, rec.size);
  for (const r of rec) pedidas.add(r);
}
const ids = idsDelExport();
for (const id of ids) pedidas.add(`/wp-content/uploads/elementor/css/post-${id}.css`);
// las fotos que pide el arbol de Elementor del export (src/content/pages/*.json):
// la pagina en vivo a veces carga una miniatura (elementor/thumbs) y el arbol
// trae el original; hacen falta los dos. Tambien scripts/extra-imagenes.txt.
let delArbol = 0;
const dirJson = path.join(RAIZ, 'src', 'content', 'pages');
if (fs.existsSync(dirJson)) {
  for (const f of fs.readdirSync(dirJson)) {
    if (!f.endsWith('.json')) continue;
    const texto = fs.readFileSync(path.join(dirJson, f), 'utf8').replace(/\\\//g, '/');
    for (const m of texto.matchAll(/\/wp-content\/uploads\/[^\s"',)\\]+/g)) {
      const r = aRutaPropia(m[0]); if (r && !pedidas.has(r)) { pedidas.add(r); delArbol++; }
    }
  }
}
// scripts/extra-imagenes.txt (variantes que pinta Elementor, las apunta arbol.py) y
// scripts/extra-recursos.txt (lo que la web pide desde JavaScript y encontro el barrido de 404)
for (const nombre of ['extra-imagenes.txt', 'extra-recursos.txt']) {
  const extra = path.join(RAIZ, 'scripts', nombre);
  if (!fs.existsSync(extra)) continue;
  for (const l of fs.readFileSync(extra, 'utf8').split('\n')) {
    if (l.startsWith('#')) continue;
    const r = aRutaPropia(l.trim()); if (r && !pedidas.has(r)) { pedidas.add(r); delArbol++; }
  }
}
if (delArbol) console.log(`      + ${delArbol} fotos que pide el arbol del export y no la pagina en vivo`);
console.log(`[2/5] ${pedidas.size} ficheros distintos pedidos por las paginas (+ ${ids.length} post-ID.css del export)`);

await bajarTodas(pedidas);

// las hojas piden letras, fondos e iconos; se recorre hasta que no salga nada nuevo
let vuelta = 0;
for (;;) {
  const nuevas = new Set();
  for (const [ruta, res] of resultado) {
    if (res.tipo !== 'hoja' || !['ok', 'ya'].includes(res.estado) || res.leida) continue;
    res.leida = true;
    const css = fs.readFileSync(path.join(REF, ruta), 'utf8');
    for (const r of recursosDeCss(css, ruta)) if (!resultado.has(r)) nuevas.add(r);
  }
  if (!nuevas.size || ++vuelta > 5) break;
  await bajarTodas(nuevas);
}
console.log(`[3/5] ${resultado.size} ficheros en total tras leer las hojas`);

// hojas post-ID vacias o con error (B1.5)
const hojasMalas = [];
for (const [ruta, res] of resultado) {
  if (res.tipo !== 'hoja' || !['ok', 'ya'].includes(res.estado)) continue;
  const css = fs.readFileSync(path.join(REF, ruta), 'utf8');
  if (!css.includes('{') || (css.length < 200 && /post-\d+\.css$/.test(ruta))) hojasMalas.push(ruta);
}

// reescritura de direcciones absolutas
let reescritos = 0;
const quedan = [];
if (!ENSAYO) {
  for (const f of ficherosDeTexto()) {
    const antes = fs.readFileSync(f, 'utf8');
    const despues = reescribir(antes, f);
    if (despues !== antes) { fs.writeFileSync(f, despues); reescritos++; }
    if (quedanAbsolutas(despues, f)) quedan.push(path.relative(REF, f).replace(/\\/g, '/'));
  }
}
console.log(`[4/5] direcciones absolutas reescritas en ${reescritos} ficheros; quedan en ${quedan.length}`);

/* ------------------------------------------------------------ informe */

const porTipo = {};
let bytes = 0;
const fallos = [], no404 = [], ya404 = [];
for (const [ruta, res] of resultado) {
  porTipo[res.tipo] ??= { ok: 0, ya: 0, '404': 0, error: 0, ensayo: 0 };
  porTipo[res.tipo][res.estado]++;
  bytes += res.bytes || 0;
  if (res.estado === 'error') fallos.push(`${ruta} (${res.motivo})`);
  if (res.estado === '404') (excepciones.has(ruta) ? ya404 : no404).push(ruta);
}
const post404 = no404.filter((r) => /elementor\/css\/post-\d+\.css$/.test(r));
const no404Reales = no404.filter((r) => !/elementor\/css\/post-\d+\.css$/.test(r));

const lineas = [
  `# Montaje de la referencia — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
  '',
  `Paginas: ${lista.length}. Ficheros: ${resultado.size}. Peso: ${(bytes / 1048576).toFixed(1)} MB. ${ENSAYO ? '(ENSAYO: no se ha bajado nada)' : ''}`,
  '',
  '| Tipo | nuevos | ya estaban | 404 | error |', '|---|---|---|---|---|',
  ...Object.entries(porTipo).map(([t, c]) => `| ${t} | ${c.ok + c.ensayo} | ${c.ya} | ${c['404']} | ${c.error} |`),
  '',
  `## Errores de descarga (${fallos.length})`, ...fallos.map((x) => '- ' + x),
  '',
  `## 404 del servidor viejo que NO estan en fallos-original.json (${no404Reales.length})`, ...no404Reales.map((x) => '- ' + x),
  '',
  `## post-ID.css que no existen (${post404.length}: normal en productos y atracciones sin Elementor)`, ...post404.map((x) => '- ' + x),
  '',
  `## 404 ya apuntados como fallo del original (${ya404.length})`, ...ya404.map((x) => '- ' + x),
  '',
  `## Hojas vacias o sin reglas (${hojasMalas.length})`, ...hojasMalas.map((x) => '- ' + x),
  '',
  `## Ficheros donde queda una direccion absoluta al dominio (${quedan.length})`, ...quedan.slice(0, 200).map((x) => '- ' + x),
  '',
  `Tiempo: ${((Date.now() - t0) / 1000).toFixed(0)} s`,
];
fs.mkdirSync(path.dirname(INFORME), { recursive: true });
fs.writeFileSync(INFORME, lineas.join('\n') + '\n');

console.log(`[5/5] informe en informes/montar-referencia.md`);
console.log(`      ${(bytes / 1048576).toFixed(1)} MB en referencia/; errores ${fallos.length}; 404 nuevos ${no404Reales.length}; post-ID sin hoja ${post404.length}; hojas vacias ${hojasMalas.length}; absolutas que quedan ${quedan.length}`);
for (const x of fallos.slice(0, 5)) console.log('      ERROR ' + x);
for (const x of no404Reales.slice(0, 10)) console.log('      404   ' + x);

const falla = fallos.length || no404Reales.length || quedan.length;
process.exit(falla ? 1 : 0);
