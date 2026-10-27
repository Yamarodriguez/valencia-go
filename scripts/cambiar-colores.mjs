/**
 * cambiar-colores.mjs — cambia los colores de la marca vieja por los de la
 * nueva (src/data/colores.json) allí donde Elementor los dejó escritos a
 * mano: las hojas de public/wp-content/uploads/elementor/css/ (incluida la
 * del kit, post-67.css, que define las variables globales) y los estilos en
 * línea de las páginas (style="…" y <style>). No toca el texto visible.
 *
 *   node scripts/cambiar-colores.mjs [--seco]
 *
 * Después hay que regenerar las hojas reunidas (npm run hojas) si se usan.
 */
import fs from 'node:fs';
import path from 'node:path';

const SECO = process.argv.includes('--seco');
const RAIZ = path.resolve('.');
const mapa = Object.entries(JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', 'colores.json'), 'utf8'))).filter(([k]) => k.startsWith('#'));
const re = new RegExp('(' + mapa.map(([k]) => k.slice(1)).join('|') + ')(?=[0-9a-f]{2}\\b|\\b)', 'gi');
const nuevoDe = new Map(mapa.map(([k, v]) => [k.slice(1).toLowerCase(), v.slice(1)]));

const CSS = path.join(RAIZ, 'public', 'wp-content', 'uploads', 'elementor', 'css');
const PAGINAS = path.join(RAIZ, 'src', 'content', 'paginas');
const ficheros = [
  ...fs.readdirSync(CSS).filter((f) => f.endsWith('.css')).map((f) => path.join(CSS, f)),
  ...fs.readdirSync(PAGINAS).filter((f) => f.endsWith('.html')).map((f) => path.join(PAGINAS, f)),
];
let tocados = 0; const veces = new Map();
for (const f of ficheros) {
  const antes = fs.readFileSync(f, 'utf8');
  const despues = antes.replace(new RegExp('#' + re.source, 'gi'), (m, hex) => {
    const n = nuevoDe.get(hex.toLowerCase());
    veces.set(hex.toUpperCase(), (veces.get(hex.toUpperCase()) || 0) + 1);
    return '#' + (hex === hex.toUpperCase() ? n.toUpperCase() : n.toLowerCase());
  });
  if (despues !== antes) { tocados++; if (!SECO) fs.writeFileSync(f, despues); }
}
console.log(`${SECO ? 'EN SECO. ' : ''}Ficheros con cambios: ${tocados} de ${ficheros.length}.`);
for (const [k, n] of veces) console.log(`  #${k} → ${mapa.find(([a]) => a.toUpperCase() === '#' + k)[1]}: ${n} veces`);
