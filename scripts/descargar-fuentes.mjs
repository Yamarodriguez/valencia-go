/**
 * Descarga a public/ los ficheros de LETRA y de ICONOS que piden las hojas de
 * estilo originales: las tipografias (Roboto, Roboto Slab, Roboto Condensed,
 * Abel, Satisfy, Ubuntu), los iconos de Font Awesome, los de Elementor y los
 * Simple Line Icons.
 *
 * Se ejecuta en TU PC, que si tiene salida a casascontenedores.es:
 *
 *     node scripts/descargar-fuentes.mjs            (descarga)
 *     node scripts/descargar-fuentes.mjs --ensayo   (solo cuenta, no baja nada)
 *
 * Antes hay que haber preparado las hojas:  npm run css
 *
 * Por que hace falta: sin estos ficheros el navegador no tiene las letras del
 * sitio y las sustituye por las del sistema. Eso cambia el ancho de cada
 * palabra, y con ello se descolocan botones y titulos (un titulo que ocupaba
 * una linea pasa a ocupar dos). Los iconos, directamente, salen como cuadrados
 * vacios. No es un detalle de adorno: sin esto la web NO puede quedar igual.
 *
 * Es idempotente: lo que ya esta descargado no se vuelve a pedir, asi que
 * puedes cortarlo con Ctrl+C y relanzarlo las veces que haga falta.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLICO = path.join(RAIZ, 'public');
const CSS = path.join(PUBLICO, 'css');
const BASE = 'https://casascontenedores.es';

const ensayo = process.argv.includes('--ensayo');
const HILOS = Number(process.argv[process.argv.indexOf('--hilos') + 1]) || 8;

if (!fs.existsSync(CSS)) {
  console.error('falta public/css — ejecuta antes:  npm run css');
  process.exit(1);
}

/**
 * Saca de las hojas ya preparadas todas las direcciones de ficheros de letra.
 * Las direcciones relativas se resuelven desde /css/, que es donde vive la
 * hoja: ../webfonts/x.woff2 dentro de /css/comunes.css es /webfonts/x.woff2.
 */
function rutasReferenciadas() {
  const rutas = new Set();
  for (const f of fs.readdirSync(CSS)) {
    if (!f.endsWith('.css')) continue;
    const css = fs.readFileSync(path.join(CSS, f), 'utf8');
    for (const m of css.matchAll(/url\(\s*["']?([^"')?#]+)/g)) {
      const u = m[1].trim();
      if (u.startsWith('data:') || u.startsWith('http')) continue;
      if (!/\.(woff2?|ttf|eot|svg|otf)$/i.test(u)) continue;
      rutas.add(u.startsWith('/') ? u : path.posix.normalize('/css/' + u));
    }
  }
  return [...rutas].sort();
}

const todas = rutasReferenciadas();
const faltan = todas.filter((r) => !fs.existsSync(path.join(PUBLICO, r.replace(/^\//, ''))));

console.log(`ficheros de letra e iconos referenciados: ${todas.length}`);
console.log(`ya estan en public/:                      ${todas.length - faltan.length}`);
console.log(`por descargar:                            ${faltan.length}\n`);

if (ensayo || !faltan.length) {
  if (!faltan.length) console.log('No falta ninguno: nada que hacer.');
  process.exit(0);
}

const fallos = [];
let hechos = 0;

async function bajar(ruta) {
  const destino = path.join(PUBLICO, ruta.replace(/^\//, ''));
  try {
    const r = await fetch(BASE + ruta, { redirect: 'follow' });
    if (!r.ok) { fallos.push(`${r.status} ${ruta}`); return; }
    const datos = Buffer.from(await r.arrayBuffer());
    // una respuesta diminuta suele ser una pagina de error, no una letra
    if (datos.length < 200) { fallos.push(`vacio ${ruta}`); return; }
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, datos);
  } catch (e) {
    fallos.push(`${e.code || e.message} ${ruta}`);
  } finally {
    hechos++;
    if (hechos % 10 === 0 || hechos === faltan.length) {
      process.stdout.write(`\r  ${hechos}/${faltan.length}`);
    }
  }
}

const cola = [...faltan];
await Promise.all(Array.from({ length: HILOS }, async () => {
  while (cola.length) await bajar(cola.shift());
}));

console.log('\n');
if (fallos.length) {
  fs.writeFileSync(path.join(RAIZ, 'fuentes-fallidas.txt'), fallos.join('\n') + '\n');
  console.log(`fallos: ${fallos.length} (anotados en fuentes-fallidas.txt)`);
  fallos.slice(0, 10).forEach((l) => console.log('   ' + l));
} else {
  console.log('Descargadas todas. Ahora:  npm run todo');
}
