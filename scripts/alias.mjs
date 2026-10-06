/**
 * alias.mjs — convierte en redireccion las DIRECCIONES ALTERNATIVAS de una
 * misma pagina.
 *
 *   node scripts/alias.mjs [--ensayo]
 *
 * WordPress/WooCommerce sirve un mismo producto en varias direcciones
 * (/excursiones-desde-valencia/x/ y /excursiones/x/), y en todas pone el
 * mismo canonical. Google ya las cuenta como una sola: la del canonical.
 * En la copia estatica, una pagina bajada cuyo canonical apunta a OTRA
 * direccion que existe en la copia se convierte en una redireccion 301 a ese
 * canonical (src/data/redirecciones.json) y se quita de descargas/html y de
 * referencia/. Asi no se duplican paginas ni se siguen sus traducciones sin fin.
 *
 * No se tocan: las paginas de paginacion (/page/N/), aunque su canonical
 * apunte a la primera, ni las que no tienen canonical (las noindex).
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('.');
const ENSAYO = process.argv.includes('--ensayo');
const CRUDA = path.join(RAIZ, 'descargas', 'html');
const REF = path.join(RAIZ, 'referencia');
const site = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', 'site.json'), 'utf8'));
const DOMINIO = site.dominio.replace(/\/$/, '');
const fRed = path.join(RAIZ, 'src', 'data', 'redirecciones.json');
const red = JSON.parse(fs.readFileSync(fRed, 'utf8'));

const paginas = new Map(); // ruta -> canonical (ruta)
const recorrer = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) recorrer(p);
    else if (e.name === 'index.html') {
      const rel = path.relative(CRUDA, dir).replace(/\\/g, '/');
      const ruta = rel ? `/${rel}/` : '/';
      const cabeza = fs.readFileSync(p, 'utf8').slice(0, 80000);
      const m = cabeza.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
      paginas.set(ruta, m ? m[1].replace(DOMINIO, '') : '');
    }
  }
};
recorrer(CRUDA);

const alias = [];
for (const [ruta, canonical] of paginas) {
  if (!canonical || canonical === ruta) continue;
  if (/\/(page|strona|pagina|seite)\/\d+\/$/.test(ruta)) continue;
  if (!paginas.has(canonical) || paginas.get(canonical) !== canonical) continue; // el canonical tiene que ser una pagina de verdad
  alias.push([ruta, canonical]);
}
const ya = new Set(red.lista.map((x) => x.de));
for (const [ruta, canonical] of alias) {
  console.log(`  alias ${ruta} -> ${canonical}`);
  if (ENSAYO) continue;
  if (!ya.has(ruta)) red.lista.push({ de: ruta, a: canonical, codigo: 301, origen: 'direccion alternativa de la misma pagina en la web vieja (alli da 200 con canonical al destino)' });
  for (const base of [CRUDA, REF]) fs.rmSync(path.join(base, ...ruta.split('/').filter(Boolean)), { recursive: true, force: true });
}
if (!ENSAYO) { red.lista.sort((a, b) => a.de.localeCompare(b.de)); fs.writeFileSync(fRed, JSON.stringify(red, null, 1)); }
console.log(`alias: ${alias.length} direcciones alternativas ${ENSAYO ? 'encontradas (ensayo)' : 'pasadas a redireccion'}`);
