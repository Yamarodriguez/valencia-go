/**
 * partir-paginas.mjs — convierte el HTML limpio de la web vieja en los datos
 * de la web nueva: una pagina = sus piezas, tal cual estaban.
 *
 *   node scripts/partir-paginas.mjs [--ensayo]
 *
 * Lee    descargas/html/<ruta>/index.html   (lo baja scripts/bajar-paginas.mjs)
 * Escribe src/content/paginas/<nombre>.html  las piezas, separadas por marcas:
 *            cabeza     lo de dentro de <head>
 *            antes      lo que hay en <body> antes de la cabecera (enlace "saltar")
 *            cabecera   <header data-elementor-type="header">…</header>
 *            contenido  lo que hay entre cabecera y pie (la pagina en si)
 *            pie        <footer data-elementor-type="footer">…</footer>
 *            despues    cookies, ventanas emergentes, WhatsApp y guiones
 *         src/content/paginas/indice.json    ruta, nombre, tipo, idioma y los
 *                                            atributos de <html> y <body>
 *         informes/partir-paginas.md
 *
 * El motor (src/pages/[...slug].astro) vuelve a juntar las piezas sin tocarlas.
 *
 * LO UNICO QUE SE CAMBIA respecto del original (regla A3.1: el contenido no se
 * toca), y todo queda contado en el informe:
 *   1. Direcciones absolutas al propio dominio -> relativas, en todo el
 *      documento MENOS donde tienen que ir absolutas: canonical, hreflang,
 *      etiquetas sociales (og:, twitter:, article:) y datos estructurados
 *      (application/ld+json). Lo hace scripts/lib/relativizar.mjs, el mismo
 *      que usa la referencia.
 *   2. De la cabeza se quitan las etiquetas que apuntan a cosas de WordPress
 *      que una web estatica no tiene (lista en src/data/cabeza.json).
 *   3. Font Awesome deja de pedirse a cdnjs y sale de este dominio (misma
 *      version, desde npm): src/data/cabeza.json, "sustituir".
 *
 * Sale con 1 si alguna pagina no se puede partir (sin cabecera o sin pie) o
 * si queda alguna direccion absoluta donde no debe.
 */
import fs from 'node:fs';
import path from 'node:path';
import { crearRelativizador } from './lib/relativizar.mjs';
import { quitarGuiones, reunirHojas, fotosPerezosas, aplazarGuiones } from './lib/aligerar.mjs';

const RAIZ = path.resolve('.');
const ORIGEN = path.join(RAIZ, 'descargas', 'html');
const DESTINO = path.join(RAIZ, 'src', 'content', 'paginas');
const ENSAYO = process.argv.includes('--ensayo');
const site = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', 'site.json'), 'utf8'));
const reglasCabeza = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', 'cabeza.json'), 'utf8'));
const tipos = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', 'tipos.json'), 'utf8'));
const { relativizarHtml, contarHtml } = crearRelativizador(site.dominio);
const velocidad = fs.existsSync(path.join(RAIZ, 'src', 'data', 'velocidad.json')) ? JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', 'velocidad.json'), 'utf8')) : { activo: false };
const tramosHojas = {};
const relativizar = relativizarHtml, contar = contarHtml;
export const MARCA = (n) => `\n<!--@@${n}@@-->\n`;
const PIEZAS = ['cabeza', 'antes', 'cabecera', 'contenido', 'pie', 'despues'];

const tipoDe = new Map();
for (const [tipo, rutas] of Object.entries(tipos)) for (const r of rutas) tipoDe.set(r, tipo);

function paginas() {
  const lista = [];
  const recorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) recorrer(p);
      else if (e.name === 'index.html') lista.push(p);
    }
  };
  if (fs.existsSync(ORIGEN)) recorrer(ORIGEN);
  return lista.sort();
}

/** Indice donde acaba el elemento <tag> que empieza en `desde` (cuenta la profundidad). */
function cierre(s, desde, tag) {
  const rx = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  rx.lastIndex = desde;
  let prof = 0;
  for (let m; (m = rx.exec(s));) {
    prof += m[1] ? -1 : 1;
    if (prof === 0) return m.index + m[0].length;
  }
  return -1;
}

