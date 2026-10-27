/**
 * comprobar-recursos-nuevos.mjs — tras `npm run build`, comprueba que cada
 * fichero de este dominio que piden las páginas compiladas (fotos, logos,
 * hojas, guiones, fondos) existe en dist/. Sustituye al validador de la copia
 * fiel en la rama empresa-nueva (que ya no se compara con la web vieja).
 *
 *   node scripts/comprobar-recursos-nuevos.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const faltan = new Map(); // ruta → nº de páginas
let paginas = 0, referencias = 0;
const existe = new Map();
const hay = (r) => { if (!existe.has(r)) existe.set(r, fs.existsSync(path.join(DIST, decodeURIComponent(r)))); return existe.get(r); };

function recorrer(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) { recorrer(p); continue; }
    if (!f.name.endsWith('.html')) continue;
    paginas++;
    const html = fs.readFileSync(p, 'utf8');
    const rutas = new Set();
    for (const m of html.matchAll(/(?:src|href|data-src|content|poster)="(\/(?:wp-content|wp-includes|fotos|marca|css|js|fontawesome|rediseno)\/[^"?#\s]+)/g)) rutas.add(m[1]);
    for (const m of html.matchAll(/url\((?:&quot;|["']?)(\/(?:wp-content|fotos|marca)\/[^"')&]+)/g)) rutas.add(m[1]);
    for (const m of html.matchAll(/(?:src|data-)?srcset="([^"]+)"/g)) for (const v of m[1].split(',')) { const r = v.trim().split(/\s+/)[0]; if (r && r.startsWith('/')) rutas.add(r.split('?')[0]); }
    for (const m of html.matchAll(/"url":"((?:\\\/)(?:wp-content|fotos|marca)[^"]*)"/g)) rutas.add(m[1].replace(/\\\//g, '/').split('?')[0]);
    for (const r of rutas) { referencias++; if (!hay(r)) faltan.set(r, (faltan.get(r) || 0) + 1); }
  }
}
recorrer(DIST);

// fondos en las hojas de Elementor y las reunidas
let enCss = 0;
for (const dir of ['wp-content/uploads/elementor/css', 'css', 'rediseno']) {
  const d = path.join(DIST, dir);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.css'))) {
    const t = fs.readFileSync(path.join(d, f), 'utf8');
    for (const m of t.matchAll(/url\(["']?(\/(?:wp-content|fotos|marca)\/[^"')?#]+)/g)) { enCss++; if (!hay(m[1])) faltan.set(m[1], (faltan.get(m[1]) || 0) + 1); }
  }
}
console.log(`Páginas: ${paginas} · referencias: ${referencias} (+${enCss} en hojas) · ficheros distintos: ${existe.size} · FALTAN: ${faltan.size}`);
for (const [r, n] of [...faltan.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(`  ${r}  (${n})`);
process.exit(faltan.size ? 1 : 0);
