/**
 * enlaces-resolver.mjs — convierte lo que dijo la web vieja de cada enlace
 * interno que no existe en la copia (informes/enlaces-estado.json, lo escribe
 * scripts/enlaces-estado.mjs) en datos del proyecto:
 *
 *   200      -> informes/rutas-por-bajar.txt   (paginas vivas que faltan: se
 *               bajan con  node scripts/bajar-paginas.mjs --lista informes/rutas-por-bajar.txt)
 *   301/302  -> src/data/redirecciones.json    (las mismas redirecciones que
 *               hacia WordPress; scripts/redirecciones.mjs las pasa a public/_redirects)
 *   404      -> src/data/fallos-original.json, lista "enlaces" (enlaces rotos
 *               del original: se copian tal cual y se le ensenan al propietario)
 *
 *   node scripts/enlaces-resolver.mjs
 * No borra nada de lo que ya hubiera en esos ficheros: solo anade.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('.');
const leer = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
const estado = leer(path.join(RAIZ, 'informes', 'enlaces-estado.json'), []);
const fMd = path.join(RAIZ, 'informes', 'enlaces-internos.md');
const paginas = new Map();
if (fs.existsSync(fMd)) {
  for (const m of fs.readFileSync(fMd, 'utf8').matchAll(/^- `([^`]+)` — \d+ enlaces en (\d+) paginas/gm)) paginas.set(m[1], Number(m[2]));
}
const paginasDe = (d) => paginas.get(d) || 0;

const fRed = path.join(RAIZ, 'src', 'data', 'redirecciones.json');
const red = leer(fRed, {
  _nota: 'Redirecciones que YA HACIA la web vieja (WordPress) y que la copia estatica tiene que seguir haciendo para que no se rompa ningun enlace. scripts/redirecciones.mjs las escribe en public/_redirects (Netlify). "origen" dice de donde sale cada una.',
  lista: [],
});
const fFo = path.join(RAIZ, 'src', 'data', 'fallos-original.json');
const fo = leer(fFo, {});
fo.enlaces = fo.enlaces || [];
const yaRed = new Set(red.lista.map((x) => x.de));
const yaRotos = new Set(fo.enlaces.map((x) => x.ruta));
const porBajar = [];
const otros = [];
let nRed = 0, nRotos = 0;
for (const e of estado) {
  const consulta = e.destino.includes('?');
  if (e.estado === 200 && !consulta) porBajar.push(e.destino.endsWith('/') ? e.destino : e.destino + '/');
  else if ((e.estado === 301 || e.estado === 302) && !consulta) {
    if (!yaRed.has(e.destino)) { red.lista.push({ de: e.destino, a: e.a, codigo: e.estado, origen: 'web vieja: enlace interno que ya redirigia', paginas: paginasDe(e.destino) }); nRed++; }
  } else if (e.estado === 404) {
    if (!yaRotos.has(e.destino)) { fo.enlaces.push({ ruta: e.destino, que: `enlace roto del original (404 tambien en la web vieja), en ${paginasDe(e.destino)} paginas`, estado: 'pendiente' }); nRotos++; }
  } else otros.push(e);
}
red.lista.sort((a, b) => a.de.localeCompare(b.de));
fs.writeFileSync(fRed, JSON.stringify(red, null, 1));
fs.writeFileSync(fFo, JSON.stringify(fo, null, 1));
fs.writeFileSync(path.join(RAIZ, 'informes', 'rutas-por-bajar.txt'), [...new Set(porBajar)].join('\n') + '\n');
console.log(`enlaces-resolver: ${porBajar.length} paginas por bajar, ${nRed} redirecciones nuevas (${red.lista.length} en total), ${nRotos} enlaces rotos nuevos (${fo.enlaces.length} en total), otros ${otros.length}`);
for (const o of otros) console.log('  OTRO', o.estado, o.destino, '->', o.a);
