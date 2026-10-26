/**
 * inventario-fotos.mjs — recorre las 1.020 páginas y apunta cada foto del
 * contenido con la página a la que pertenece, el H1 de esa página y el H2/H3
 * bajo el que está. Con eso propone el nombre nuevo de cada foto:
 *
 *   - foto bajo el H1 (antes del primer H2):  <h1>-N.webp
 *   - foto bajo un H2 o H3:                  <h1>-<titulo de la seccion>-N.webp
 *
 * Deja:
 *   src/data/fotos.json          la lista (lo lee cambiar-fotos.mjs)
 *   informes/fotos-inventario.md  la misma lista, para leerla, por página
 *
 *   node scripts/inventario-fotos.mjs
 *
 * No cambia ninguna página. Logos, iconos, banderas y logos de terceros se
 * apuntan aparte (sección "marca") y no reciben nombre nuevo: el logo lo
 * cambia cambiar-marca.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { indice, leerPiezas } from '../src/utils/piezas.js';

const RAIZ = path.resolve('.');
const SALIDA = path.join(RAIZ, 'src', 'data', 'fotos.json');
const INFORME = path.join(RAIZ, 'informes', 'fotos-inventario.md');
const PUBLICO = path.join(RAIZ, 'public');

const EXT = /\.(jpe?g|png|webp|gif|avif)$/i;
const ES_LOGO = /logo|valencia_go|isotip|isologo|valenciaandgo/i;
const ES_ICONO = /\/flags\/|icono-|img-bandera|\.svg$/i;
const ES_TERCERO = /\/img-(civitatis|crea-turisme|fundacio|get-your-guide|guias-oficiales|kayak|tripadvisor|union-europea)/i;
const PRIORIDAD_TIPO = ['producto', 'atraccion', 'entrada', 'pagina', 'portada', 'otro', 'categoria-productos', 'categoria-blog'];

// --- utilidades -------------------------------------------------------------

function limpiar(texto) {
  return decodificar(texto.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function decodificar(t) {
  return t.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#8211;|&ndash;/g, '–').replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(Number(n)));
}

export function slug(texto, max = 60) {
  const s = decodificar(String(texto)).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, ' y ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (s.length <= max) return s;
  const corto = s.slice(0, max);
  return corto.includes('-') ? corto.slice(0, corto.lastIndexOf('-')) : corto;
}

// quita el sufijo de tamaño de WordPress (-300x200) y normaliza
function base(ruta) {
  return ruta.split('?')[0].replace(/-\d+x\d+(\.[a-z]+)$/i, '$1');
}

function tokens(t) {
  return new Set(slug(t, 200).split('-').filter((p) => p.length > 2 && !['los', 'las', 'del', 'con', 'por', 'para', 'the', 'and', 'desde', 'una', 'uno'].includes(p)));
}

function parecido(a, b) {
  const A = tokens(a), B = tokens(b);
  let n = 0;
  for (const t of A) if (B.has(t)) n++;
  return n;
}

function clase(ruta) {
  if (ES_LOGO.test(ruta)) return 'logo';
  if (ES_TERCERO.test(ruta)) return 'tercero';
  if (ES_ICONO.test(ruta)) return 'icono';
  if (EXT.test(ruta)) return 'foto';
  return 'otro';
}

// --- lectura de una pieza ---------------------------------------------------

// recorre la pieza en orden y devuelve las fotos con el encabezado vigente
function fotosDePieza(html, nombrePieza, pagina) {
  const re = /<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>|<img\b[^>]*>|<a\b[^>]*href="([^"]*)"[^>]*>|<\/a>|url\((?:&quot;|["']?)(\/wp-content\/uploads\/[^"')&]+)|"url":"([^"]*wp-content\\?\/uploads[^"]*)"/gi;
  const salida = [];
  let h1 = '', h2 = '', h3 = '', enlace = null, orden = 0;
  for (const m of html.matchAll(re)) {
    const todo = m[0];
    if (m[1]) {
      const nivel = m[1].toLowerCase(), texto = limpiar(m[2]);
      if (nivel === 'h1') { h1 = texto; h2 = ''; h3 = ''; }
      else if (nivel === 'h2') { h2 = texto; h3 = ''; }
      else h3 = texto;
      continue;
    }
    if (todo === '</a>') { enlace = null; continue; }
    if (m[3] !== undefined) { enlace = m[3]; continue; }
    let src = m[4] || (m[5] && m[5].replace(/\\\//g, '/')) || null, alt = '';
    if (todo.startsWith('<img')) {
      const s = todo.match(/\s(?:data-)?src="([^"]+)"/i);
      const ds = todo.match(/\sdata-src="([^"]+)"/i);
      src = ds ? ds[1] : s ? s[1] : null;
      const a = todo.match(/\salt="([^"]*)"/i);
      alt = a ? limpiar(a[1]) : '';
      const ss = todo.match(/\s(?:data-)?srcset="([^"]+)"/i);
      if (ss) for (const v of ss[1].split(',')) { const r = v.trim().split(/\s+/)[0]; if (r) salida.push({ ruta: r, variante: true }); }
    }
    if (!src || !src.startsWith('/wp-content/uploads/')) continue;
    const propia = !enlace || enlace === pagina.ruta || !enlace.startsWith('/') || enlace.startsWith('#') || /\.(jpe?g|png|webp|gif|pdf)$/i.test(enlace);
    salida.push({ ruta: src, pieza: nombrePieza, h1, h2, h3, alt, enlace: propia ? null : enlace, orden: orden++ });
  }
  return salida;
}

// --- recorrido --------------------------------------------------------------

const paginas = indice();
const fotos = new Map(); // base → { clase, variantes:Set, usos:[] }
const porRuta = new Map(paginas.map((p) => [p.ruta, p]));
const h1DePagina = new Map(); // ruta → H1 del contenido

for (const p of paginas) {
  const piezas = leerPiezas(p.nombre);
  const h1 = (piezas.contenido || '').match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  h1DePagina.set(p.ruta, h1 ? limpiar(h1[1]) : (p.titulo || p.nombre));
  for (const nombrePieza of ['cabecera', 'contenido', 'pie']) {
    const html = piezas[nombrePieza];
    if (!html) continue;
    for (const f of fotosDePieza(html, nombrePieza, p)) {
      const b = base(f.ruta);
      if (!fotos.has(b)) fotos.set(b, { clase: clase(b), variantes: new Set(), usos: [] });
      const e = fotos.get(b);
      if (f.ruta !== b) e.variantes.add(f.ruta);
      if (f.variante) continue;
      e.usos.push({ pagina: p.ruta, nombre: p.nombre, idioma: p.idioma, tipo: p.tipo, titulo: p.titulo, pieza: f.pieza, h1: f.h1 || '', h2: f.h2, h3: f.h3, alt: f.alt, enlace: f.enlace, orden: f.orden });
    }
  }
}

// hojas de Elementor con fotos de fondo (public/wp-content/uploads/elementor/css/*.css)
const CSS = path.join(PUBLICO, 'wp-content', 'uploads', 'elementor', 'css');
const enCss = new Map();
if (fs.existsSync(CSS)) for (const f of fs.readdirSync(CSS)) {
  if (!f.endsWith('.css')) continue;
  const t = fs.readFileSync(path.join(CSS, f), 'utf8');
  for (const m of t.matchAll(/url\(["']?(\/wp-content\/uploads\/[^"')]+)/g)) {
    const b = base(m[1]);
    if (!fotos.has(b)) fotos.set(b, { clase: clase(b), variantes: new Set(), usos: [] });
    if (m[1] !== b) fotos.get(b).variantes.add(m[1]);
    if (!enCss.has(b)) enCss.set(b, new Set());
    enCss.get(b).add('/wp-content/uploads/elementor/css/' + f);
  }
}

// --- página "dueña" y nombre nuevo -----------------------------------------

// una tarjeta que enlaza a otra página pertenece a esa página: el uso se
// reescribe como si estuviera allí, bajo su H1 y sin sección
function comoTarjeta(u) {
  const destino = porRuta.get(u.enlace) || porRuta.get(u.enlace.replace(/\/?$/, '/'));
  if (!destino) return null;
  return { ...u, pagina: destino.ruta, nombre: destino.nombre, idioma: destino.idioma, tipo: destino.tipo, titulo: destino.titulo, h1: h1DePagina.get(destino.ruta), h2: '', h3: '', enlace: null, tarjeta: u.enlace };
}

function elegirDueno(usos) {
  const propios = usos.filter((u) => u.pieza === 'contenido' && !u.enlace);
  const tarjetas = usos.filter((u) => u.pieza === 'contenido' && u.enlace).map(comoTarjeta).filter(Boolean);
  const lista = propios.length ? propios : tarjetas.length ? tarjetas : usos.filter((u) => u.pieza === 'contenido').length ? usos.filter((u) => u.pieza === 'contenido') : usos;
  const es = lista.filter((u) => u.idioma === 'es-es');
  const pool = es.length ? es : lista;
  return pool.slice().sort((a, b) => (PRIORIDAD_TIPO.indexOf(a.tipo) - PRIORIDAD_TIPO.indexOf(b.tipo)) || (b.parecido - a.parecido) || (a.orden - b.orden))[0];
}

// miniatura de Elementor (thumbs/<nombre>-<hash>.ext) → nombre de la foto original
function originalDeMiniatura(b) {
  const m = b.match(/\/elementor\/thumbs\/(.+)-[a-z0-9]{20,}\.[a-z]+$/i);
  return m ? m[1].toLowerCase() : null;
}

const resultado = {};
const contador = new Map(); // prefijo → n
const porPagina = new Map();
const fuera = []; // fotos que no existen en public/
const porNombreFichero = new Map(); // nombre sin carpeta ni extensión → base
for (const [b, e] of fotos) if (e.clase === 'foto' && !b.includes('/elementor/thumbs/')) porNombreFichero.set(path.posix.basename(b).replace(/\.[a-z]+$/i, '').toLowerCase(), b);

// primero las fotos normales, luego las miniaturas (que heredan el nombre)
const ordenadas = [...fotos.entries()].sort(([a], [b]) => Number(a.includes('/elementor/thumbs/')) - Number(b.includes('/elementor/thumbs/')));

for (const [b, e] of ordenadas) {
  const existe = fs.existsSync(path.join(PUBLICO, b));
  if (!existe) fuera.push(b);
  const entrada = { clase: e.clase, usos: e.usos.length, paginas: new Set(e.usos.map((u) => u.pagina)).size, variantes: [...e.variantes].sort(), existe };
  if (enCss.has(b)) entrada.css = [...enCss.get(b)].sort();
  const original = originalDeMiniatura(b);
  const madre = original && porNombreFichero.get(original) && resultado[porNombreFichero.get(original)];
  if (e.clase === 'foto' && madre && madre.nuevo) {
    // miniatura de una foto ya nombrada: mismo nombre con -tarjeta
    const prefijo = madre.nuevo.replace(/\.webp$/, '-tarjeta');
    const n = (contador.get(prefijo) || 0) + 1;
    contador.set(prefijo, n);
    Object.assign(entrada, { nuevo: `${prefijo}${n > 1 ? '-' + n : ''}.webp`, alt: madre.alt, pagina: madre.pagina, h1: madre.h1, seccion: madre.seccion, original: porNombreFichero.get(original), miniatura: true });
    porPagina.get(madre.pagina).fotos.push({ vieja: b, ...entrada });
  } else if (e.clase === 'foto' && e.usos.length) {
    for (const u of e.usos) u.parecido = parecido(b.replace(/^.*\/uploads\//, ''), u.nombre + ' ' + u.h1);
    const d = elegirDueno(e.usos);
    const h1 = d.h1 || h1DePagina.get(d.pagina) || d.titulo || d.nombre;
    const seccion = d.tarjeta ? '' : (d.h3 || d.h2 || '');
    const prefijo = seccion ? `${slug(h1, 45)}-${slug(seccion, 30)}` : slug(h1, 60);
    const n = (contador.get(prefijo) || 0) + 1;
    contador.set(prefijo, n);
    Object.assign(entrada, {
      nuevo: `${prefijo}-${n}.webp`,
      alt: seccion ? `${limpiar(h1)}: ${limpiar(seccion)}` : limpiar(h1),
      pagina: d.pagina,
      h1: limpiar(h1),
      seccion: limpiar(seccion),
      tarjeta: d.tarjeta || (d.enlace ? d.enlace : undefined),
      altActual: d.alt || '',
      miniatura: b.includes('/elementor/thumbs/') || undefined,
    });
    if (!porPagina.has(d.pagina)) porPagina.set(d.pagina, { h1: entrada.h1, tipo: d.tipo, fotos: [] });
    porPagina.get(d.pagina).fotos.push({ vieja: b, ...entrada });
  } else if (e.clase === 'foto') {
    entrada.nota = enCss.has(b) ? 'solo como fondo en CSS: sin página dueña' : 'solo como tamaño alternativo (srcset) de otra foto';
  }
  resultado[b] = entrada;
}

fs.writeFileSync(SALIDA, JSON.stringify(resultado, null, 1) + '\n');

// --- informe ----------------------------------------------------------------

const lineas = [];
const total = Object.values(resultado);
const cuenta = (c) => total.filter((e) => e.clase === c).length;
lineas.push('# Inventario de fotos (nombre nuevo por H1 y sección)', '', `Hecho el ${new Date().toISOString().slice(0, 10)} con \`node scripts/inventario-fotos.mjs\`. Nada cambiado.`, '');
lineas.push('| Clase | Ficheros distintos |', '|---|---|', `| Fotos del contenido (reciben nombre nuevo) | ${cuenta('foto')} |`, `| Logos de la empresa vieja (los cambia cambiar-marca.mjs) | ${cuenta('logo')} |`, `| Logos de terceros (Civitatis, TripAdvisor, UE…) | ${cuenta('tercero')} |`, `| Iconos y banderas (SVG, se quedan o se recolorean) | ${cuenta('icono')} |`, '');
lineas.push(`Fotos con página dueña: ${[...porPagina.values()].reduce((s, p) => s + p.fotos.length, 0)} en ${porPagina.size} páginas. Fotos que solo aparecen como fondo en CSS: ${total.filter((e) => e.nota).length}.`, '');
if (fuera.length) lineas.push(`Rutas que las páginas piden y no están en public/: ${fuera.length} (se listan al final).`, '');
lineas.push('Regla del nombre: `<h1>-N.webp` si la foto va bajo el H1; `<h1>-<sección>-N.webp` si va bajo un H2 o H3. El texto alternativo propuesto es el H1 (y la sección). Las tarjetas que enlazan a otra página toman el nombre de esa página cuando la foto también sale allí.', '');
lineas.push('## Logos de la empresa vieja', '');
for (const [b, e] of Object.entries(resultado)) if (e.clase === 'logo') lineas.push(`- \`${b}\` · ${e.usos} usos en ${e.paginas} páginas${e.variantes.length ? ` · tamaños: ${e.variantes.length}` : ''}`);
lineas.push('', '## Fotos por página', '');
const orden = [...porPagina.entries()].sort((a, b) => (PRIORIDAD_TIPO.indexOf(a[1].tipo) - PRIORIDAD_TIPO.indexOf(b[1].tipo)) || a[0].localeCompare(b[0]));
for (const [ruta, p] of orden) {
  lineas.push(`### ${ruta}`, '', `H1: **${p.h1}** · tipo: ${p.tipo} · ${p.fotos.length} fotos`, '', '| Sección | Foto actual | Nombre nuevo | Alt propuesto | Usos |', '|---|---|---|---|---|');
  for (const f of p.fotos) lineas.push(`| ${f.seccion || '(H1)'}${f.miniatura ? ' · miniatura de tarjeta' : ''} | \`${f.vieja.replace('/wp-content/uploads/', '')}\` | \`${f.nuevo}\` | ${f.alt} | ${f.usos} en ${f.paginas} pág.${f.css ? ' + CSS' : ''} |`);
  // fotos que esta página muestra en su contenido pero que llevan el nombre de otra
  const propias = new Set(p.fotos.map((f) => f.vieja));
  const ajenas = [];
  for (const [b, e] of fotos) {
    if (e.clase !== 'foto' || propias.has(b) || !resultado[b]?.nuevo || resultado[b].miniatura) continue;
    if (e.usos.some((u) => u.pagina === ruta && u.pieza === 'contenido' && !u.enlace)) ajenas.push(b);
  }
  if (ajenas.length) {
    lineas.push('', `También salen en esta página (con el nombre de su página dueña): ${ajenas.map((b) => `\`${resultado[b].nuevo}\``).join(', ')}`);
  }
  lineas.push('');
}
const soloCss = Object.entries(resultado).filter(([, e]) => e.nota);
if (soloCss.length) {
  lineas.push('## Fotos solo de fondo (CSS)', '');
  for (const [b, e] of soloCss) lineas.push(`- \`${b}\` · ${e.css ? 'en ' + e.css.join(', ') : e.nota}`);
  lineas.push('');
}
if (fuera.length) { lineas.push('## Rutas que no existen en public/', ''); for (const b of fuera) lineas.push(`- \`${b}\``); lineas.push(''); }
fs.mkdirSync(path.dirname(INFORME), { recursive: true });
fs.writeFileSync(INFORME, lineas.join('\n'));
console.log(`fotos: ${cuenta('foto')} · logos: ${cuenta('logo')} · terceros: ${cuenta('tercero')} · iconos: ${cuenta('icono')} · páginas con fotos: ${porPagina.size}`);
console.log(`→ ${path.relative(RAIZ, SALIDA)} y ${path.relative(RAIZ, INFORME)}`);
