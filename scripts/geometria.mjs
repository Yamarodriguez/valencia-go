/**
 * geometria.mjs — mide con el navegador cada texto, enlace e imagen de la web
 * vieja (referencia, :8090) y de la nueva (dist, :4321) y los compara.
 *
 *   node scripts/geometria.mjs [--vieja http://localhost:8090] [--nueva http://localhost:4321]
 *                              [--por-tipo 2] [--tipos a,b] [--rutas /a/,/b/] [--todas]
 *                              [--guardar informes/geometria-aprobada.json] [--contra fichero.json]
 *
 * De cada elemento: x, y, ancho y alto; si se ve (display, visibility,
 * opacity); tamano, grosor, color, tipografia y alineacion de la letra.
 * Se mide a 1400 y a 390 px en la misma pasada, para cada tipo de pagina de
 * src/data/tipos.json. Tambien lista lo que sobra o falta en la nueva.
 *
 * Tolerancia: 1 px (redondeos). Las diferencias inevitables y aprobadas van en
 * src/data/fallos-original.json, lista "geometria" (ruta + selector), y salen
 * como aviso. Informe en informes/geometria.md. Sale con 1 si hay algun FALLO.
 *
 * --guardar escribe la medida de la NUEVA (para compararla mas adelante, con
 * el rediseno encendido, contra la ultima aprobada: --contra).
 */
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ, leerJson, arg, abrirNavegador, nuevoContexto, preparar, rutasPorTipo } from './lib/navegador.mjs';

const VIEJA = arg('--vieja', 'http://localhost:8090').replace(/\/$/, '');
const NUEVA = arg('--nueva', 'http://localhost:4321').replace(/\/$/, '');
const ANCHOS = [1400, 390];
const TOL = 1;
const GUARDAR = arg('--guardar', '');
const CONTRA = arg('--contra', '');
const fo = leerJson(path.join(RAIZ, 'src', 'data', 'fallos-original.json'), {});
const aprobadas = (fo.geometria || []).map((x) => `${x.ruta}|${x.selector || ''}`);
const rutas = rutasPorTipo({ porTipo: 2, porTipoTraducido: 1 });
if (!rutas.length) { console.error('no hay rutas (src/data/tipos.json)'); process.exit(1); }

/** Se ejecuta dentro de la pagina. */
function medir() {
  const salida = [];
  const vistos = new Set();
  const firma = (e) => {
    const ids = [];
    for (let p = e; p && p !== document.body; p = p.parentElement) { const d = p.getAttribute && p.getAttribute('data-id'); if (d) { ids.push(d); if (ids.length === 2) break; } }
    return ids.reverse().join('>');
  };
  const anadir = (e, clase) => {
    if (vistos.has(e)) return; vistos.add(e);
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    let visible = cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    let op = 1;
    for (let p = e; p && p.nodeType === 1; p = p.parentElement) { const c = getComputedStyle(p); op *= parseFloat(c.opacity); if (c.display === 'none' || c.visibility === 'hidden') visible = false; }
    const texto = clase === 'img' ? (e.getAttribute('src') || '').split('/').pop().slice(0, 40) : (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    salida.push({
      c: clase, t: e.tagName.toLowerCase(), d: firma(e), s: texto,
      x: Math.round((r.left + scrollX) * 2) / 2, y: Math.round((r.top + scrollY) * 2) / 2, w: Math.round(r.width * 2) / 2, h: Math.round(r.height * 2) / 2,
      v: visible && op > 0.01 ? 1 : 0, o: Math.round(op * 100) / 100,
      fs: cs.fontSize, fw: cs.fontWeight, co: cs.color, ff: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), ta: cs.textAlign,
    });
  };
  const caminar = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  for (let e = caminar.currentNode; e; e = caminar.nextNode()) {
    const tag = e.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE' || tag === 'SVG' || e.closest('svg')) continue;
    // el globo de WhatsApp (joinchat) flota y se abre con un temporizador: no es maquetacion y no se mide
    if (e.closest('.joinchat') || e.closest('[data-nuevo]')) continue;
    if (tag === 'IMG') { anadir(e, 'img'); continue; }
    if (tag === 'A') anadir(e, 'a');
    for (const n of e.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) { anadir(e, 'txt'); break; }
  }
  return { elementos: salida, alto: document.documentElement.scrollHeight };
}

const navegador = await abrirNavegador();
const fallos = [], avisos = [], resumen = [];
const medidaNueva = {};
const previa = CONTRA ? leerJson(path.resolve(CONTRA), null) : null;
if (CONTRA && !previa) { console.error('no existe ' + CONTRA); process.exit(1); }

