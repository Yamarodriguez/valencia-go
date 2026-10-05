/**
 * Descarga las 263 paginas de la web en vivo y guarda SOLO sus encabezados
 * (h1, h2, h3) y el texto visible en un unico fichero JSON.
 *
 * Sirve para comparar encabezado a encabezado la web nueva con la vieja sin
 * tener que mover 263 ficheros HTML.
 *
 *     node scripts/descargar-estructura.mjs
 *
 * Genera  estructura-viva.json  en la raiz del proyecto (unos pocos MB).
 * Es idempotente: si el fichero ya existe, solo pide las paginas que falten.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://casascontenedores.es';
const DESTINO = path.join(RAIZ, 'estructura-viva.json');
// El servidor de WordPress devuelve HTTP 500 cuando se le piden varias paginas
// a la vez: se va despacio y con esperas crecientes.
const HILOS = Number(process.argv[process.argv.indexOf('--hilos') + 1]) || 2;
const ESPERA = 400;

function rutas() {
  const dir = path.join(RAIZ, 'src', 'content', 'pages');
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).ruta)
    .sort();
}

const quitarEtiquetas = (h) =>
  h.replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;|&#039;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function analizar(html) {
  // el contenido util va dentro de <main> o, si no lo hay, del <body>
  const cuerpo =
    (html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i) ||
      html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i) || [null, html])[1];

  const encabezados = [];
  for (const m of cuerpo.matchAll(/<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const texto = quitarEtiquetas(m[2]);
    if (texto) encabezados.push({ nivel: m[1].toLowerCase(), texto });
  }

  const titulo = quitarEtiquetas((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1]);
  const descripcion = (html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || [, ''])[1];
  const canonical = (html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i) || [, ''])[1];
  const imagenes = [...cuerpo.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)].map((m) => m[1]);
  const enlaces = [...cuerpo.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)].map((m) => m[1]);

  // El H1 del tema (la banda de titulo de OceanWP) vive FUERA de <main>,
  // asi que se busca en el documento entero.
  const h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map((m) => quitarEtiquetas(m[1]))
    .filter(Boolean);

  return {
    titulo,
    descripcion,
    canonical,
    h1,
    encabezados,
    numImagenes: imagenes.length,
    numEnlaces: enlaces.length,
    palabras: quitarEtiquetas(cuerpo).split(/\s+/).filter(Boolean).length,
  };
}

async function pedir(ruta) {
  for (let intento = 0; intento < 5; intento++) {
    try {
      const r = await fetch(BASE + ruta, {
        headers: { 'User-Agent': 'Mozilla/5.0 (migracion casascontenedores.es a Astro)' },
        signal: AbortSignal.timeout(45000),
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const html = await r.text();
      if (html.length < 5000) throw new Error('respuesta demasiado corta');
      return analizar(html);
    } catch (e) {
      if (intento === 4) return { error: String(e.message || e) };
      // espera creciente: 2s, 5s, 10s, 20s
      await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, intento)));
    }
  }
}

const previo = fs.existsSync(DESTINO) ? JSON.parse(fs.readFileSync(DESTINO, 'utf8')) : {};
const todas = rutas();
const faltan = todas.filter((r) => !previo[r] || previo[r].error);

console.log(`paginas: ${todas.length} | ya guardadas: ${todas.length - faltan.length} | por pedir: ${faltan.length}`);

let hecho = 0;
const cola = [...faltan];
await Promise.all(
  Array.from({ length: HILOS }, async () => {
    while (cola.length) {
      const ruta = cola.pop();
      previo[ruta] = await pedir(ruta);
      await new Promise((r) => setTimeout(r, ESPERA));
      if (++hecho % 25 === 0) {
        console.log(`   ${hecho}/${faltan.length}`);
        fs.writeFileSync(DESTINO, JSON.stringify(previo));
      }
    }
  })
);

fs.writeFileSync(DESTINO, JSON.stringify(previo));
const fallos = Object.entries(previo).filter(([, v]) => v.error);
console.log(`\nguardado ${DESTINO}`);
console.log(`paginas leidas: ${Object.keys(previo).length - fallos.length} | con error: ${fallos.length}`);
fallos.slice(0, 10).forEach(([r, v]) => console.log('   ', r, v.error));
