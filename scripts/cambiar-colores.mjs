/**
 * cambiar-colores.mjs — cambia los colores de una paleta por los de otra
 * (src/data/colores.json) allí donde están escritos a mano: las hojas de
 * public/wp-content/uploads/elementor/css/ (incluida la del kit, post-67.css,
 * que define las variables globales), la hoja del plugin de atracciones y los
 * estilos en línea de las páginas (style="…" y <style>). No toca el texto visible.
 *
 *   node scripts/cambiar-colores.mjs [--seco]
 *
 * Claves admitidas en colores.json: "#RRGGBB" (también casa con #RRGGBBAA, se
 * conserva la transparencia) y "rgb(r,g,b)" (casa con rgb() y rgba(), se
 * conserva la transparencia). Después hay que regenerar las hojas reunidas
 * (npm run hojas).
 */
import fs from 'node:fs';
import path from 'node:path';

const SECO = process.argv.includes('--seco');
const RAIZ = path.resolve('.');
const datos = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', 'colores.json'), 'utf8'));
const rgbDe = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

const hex = new Map();  // 'f28c28' → '1F6F50'
const rgb = [];         // { re, nuevo:[r,g,b], clave }
for (const [k, v] of Object.entries(datos)) {
  if (k.startsWith('#')) hex.set(k.slice(1).toLowerCase(), v.slice(1));
  else if (k.startsWith('rgb(')) {
    const [r, g, b] = k.match(/\d+/g).map(Number);
    rgb.push({ clave: k, re: new RegExp(`rgb(a?)\\(\\s*${r}\\s*,\\s*${g}\\s*,\\s*${b}\\s*([,)])`, 'gi'), nuevo: rgbDe(v) });
  }
}
const reHex = new RegExp('#(' + [...hex.keys()].join('|') + ')(?=[0-9a-f]{2}\\b|\\b)', 'gi');

const lista = (dir, ext) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(ext)).map((f) => path.join(dir, f)) : []);
// los iconos dibujados de la web (icono-*.svg en uploads), que llevan el color dentro
const iconos = [];
const buscarIconos = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) buscarIconos(p); else if (/^icono-.*\.svg$/i.test(e.name)) iconos.push(p); } };
buscarIconos(path.join(RAIZ, 'public', 'wp-content', 'uploads'));
const ficheros = [
  ...iconos,
  ...lista(path.join(RAIZ, 'public', 'wp-content', 'uploads', 'elementor', 'css'), '.css'),
  ...lista(path.join(RAIZ, 'public', 'wp-content', 'plugins', 'thegem-atracciones', 'assets', 'css'), '.css'),
  ...lista(path.join(RAIZ, 'src', 'content', 'paginas'), '.html'),
];
let tocados = 0;
const veces = new Map();
const contar = (k) => veces.set(k, (veces.get(k) || 0) + 1);
for (const f of ficheros) {
  const antes = fs.readFileSync(f, 'utf8');
  let despues = antes.replace(reHex, (m, h) => {
    const n = hex.get(h.toLowerCase());
    contar('#' + h.toUpperCase());
    return '#' + (h === h.toUpperCase() ? n.toUpperCase() : n.toLowerCase());
  });
  for (const c of rgb) despues = despues.replace(c.re, (m, a, fin) => { contar(c.clave); return `rgb${a}(${c.nuevo.join(',')}${fin}`; });
  if (despues !== antes) { tocados++; if (!SECO) fs.writeFileSync(f, despues); }
}
console.log(`${SECO ? 'EN SECO. ' : ''}Ficheros con cambios: ${tocados} de ${ficheros.length}.`);
for (const [k, n] of [...veces.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${k} → ${datos[k] || datos['#' + k.slice(1).toUpperCase()] || datos[Object.keys(datos).find((x) => x.toLowerCase() === k.toLowerCase())]}: ${n} veces`);