for (const ancho of ANCHOS) {
  const ctx = await nuevoContexto(navegador, ancho);
  const pagina = await ctx.newPage();
  for (const { ruta, tipo } of rutas) {
    const clave = `${ruta}@${ancho}`;
    let a;
    if (previa) a = previa[clave];
    else { a = (await preparar(pagina, VIEJA + ruta)) ? await pagina.evaluate(medir) : null; }
    const b = (await preparar(pagina, NUEVA + ruta)) ? await pagina.evaluate(medir) : null;
    if (b) medidaNueva[clave] = b;
    if (!a || !b) { fallos.push({ ruta, ancho, tipo, que: `no carga ${!a ? (previa ? 'la medida aprobada' : 'la vieja') : 'la nueva'}` }); continue; }
    let dif = 0;
    const ea = a.elementos, eb = b.elementos;
    if (ea.length !== eb.length) { dif++; fallos.push({ ruta, ancho, tipo, que: `numero de elementos distinto: vieja ${ea.length}, nueva ${eb.length} (${eb.length > ea.length ? 'sobran' : 'faltan'} ${Math.abs(eb.length - ea.length)} en la nueva)` }); }
    if (Math.abs(a.alto - b.alto) > TOL) { dif++; fallos.push({ ruta, ancho, tipo, que: `alto de la pagina: vieja ${a.alto}px, nueva ${b.alto}px` }); }
    const n = Math.min(ea.length, eb.length);
    for (let i = 0; i < n; i++) {
      const x = ea[i], y = eb[i];
      if (x.t !== y.t || x.c !== y.c || x.d !== y.d) { dif++; fallos.push({ ruta, ancho, tipo, que: `el elemento ${i} no es el mismo: vieja <${x.t}> ${x.d} «${x.s}» / nueva <${y.t}> ${y.d} «${y.s}»` }); break; }
      const cambios = [];
      for (const k of ['x', 'y', 'w', 'h']) if (Math.abs(x[k] - y[k]) > TOL) cambios.push(`${k} ${x[k]}→${y[k]}`);
      for (const k of ['v', 'fs', 'fw', 'co', 'ff', 'ta']) if (x[k] !== y[k]) cambios.push(`${k} ${x[k]}→${y[k]}`);
      if (Math.abs(x.o - y.o) > 0.02) cambios.push(`opacidad ${x.o}→${y.o}`);
      if (!cambios.length) continue;
      const reg = { ruta, ancho, tipo, que: `<${x.t}> [${x.d}] «${x.s}»: ${cambios.join(', ')}` };
      if (aprobadas.includes(`${ruta}|${x.d}`) || aprobadas.includes(`*|${x.d}`)) avisos.push(reg); else { fallos.push(reg); dif++; }
      if (dif > 60) break;
    }
    resumen.push(`${ruta} @${ancho}: ${ea.length} elementos, ${dif} diferencias`);
  }
  await ctx.close();
}
await navegador.close();

if (GUARDAR) { fs.mkdirSync(path.dirname(path.resolve(GUARDAR)), { recursive: true }); fs.writeFileSync(path.resolve(GUARDAR), JSON.stringify(medidaNueva)); }

const porRuta = {};
for (const f of fallos) { const k = `${f.ruta} @${f.ancho} (${f.tipo})`; (porRuta[k] ||= []).push(f.que); }
const lineas = [
  `# Geometria — ${previa ? 'medida aprobada' : 'vieja'} frente a nueva — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, '',
  `Paginas: ${rutas.length} × ${ANCHOS.length} anchos (${ANCHOS.join(' y ')} px). Tolerancia ${TOL} px. FALLOS: ${fallos.length}. Avisos (aprobados): ${avisos.length}.`, '',
  `## FALLOS por pagina (${Object.keys(porRuta).length} paginas)`,
  ...Object.entries(porRuta).flatMap(([k, l]) => [`### ${k} — ${l.length}`, ...l.slice(0, 25).map((x) => '- ' + x), '']),
  `## Avisos (${avisos.length})`, ...avisos.slice(0, 100).map((x) => `- ${x.ruta} @${x.ancho}: ${x.que}`), '',
  '## Paginas medidas', ...resumen.map((x) => '- ' + x),
];
fs.mkdirSync(path.join(RAIZ, 'informes'), { recursive: true });
fs.writeFileSync(path.join(RAIZ, 'informes', 'geometria.md'), lineas.join('\n') + '\n');
console.log(`geometria: ${rutas.length} paginas × ${ANCHOS.length} anchos; FALLOS ${fallos.length} en ${Object.keys(porRuta).length} paginas; avisos ${avisos.length} -> informes/geometria.md`);
for (const [k, l] of Object.entries(porRuta).slice(0, 8)) console.log(`  ${k}: ${l.length} — ${l[0].slice(0, 170)}`);
process.exit(fallos.length ? 1 : 0);
