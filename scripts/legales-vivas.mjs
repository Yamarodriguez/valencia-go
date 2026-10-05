/**
 * legales-vivas.mjs — saca el texto de las paginas legales de la web EN VIVO
 * (el export las trae vacias o con un shortcode) y lo guarda en
 * legales-vivos.json, que si sube a Git.
 *
 *   node scripts/legales-vivas.mjs
 *
 * Lee el HTML ya bajado en referencia/<ruta>/index.html de cada legal del menu
 * `menu-legales` (src/data/menus.json), se queda con el bloque de contenido
 * de Elementor (data-elementor-type="wp-page") y guarda el HTML y el texto.
 * Reglas: nunca sobrescribe un texto bueno con uno vacio; FALLA (codigo 1) si
 * alguna legal tiene menos de MINIMO caracteres de texto o no esta bajada.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('.');
const DESTINO = path.join(RAIZ, 'legales-vivos.json');
const MINIMO = 800;
const site = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', 'site.json'), 'utf8'));
const menus = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', 'menus.json'), 'utf8'));
const legales = (menus['menu-legales'] || []).map((e) => e.url.replace(site.dominio, '')).filter((u) => u.startsWith('/'));
if (!legales.length) { console.error('no hay menu-legales en src/data/menus.json'); process.exit(1); }

const previo = fs.existsSync(DESTINO) ? JSON.parse(fs.readFileSync(DESTINO, 'utf8')) : {};
const plano = (h) => h.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const salida = { ...previo };
const malas = [];
for (const ruta of legales) {
  const f = path.join(RAIZ, 'referencia', ruta, 'index.html');
  if (!fs.existsSync(f)) { malas.push(`${ruta}: no esta bajada en referencia/`); continue; }
  const html = fs.readFileSync(f, 'utf8');
  const ini = html.search(/<div[^>]+data-elementor-type="wp-page"/);
  let bloque = '';
  if (ini >= 0) {
    // hasta el cierre del bloque: se cuenta la profundidad de <div>
    let prof = 0, i = ini;
    const rx = /<\/?div\b[^>]*>/g; rx.lastIndex = ini;
    for (let m; (m = rx.exec(html));) {
      prof += m[0].startsWith('</') ? -1 : 1;
      if (prof === 0) { i = m.index + m[0].length; break; }
    }
    bloque = html.slice(ini, i);
  }
  const texto = plano(bloque);
  const titulo = plano((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [, ''])[1]);
  if (texto.length < MINIMO) {
    malas.push(`${ruta}: ${texto.length} caracteres (minimo ${MINIMO})` + (previo[ruta]?.texto?.length >= MINIMO ? ' — se conserva el anterior' : ''));
    continue;
  }
  salida[ruta] = { titulo, html: bloque, texto, caracteres: texto.length, fecha: new Date().toISOString().slice(0, 10) };
}
fs.writeFileSync(DESTINO, JSON.stringify(salida, null, 1));
for (const r of legales) console.log(`  ${r}: ${salida[r] ? salida[r].caracteres + ' caracteres' : 'FALTA'}`);
for (const m of malas) console.log('  FALLO ' + m);
console.log(`legales-vivos.json: ${Object.keys(salida).length} legales`);
process.exit(malas.length ? 1 : 0);
