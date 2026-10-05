/**
 * descargar-legales.mjs — recupera el texto de las paginas legales.
 *
 * WordPress las exporta vacias (el plugin de RGPD las pintaba al vuelo), pero
 * en la web en vivo tienen su texto completo. Esto se lo baja y lo guarda en
 * legales-vivos.json para meterlo en el sitio nuevo tal cual.
 *
 *   node scripts/descargar-legales.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://casascontenedores.es';
const DESTINO = path.join(RAIZ, 'legales-vivos.json');

const RUTAS = [
  '/aviso-legal/',
  '/politica-privacidad/',
  '/politica-de-cookies/',
  '/personalizar-cookies/',
];

const salida = {};

for (const ruta of RUTAS) {
  try {
    const r = await fetch(BASE + ruta, {
      headers: { 'User-Agent': 'Mozilla/5.0 (migracion casascontenedores.es a Astro)' },
      signal: AbortSignal.timeout(45000),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const html = await r.text();
    const limpio = html.replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, '');
    const m = limpio.match(/<div class="entry clr"[^>]*>([\s\S]*?)<\/div>\s*<\/article>/i)
      || limpio.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    salida[ruta] = m ? m[1].trim() : '';
    console.log(`ok  ${ruta}  ${salida[ruta].length} caracteres`);
  } catch (e) {
    salida[ruta] = '';
    console.log(`ERROR ${ruta}: ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 600));
}

fs.writeFileSync(DESTINO, JSON.stringify(salida, null, 1));
console.log('\nguardado ' + DESTINO);
