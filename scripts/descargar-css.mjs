/**
 * descargar-css.mjs — baja las hojas de estilo REALES de la web en vivo.
 *
 *   node scripts/descargar-css.mjs
 *
 * Por que hace falta: Elementor escribe una hoja de estilo por pagina en
 * /wp-content/uploads/elementor/css/post-ID.css con los valores exactos de
 * esa pagina. Con las 263 no hay que reconstruir el diseno a mano: se usa el
 * que ya existe.
 *
 * Tambien baja las hojas compartidas (el tema, el kit, los widgets) y las
 * fuentes y los iconos que esas hojas referencian.
 *
 * Deja todo en  css-original/  y no toca nada mas.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://casascontenedores.es';
const DESTINO = path.join(RAIZ, 'css-original');
const HILOS = 4;
const UA = { 'User-Agent': 'Mozilla/5.0 (migracion casascontenedores.es a Astro)' };

// hojas compartidas: las mismas que carga cualquier pagina del sitio
const COMPARTIDAS = [
  '/wp-content/uploads/elementor/css/post-13.css',            // el "kit" de Elementor
  '/wp-content/plugins/elementor/assets/css/frontend.min.css',
  '/wp-content/plugins/elementor/assets/css/widget-image.min.css',
  '/wp-content/plugins/elementor/assets/css/widget-spacer.min.css',
  '/wp-content/plugins/elementor/assets/css/widget-heading.min.css',
  '/wp-content/plugins/elementor/assets/css/widget-divider.min.css',
  '/wp-content/plugins/elementor/assets/css/widget-google_maps.min.css',
  '/wp-content/plugins/elementor/assets/lib/eicons/css/elementor-icons.min.css',
  '/wp-content/themes/oceanwp/assets/css/style.min.css',
  '/wp-content/plugins/contact-form-7/includes/css/styles.css',
];

function paginas() {
  const dir = path.join(RAIZ, 'src', 'content', 'pages');
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
    .filter((p) => p.postId)
    .map((p) => ({ id: p.postId, ruta: p.ruta }));
}

async function bajar(ruta, destino) {
  if (fs.existsSync(destino) && fs.statSync(destino).size > 0) return 'ya';
  for (let intento = 0; intento < 3; intento++) {
    try {
      const r = await fetch(BASE + ruta, { headers: UA, signal: AbortSignal.timeout(30000) });
      if (r.status === 404) return '404';
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const texto = await r.text();
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.writeFileSync(destino, texto);
      return 'ok';
    } catch {
      await new Promise((r) => setTimeout(r, 1200 * (intento + 1)));
    }
  }
  return 'error';
}

fs.mkdirSync(DESTINO, { recursive: true });

const lista = [];
for (const ruta of COMPARTIDAS) {
  lista.push([ruta, path.join(DESTINO, 'comunes', path.basename(ruta))]);
}
for (const { id } of paginas()) {
  lista.push([`/wp-content/uploads/elementor/css/post-${id}.css`,
    path.join(DESTINO, 'paginas', `post-${id}.css`)]);
}

console.log(`hojas a bajar: ${lista.length} (${COMPARTIDAS.length} comunes + ${lista.length - COMPARTIDAS.length} de pagina)`);

const cuenta = {};
let hecho = 0;
const cola = [...lista];
await Promise.all(Array.from({ length: HILOS }, async () => {
  while (cola.length) {
    const [ruta, destino] = cola.pop();
    const res = await bajar(ruta, destino);
    cuenta[res] = (cuenta[res] || 0) + 1;
    if (res !== 'ok' && res !== 'ya') console.log(`  ${res}  ${ruta}`);
    if (++hecho % 50 === 0) console.log(`   ${hecho}/${lista.length}`);
    await new Promise((r) => setTimeout(r, 120));
  }
}));

console.log('\nRESULTADO:', cuenta);

// las hojas referencian fuentes e iconos: se bajan tambien
const refs = new Set();
(function recorrer(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { recorrer(p); continue; }
    const css = fs.readFileSync(p, 'utf8');
    for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
      let u = m[1].trim();
      if (u.startsWith('data:')) continue;
      if (u.startsWith('http') && !u.includes('casascontenedores.es')) continue;
      u = u.replace(BASE, '').split('?')[0].split('#')[0];
      if (u.startsWith('//')) continue;
      if (!u.startsWith('/')) {
        const carpeta = path.dirname(p).includes('comunes') ? '/wp-content/themes/oceanwp/assets/css/' : '/wp-content/uploads/elementor/css/';
        u = new URL(u, 'https://x' + carpeta).pathname;
      }
      refs.add(u);
    }
  }
})(DESTINO);

console.log(`\nfuentes e iconos referenciados: ${refs.size}`);
const cuenta2 = {};
for (const u of refs) {
  const res = await bajar(u, path.join(RAIZ, 'public', u.replace(/^\//, '')));
  cuenta2[res] = (cuenta2[res] || 0) + 1;
}
console.log('RESULTADO:', cuenta2);
console.log(`\nguardado en ${DESTINO} (hojas) y public/ (fuentes e iconos)`);