const atributos = (cadena) => {
  const o = {};
  for (const m of cadena.matchAll(/([^\s=<>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) o[m[1]] = m[2] ?? m[3] ?? m[4] ?? '';
  return o;
};
const attr = (etiqueta, nombre) => {
  const m = etiqueta.match(new RegExp(`\\b${nombre}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? (m[1] ?? m[2] ?? m[3] ?? '') : null;
};

const cuenta = { quitadas: {}, sustituidas: {}, absolutasConservadas: 0, guionesQuitados: {}, tramos: 0, fotosPerezosas: 0, aplazados: 0 };
const sumar = (o, k) => { o[k] = (o[k] || 0) + 1; };

/** Relativiza todo menos los bloques application/ld+json (datos estructurados). */
function relativizarSalvoJsonLd(html) {
  return html.split(/(<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>)/gi)
    .map((trozo, i) => (i % 2 ? (cuenta.absolutasConservadas += contar(trozo), trozo) : relativizar(trozo))).join('');
}

function tratarCabeza(cabeza) {
  const rx = /<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<noscript\b[^>]*>[\s\S]*?<\/noscript>|<title\b[^>]*>[\s\S]*?<\/title>|<(?:meta|link|base)\b[^>]*>/gi;
  return cabeza.replace(rx, (el) => {
    const abre = el.match(/^<[^>]*>/)[0];
    const tag = (abre.match(/^<([a-z]+)/i) || [, 'comentario'])[1].toLowerCase();
    // 2. quitar
    for (const q of reglasCabeza.quitar) {
      if (q.etiqueta !== tag) continue;
      const v = attr(abre, q.atributo);
      if (v !== null && new RegExp(q.valor, 'i').test(v)) { sumar(cuenta.quitadas, q.nombre); return ''; }
    }
    // 3. sustituir
    for (const s of reglasCabeza.sustituir) {
      if (s.etiqueta !== tag) continue;
      const v = attr(abre, s.atributo);
      if (v !== null && new RegExp(s.valor, 'i').test(v)) { sumar(cuenta.sustituidas, s.nombre); return el.replace(v, s.por); }
    }
    // 1. absolutas donde deben serlo
    const absoluta =
      (tag === 'link' && (/^canonical$/i.test(attr(abre, 'rel') || '') || attr(abre, 'hreflang') !== null)) ||
      (tag === 'meta' && /^(og:|twitter:|article:|msapplication-TileImage)/i.test(attr(abre, 'property') || attr(abre, 'name') || '')) ||
      (tag === 'script' && /application\/ld\+json/i.test(attr(abre, 'type') || ''));
    if (absoluta) { cuenta.absolutasConservadas += contar(el); return el; }
    return relativizar(el);
  });
}

function partir(html, ruta) {
  const mHtml = /<html\b([^>]*)>/i.exec(html);
  const mHead = /<head\b[^>]*>/i.exec(html);
  const finHead = html.indexOf('</head>');
  const mBody = /<body\b([^>]*)>/i.exec(html);
  const finBody = html.lastIndexOf('</body>');
  if (!mHtml || !mHead || finHead < 0 || !mBody || finBody < 0) return { error: 'documento sin <html>, <head> o <body>' };
  const cabeza = html.slice(mHead.index + mHead[0].length, finHead);
  const cuerpo = html.slice(mBody.index + mBody[0].length, finBody);
  const mh = /<header\b[^>]*data-elementor-type="header"[^>]*>/i.exec(cuerpo);
  const mf = /<footer\b[^>]*data-elementor-type="footer"[^>]*>/i.exec(cuerpo);
  if (!mh || !mf) return { error: `sin ${!mh ? 'cabecera' : 'pie'} de Elementor` };
  const finH = cierre(cuerpo, mh.index, 'header');
  const finF = cierre(cuerpo, mf.index, 'footer');
  if (finH < 0 || finF < 0 || finH > mf.index) return { error: 'cabecera o pie sin cerrar' };
  let piezas = {
    cabeza: tratarCabeza(cabeza),
    antes: relativizarSalvoJsonLd(cuerpo.slice(0, mh.index)),
    cabecera: relativizarSalvoJsonLd(cuerpo.slice(mh.index, finH)),
    contenido: relativizarSalvoJsonLd(cuerpo.slice(finH, mf.index)),
    pie: relativizarSalvoJsonLd(cuerpo.slice(mf.index, finF)),
    despues: relativizarSalvoJsonLd(cuerpo.slice(finF)),
  };
  // Fase 6: velocidad (src/data/velocidad.json), sin tocar texto ni diseno
  if (velocidad.activo) {
    for (const p of PIEZAS) {
      const r = quitarGuiones(piezas[p], velocidad.guiones_quitar || []);
      piezas[p] = r.html;
      for (const [k, v] of Object.entries(r.quitados)) cuenta.guionesQuitados[k] = (cuenta.guionesQuitados[k] || 0) + v;
    }
    if (velocidad.hojas_reunir) {
      const r = reunirHojas(piezas.cabeza);
      piezas.cabeza = r.cabeza;
      Object.assign(tramosHojas, r.tramos);
      cuenta.tramos += Object.keys(r.tramos).length;
    }
    if (velocidad.fotos_perezosas) {
      const r = fotosPerezosas(piezas, velocidad.fotos_perezosas.saltar ?? 3);
      piezas = r.piezas;
      cuenta.fotosPerezosas += r.cuenta.perezosas;
    }
    if (velocidad.guiones_aplazar && velocidad.guiones_aplazar.activo) {
      for (const p of PIEZAS) { const r = aplazarGuiones(piezas[p]); piezas[p] = r.html; cuenta.aplazados += r.aplazados; }
    }
  }
  const body = atributos(mBody[1]);
  return {
    piezas,
    meta: {
      ruta,
      tipo: tipoDe.get(ruta) || 'sin-tipo',
      idioma: (attr(mHtml[0], 'lang') || '').toLowerCase(),
      html: atributos(mHtml[1]),
      body,
      cabeceraId: attr(mh[0], 'data-elementor-id'),
      pieId: attr(mf[0], 'data-elementor-id'),
      postId: Number(((body.class || '').match(/\b(?:postid|page-id)-(\d+)/) || [])[1]) || 0,
      doctype: (html.match(/^\s*<!doctype[^>]*>/i) || [''])[0].trim(),
      tras: html.slice(finBody + 7).replace(/<\/html>/i, '').trim().length,
    },
  };
}

const lista = paginas();
if (!lista.length) { console.error('no hay nada en descargas/html — ejecuta antes scripts/bajar-paginas.mjs'); process.exit(1); }
if (!ENSAYO) { fs.rmSync(DESTINO, { recursive: true, force: true }); fs.mkdirSync(DESTINO, { recursive: true }); }

const indice = [];
const errores = [];
const quedanAbs = [];
const porTipo = {};
let bytes = 0;
for (const f of lista) {
  const ruta = '/' + path.relative(ORIGEN, path.dirname(f)).replace(/\\/g, '/').replace(/^\.$/, '') + (path.dirname(f) === ORIGEN ? '' : '/');
  const html = fs.readFileSync(f, 'utf8');
  const r = partir(html, ruta === '//' ? '/' : ruta);
  if (r.error) { errores.push(`${ruta} — ${r.error}`); continue; }
  const nombre = ruta.replace(/^\/|\/$/g, '').replace(/\//g, '--') || 'inicio';
  const texto = PIEZAS.map((p) => MARCA(p) + r.piezas[p]).join('');
  // comprobacion: fuera de la cabeza no puede quedar ninguna direccion absoluta "suelta"
  const sueltas = PIEZAS.filter((p) => p !== 'cabeza').reduce((n, p) => n + contar(r.piezas[p].replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '')), 0);
  if (sueltas) quedanAbs.push(`${ruta} (${sueltas})`);
  r.meta.nombre = nombre;
  r.meta.titulo = ((r.piezas.cabeza.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1]).trim();
  indice.push(r.meta);
  porTipo[r.meta.tipo] = (porTipo[r.meta.tipo] || 0) + 1;
  bytes += texto.length;
  if (!ENSAYO) fs.writeFileSync(path.join(DESTINO, nombre + '.html'), texto);
}
indice.sort((a, b) => a.ruta.localeCompare(b.ruta));
if (!ENSAYO) fs.writeFileSync(path.join(DESTINO, 'indice.json'), JSON.stringify(indice, null, 1));
if (!ENSAYO && velocidad.activo && velocidad.hojas_reunir) fs.writeFileSync(path.join(DESTINO, 'hojas.json'), JSON.stringify(tramosHojas, null, 1));
else if (!ENSAYO) fs.rmSync(path.join(DESTINO, 'hojas.json'), { force: true });

// La pagina de error 404 (descargas/html-404/): mismas piezas, fuera del indice.
// Donde WordPress copio la direccion inventada (selector de idioma...) se deja la raiz.
let estado404 = 'no hay descargas/html-404 (la baja scripts/bajar-paginas.mjs)';
const f404 = path.join(RAIZ, 'descargas', 'html-404', 'index.html');
if (fs.existsSync(f404)) {
  const html404 = fs.readFileSync(f404, 'utf8').replace(/pagina-que-no-existe-para-el-404\/?/g, '');
  const r = partir(html404, '/404/');
  if (r.error) { errores.push('pagina 404 — ' + r.error); estado404 = 'ERROR: ' + r.error; }
  else {
    r.meta.nombre = '_404'; r.meta.tipo = 'error-404';
    if (!ENSAYO) {
      fs.writeFileSync(path.join(DESTINO, '_404.html'), PIEZAS.map((p) => MARCA(p) + r.piezas[p]).join(''));
      fs.writeFileSync(path.join(DESTINO, '_404.json'), JSON.stringify(r.meta, null, 1));
    }
    estado404 = 'partida';
  }
}

const sinTipo = indice.filter((p) => p.tipo === 'sin-tipo').map((p) => p.ruta);
const conResto = indice.filter((p) => p.tras > 0).length;
const lineas = [
  `# Partir las paginas — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}${ENSAYO ? ' (ENSAYO)' : ''}`, '',
  `Paginas: ${indice.length} de ${lista.length}. Peso de las piezas: ${(bytes / 1048576).toFixed(1)} MB.`, '',
  '## Por tipo', ...Object.entries(porTipo).sort().map(([t, n]) => `- ${t}: ${n}`), '',
  '## Cabeceras y pies', ...Object.entries(indice.reduce((o, p) => { const k = `cabecera ${p.cabeceraId} + pie ${p.pieId}`; o[k] = (o[k] || 0) + 1; return o; }, {})).map(([k, n]) => `- ${k}: ${n} paginas`), '',
  '## Etiquetas quitadas de la cabeza (src/data/cabeza.json)', ...Object.entries(cuenta.quitadas).map(([k, n]) => `- ${k}: ${n}`), '',
  '## Sustituidas', ...Object.entries(cuenta.sustituidas).map(([k, n]) => `- ${k}: ${n}`), '',
  `## Velocidad (src/data/velocidad.json, ${velocidad.activo ? 'activa' : 'desactivada'})`,
  ...Object.entries(cuenta.guionesQuitados).map(([k, n]) => `- guiones quitados — ${k}: ${n}`),
  `- tramos de hojas reunidas: ${Object.keys(tramosHojas).length} distintos (${cuenta.tramos} en total)`,
  `- fotos con loading=lazy anadido: ${cuenta.fotosPerezosas}`,
  `- guiones aplazados hasta que el visitante haga algo: ${cuenta.aplazados}`, '',
  `Direcciones absolutas conservadas a proposito (canonical, hreflang, sociales, datos estructurados): ${cuenta.absolutasConservadas}.`,
  `Paginas con algo escrito despues de </body> (se descarta: comentarios del servidor): ${conResto}.`, '',
  `Pagina de error 404: ${estado404}.`, '',
  `## No se pudieron partir (${errores.length})`, ...errores.map((x) => '- ' + x), '',
  `## Paginas con direcciones absolutas sueltas fuera de la cabeza (${quedanAbs.length})`, ...quedanAbs.slice(0, 100).map((x) => '- ' + x), '',
  `## Paginas que no estan en src/data/tipos.json (${sinTipo.length})`, ...sinTipo.map((x) => '- ' + x),
];
fs.mkdirSync(path.join(RAIZ, 'informes'), { recursive: true });
fs.writeFileSync(path.join(RAIZ, 'informes', 'partir-paginas.md'), lineas.join('\n') + '\n');
console.log(`partir-paginas: ${indice.length} paginas, ${(bytes / 1048576).toFixed(1)} MB; errores ${errores.length}; con absolutas sueltas ${quedanAbs.length}; sin tipo ${sinTipo.length} -> informes/partir-paginas.md`);
console.log('  quitadas: ' + JSON.stringify(cuenta.quitadas));
for (const x of errores.slice(0, 8)) console.log('  ERROR ' + x);
for (const x of quedanAbs.slice(0, 5)) console.log('  ABSOLUTA ' + x);
process.exit(errores.length || quedanAbs.length ? 1 : 0);
