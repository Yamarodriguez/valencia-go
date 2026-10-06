/**
 * enlaces-internos.mjs — lista los enlaces de la web nueva que van a una
 * direccion de este dominio que NO existe como pagina en la copia estatica.
 *
 *   node scripts/enlaces-internos.mjs
 *
 * Sirve para saber que paginas de WordPress faltan por bajar, que enlaces del
 * original iban a direcciones que ya redirigian o daban 404, y que paginas eran
 * dinamicas (carrito). No cambia nada: solo lee dist/.
 *
 * Se reconocen solos, y salen como "conocidos":
 *   - los que redirige src/data/redirecciones.json (public/_redirects);
 *   - los enlaces rotos del original (src/data/fallos-original.json: "enlaces" y "404");
 *   - los patrones de src/data/enlaces-conocidos.json (carrito de WooCommerce).
 * El resto son "sin decidir": se le pregunta a la web vieja con
 * scripts/enlaces-estado.mjs y se resuelven con scripts/enlaces-resolver.mjs.
 *
 * Informe en informes/enlaces-internos.md. Sale con 1 si queda alguno sin decidir.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('.');
const DIST = path.join(RAIZ, 'dist');
const leer = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
const indice = leer(path.join(RAIZ, 'src', 'content', 'paginas', 'indice.json'), []);
const patrones = leer(path.join(RAIZ, 'src', 'data', 'enlaces-conocidos.json'), { patrones: [] }).patrones;
const red = leer(path.join(RAIZ, 'src', 'data', 'redirecciones.json'), { lista: [] }).lista;
const fo = leer(path.join(RAIZ, 'src', 'data', 'fallos-original.json'), {});
const sinBarra = (r) => (r.length > 1 ? r.replace(/\/$/, '') : r);
const redirigen = new Set(red.map((x) => sinBarra(x.de)));
const rotos404 = new Set([...(fo.enlaces || []), ...(fo['404'] || [])].map((x) => sinBarra(typeof x === 'string' ? x : x.ruta)));

const existe = (camino) => {
  let c = camino; try { c = decodeURIComponent(c); } catch {}
  const f = path.join(DIST, c);
  return fs.existsSync(f) && (fs.statSync(f).isFile() || fs.existsSync(path.join(f, 'index.html')));
};

const destinos = new Map(); // destino -> {n, paginas:Set, texto}
for (const p of indice) {
  const f = path.join(DIST, ...p.ruta.split('/').filter(Boolean), 'index.html');
  if (!fs.existsSync(f)) continue;
  const html = fs.readFileSync(f, 'utf8').replace(/<(script|style|template)\b[\s\S]*?<\/\1>/gi, ' ');
  for (const m of html.matchAll(/<a\b[^>]*?\shref=(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]{0,80}?)(?=<\/a>|<)/gi)) {
    const href = (m[1] ?? m[2]).replace(/&amp;|&#0?38;/g, '&').trim();
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    const [camino, consulta = ''] = href.split('#')[0].split('?');
    if (!consulta && existe(camino)) continue;
    if (consulta && existe(camino) && !/add-to-cart|(^|&)s=|wc-ajax|(^|&)p=|page_id=/.test(consulta)) continue;
    const clave = consulta ? `${camino}?${consulta}`.replace(/=\d+/g, '=N') : camino;
    if (!destinos.has(clave)) destinos.set(clave, { n: 0, paginas: new Set(), texto: (m[3] || '').replace(/\s+/g, ' ').trim().slice(0, 40) });
    const r = destinos.get(clave); r.n++; r.paginas.add(p.ruta);
  }
}

const grupos = new Map();
const sinDecidir = [];
const meter = (nombre, que, par) => { if (!grupos.has(nombre)) grupos.set(nombre, { que, lista: [] }); grupos.get(nombre).lista.push(par); };
for (const par of destinos) {
  const [clave] = par;
  const camino = sinBarra(clave.split('?')[0]);
  const pat = patrones.find((k) => new RegExp(k.patron).test(clave));
  if (pat) meter(pat.nombre, pat.que, par);
  else if (!clave.includes('?') && redirigen.has(camino)) meter('redirigen (public/_redirects)', 'la web vieja ya redirigia esta direccion; la copia hace lo mismo', par);
  else if (!clave.includes('?') && rotos404.has(camino)) meter('rotos en el original', 'daban 404 tambien en la web vieja; se copian tal cual y decide el propietario', par);
  else sinDecidir.push(par);
}
const fila = ([clave, r]) => `- \`${clave}\` — ${r.n} enlaces en ${r.paginas.size} paginas (p. ej. ${[...r.paginas][0]}${r.texto ? `, «${r.texto}»` : ''})`;
const ordenar = (l) => l.sort((a, b) => b[1].paginas.size - a[1].paginas.size);
const lineas = [
  `# Enlaces internos que no existen como pagina en la copia — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, '',
  `Destinos distintos: ${destinos.size}. Sin decidir: ${sinDecidir.length}.`, '',
  `## Sin decidir (${sinDecidir.length})`, ...ordenar(sinDecidir).map(fila), '',
  ...[...grupos].flatMap(([nombre, g]) => [`## Conocidos: ${nombre} (${g.lista.length})`, g.que, '', ...ordenar(g.lista).map(fila), '']),
];
fs.mkdirSync(path.join(RAIZ, 'informes'), { recursive: true });
fs.writeFileSync(path.join(RAIZ, 'informes', 'enlaces-internos.md'), lineas.join('\n') + '\n');
console.log(`enlaces internos: ${destinos.size} destinos que no son pagina en la copia; ${[...grupos].map(([n, g]) => `${g.lista.length} ${n}`).join('; ')}; SIN DECIDIR ${sinDecidir.length} -> informes/enlaces-internos.md`);
for (const x of ordenar(sinDecidir).slice(0, 20)) console.log('  ' + fila(x).slice(0, 190));
process.exit(sinDecidir.length ? 1 : 0);
