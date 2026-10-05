/**
 * analizar-imagenes.mjs — mide las fotos que usa el contenido y escribe
 * src/data/imagenes.json: { "/ruta.jpg": { ancho, alto, blanco } }.
 *
 *   node scripts/analizar-imagenes.mjs
 *
 * "blanco" = la foto es un producto sobre fondo blanco (un contenedor
 * recortado, la portada de un catalogo): se decide mirando el borde de la
 * imagen. Esas fotos no se recortan (object-fit: contain), las demas si.
 * El renderizador (src/utils/render.js) lee este fichero para marcar cada
 * tarjeta; si falta, todo se pinta como foto normal.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const RAIZ = path.resolve('.');
const PUBLICO = path.join(RAIZ, 'public');
const PAGINAS = path.join(RAIZ, 'src', 'content', 'pages');
const SALIDA = path.join(RAIZ, 'src', 'data', 'imagenes.json');

const rutas = new Set();
const anotar = (u) => { if (u && (u.startsWith('/wp-content/') || u.startsWith('/img/'))) rutas.add(u.split('?')[0]); };
const recorrer = (b) => {
  if (!b) return;
  if (b.t === 'seccion') { anotar(b.fondo?.imagen); (b.columnas || []).forEach((c) => { anotar(c.fondo?.imagen); (c.elementos || []).forEach(recorrer); }); return; }
  if (b.t === 'imagen') anotar(b.src);
  if (b.t === 'galeria') { (b.imagenes || []).forEach(anotar); (b.fotos || []).forEach((f) => { anotar(f.src); anotar(f.miniatura); }); }
  if (b.t === 'texto') for (const m of String(b.html || '').matchAll(/<img\b[^>]*\ssrc="([^"]+)"/gi)) anotar(m[1]);
  if (b.fondo?.imagen) anotar(b.fondo.imagen);
};
for (const f of fs.readdirSync(PAGINAS).filter((f) => f.endsWith('.json'))) {
  const p = JSON.parse(fs.readFileSync(path.join(PAGINAS, f), 'utf8'));
  (p.bloques || []).forEach(recorrer);
  anotar(p.hero?.src);
}
// las fotos de la rejilla de servicios (src/data/servicios.json)
const SERVICIOS = path.join(RAIZ, 'src', 'data', 'servicios.json');
if (fs.existsSync(SERVICIOS)) for (const t of JSON.parse(fs.readFileSync(SERVICIOS, 'utf8')).tarjetas) anotar(t.foto);

const previo = fs.existsSync(SALIDA) ? JSON.parse(fs.readFileSync(SALIDA, 'utf8')) : {};
const salida = {};
let medidas = 0, faltan = 0;

for (const ruta of [...rutas].sort()) {
  const fichero = path.join(PUBLICO, decodeURIComponent(ruta));
  if (!fs.existsSync(fichero)) { faltan++; continue; }
  const mtime = fs.statSync(fichero).mtimeMs;
  if (previo[ruta] && previo[ruta].mtime === mtime) { salida[ruta] = previo[ruta]; continue; }
  try {
    const img = sharp(fichero);
    const meta = await img.metadata();
    const ancho = meta.width || 0, alto = meta.height || 0;
    // borde: una franja de 3 px por cada lado, reducida a escala de grises
    const { data, info } = await img.clone().removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
    const w = info.width, h = info.height, g = 3;
    let suma = 0, n = 0, oscuros = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (y >= g && y < h - g && x >= g && x < w - g) continue;
      const v = data[y * w + x]; suma += v; n++; if (v < 230) oscuros++;
    }
    const media = n ? suma / n : 0;
    const blanco = media > 242 && oscuros / n < 0.04;
    salida[ruta] = { ancho, alto, blanco, mtime };
    medidas++;
  } catch (e) {
    console.warn(`no se pudo leer ${ruta}: ${e.message}`);
  }
}

fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
fs.writeFileSync(SALIDA, JSON.stringify(salida, null, 1));
const blancas = Object.values(salida).filter((v) => v.blanco).length;
console.log(`imagenes referenciadas: ${rutas.size} · medidas ahora: ${medidas} · en cache: ${Object.keys(salida).length - medidas} · faltan en public/: ${faltan} · con fondo blanco: ${blancas}`);
console.log(`-> ${path.relative(RAIZ, SALIDA)}`);
