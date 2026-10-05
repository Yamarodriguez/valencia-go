/**
 * Descarga el HTML completo y las hojas de estilo de seis paginas
 * representativas de la web en vivo, para poder reproducir el diseno actual
 * tal cual (colores, tipografias, medidas, maquetacion de cada bloque).
 *
 *     node scripts/descargar-muestra.mjs
 *
 * Deja todo en la carpeta  muestra-viva/  (unos pocos MB).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://casascontenedores.es';
const DESTINO = path.join(RAIZ, 'muestra-viva');

// una pagina de cada tipo
const PAGINAS = [
  ['portada', '/'],
  ['tema-precios', '/precios/'],
  ['tema-modelos', '/modelos/'],
  ['localidad-casas', '/galicia/'],
  ['localidad-maritimos', '/contenedores-maritimos-madrid/'],
  ['producto', '/piscina-contenedor/'],
  ['legal', '/aviso-legal/'],
];

const UA = { 'User-Agent': 'Mozilla/5.0 (migracion casascontenedores.es a Astro)' };

async function texto(url) {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(40000) });
  if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
  return await r.text();
}

fs.mkdirSync(DESTINO, { recursive: true });
fs.mkdirSync(path.join(DESTINO, 'css'), { recursive: true });

const hojas = new Set();

for (const [nombre, ruta] of PAGINAS) {
  try {
    const html = await texto(BASE + ruta);
    fs.writeFileSync(path.join(DESTINO, nombre + '.html'), html);
    console.log('ok  ' + ruta + '  (' + Math.round(html.length / 1024) + ' KB)');
    for (const m of html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)) {
      const href = (m[0].match(/href=["']([^"']+)["']/i) || [, ''])[1];
      if (href) hojas.add(new URL(href, BASE + ruta).href);
    }
  } catch (e) {
    console.log('ERROR ' + ruta + ': ' + e.message);
  }
}

console.log('\nhojas de estilo encontradas: ' + hojas.size);
let n = 0;
for (const url of hojas) {
  try {
    const css = await texto(url);
    const nombre = String(++n).padStart(2, '0') + '-' +
      (url.split('/').pop().split('?')[0] || 'estilo.css');
    fs.writeFileSync(path.join(DESTINO, 'css', nombre), css);
    console.log('   ' + nombre + '  (' + Math.round(css.length / 1024) + ' KB)');
  } catch (e) {
    console.log('   ERROR ' + url + ': ' + e.message);
  }
}

console.log('\nguardado en ' + DESTINO);
