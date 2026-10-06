/**
 * sitemaps.mjs — copia los mapas del sitio de la web vieja y dice que paginas
 * son nuevas o han desaparecido desde la ultima descarga.
 *
 *   node scripts/sitemaps.mjs [--solo-novedades]
 *
 * 1. Baja /sitemap_index.xml y los mapas que enlaza (los de Yoast) y los deja
 *    en public/ con SU MISMO NOMBRE: Google tiene apuntado sitemap_index.xml y
 *    asi lo sigue encontrando despues del cambio de dominio. Solo se quita la
 *    hoja de presentacion (.xsl), que es de WordPress.
 * 2. Baja /robots.txt y lo deja en public/ sin las lineas de WooCommerce y
 *    wp-admin que ya no aplican (se guarda el original en informes/).
 * 3. Compara las direcciones de los mapas con src/content/paginas/indice.json:
 *      nuevas        -> informes/rutas-por-bajar.txt (para bajar-paginas.mjs --lista)
 *      desaparecidas -> informes/novedades.md (hay que mirar si ahora redirigen)
 *
 * Con --solo-novedades no escribe nada en public/.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('.');
const SOLO = process.argv.includes('--solo-novedades');
const site = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', 'site.json'), 'utf8'));
const DOMINIO = site.dominio.replace(/\/$/, '');
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 (migracion a Astro)' };
const espera = (ms) => new Promise((f) => setTimeout(f, ms));
const bajar = async (ruta) => {
  const r = await fetch(DOMINIO + ruta, { headers: UA, signal: AbortSignal.timeout(40000) });
  if (!r.ok) throw new Error(`${ruta}: HTTP ${r.status}`);
  return r.text();
};
const sinHoja = (xml) => xml.replace(/<\?xml-stylesheet[^>]*\?>\s*/i, '');
const locs = (xml) => [...xml.matchAll(/<(?:sitemap|url)>\s*<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

const indiceXml = await bajar('/sitemap_index.xml');
const mapas = locs(indiceXml);
if (!mapas.length) { console.error('sitemap_index.xml no trae mapas'); process.exit(1); }
const ficheros = { 'sitemap_index.xml': sinHoja(indiceXml) };
const vivas = new Map(); // ruta -> lastmod
for (const m of mapas) {
  const nombre = m.replace(DOMINIO, '').replace(/^\//, '');
  await espera(400);
  const xml = await bajar('/' + nombre);
  ficheros[nombre] = sinHoja(xml);
  for (const u of xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g)) vivas.set(u[1].trim().replace(DOMINIO, '') || '/', u[2] || '');
}
await espera(400);
const robotsVivo = await bajar('/robots.txt');

if (!SOLO) {
  for (const [nombre, xml] of Object.entries(ficheros)) fs.writeFileSync(path.join(RAIZ, 'public', nombre), xml);
  // robots.txt: fuera lo que es de WordPress/WooCommerce; se conserva la linea del mapa
  const lineas = robotsVivo.split(/\r?\n/).filter((l) => !/wp-admin|wp-content\/uploads\/(wc-logs|woocommerce_)|add-to-cart|YOAST BLOCK|^# -+$/i.test(l));
  // si al quitar lineas queda un grupo "User-agent" vacio delante de otro, sobra
  const limpio = lineas.join('\n').replace(/\n{3,}/g, '\n\n').replace(/User-agent: \*\n\n(?=User-agent)/g, '').trim() + '\n';
  fs.writeFileSync(path.join(RAIZ, 'public', 'robots.txt'), limpio);
  fs.mkdirSync(path.join(RAIZ, 'informes'), { recursive: true });
  fs.writeFileSync(path.join(RAIZ, 'informes', 'robots-original.txt'), robotsVivo);
}

const fIndice = path.join(RAIZ, 'src', 'content', 'paginas', 'indice.json');
const indice = fs.existsSync(fIndice) ? JSON.parse(fs.readFileSync(fIndice, 'utf8')) : [];
const tenemos = new Set(indice.map((p) => p.ruta));
const nuevas = [...vivas.keys()].filter((r) => !tenemos.has(r)).sort();
const enMapaAntes = fs.existsSync(path.join(RAIZ, 'informes', 'urls-sitemap.txt'))
  ? new Set(fs.readFileSync(path.join(RAIZ, 'informes', 'urls-sitemap.txt'), 'utf8').split(/\r?\n/).filter(Boolean).map((u) => u.replace(DOMINIO, '') || '/'))
  : new Set();
const desaparecidas = [...enMapaAntes].filter((r) => !vivas.has(r)).sort();
fs.writeFileSync(path.join(RAIZ, 'informes', 'urls-sitemap.txt'), [...vivas.keys()].map((r) => DOMINIO + r).join('\n') + '\n');
fs.writeFileSync(path.join(RAIZ, 'informes', 'rutas-por-bajar.txt'), nuevas.join('\n') + (nuevas.length ? '\n' : ''));
const recientes = [...vivas].filter(([, f]) => f).sort((a, b) => b[1].localeCompare(a[1])).slice(0, 15);
fs.writeFileSync(path.join(RAIZ, 'informes', 'novedades.md'), [
  `# Novedades de la web vieja — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, '',
  `Direcciones en los mapas: ${vivas.size}. En la copia: ${tenemos.size}.`, '',
  `## Nuevas en el mapa y que no estan en la copia (${nuevas.length})`, ...nuevas.map((r) => `- ${r} (${vivas.get(r)})`), '',
  `## Estaban en el mapa la ultima vez y ya no (${desaparecidas.length})`, ...desaparecidas.map((r) => '- ' + r), '',
  '## Ultimas modificadas segun el mapa', ...recientes.map(([r, f]) => `- ${f}  ${r}`),
].join('\n') + '\n');
console.log(`sitemaps: ${Object.keys(ficheros).length} mapas${SOLO ? '' : ' y robots.txt copiados a public/'}; ${vivas.size} direcciones; nuevas ${nuevas.length}; desaparecidas del mapa ${desaparecidas.length} -> informes/novedades.md`);
for (const r of nuevas.slice(0, 12)) console.log('  NUEVA ' + r);
for (const r of desaparecidas.slice(0, 12)) console.log('  YA NO ESTA ' + r);
