/**
 * cambiar-fotos.mjs — sustituye las fotos de la web por las nuevas, con el
 * nombre que propone src/data/fotos.json (inventario-fotos.mjs).
 *
 * Tú dejas las fotos nuevas en fotos-nuevas/ con el nombre nuevo de la lista
 * (vale .jpg, .jpeg, .png o .webp; la extensión da igual):
 *     fotos-nuevas/excursion-al-parque-natural-de-la-albufera-1.jpg
 *
 *   node scripts/cambiar-fotos.mjs --seco   dice cuáles están y cuáles faltan
 *   node scripts/cambiar-fotos.mjs          genera y sustituye las que estén
 *
 * Por cada foto nueva que esté:
 *   - se escribe public/fotos/<nombre>.webp con las MISMAS medidas que la vieja
 *     (así la página no cambia de forma) y, por cada tamaño que la vieja tenía
 *     (-768x512…), el mismo tamaño nuevo, recortando al centro;
 *   - las miniaturas de tarjeta se sacan de la misma foto nueva, a las medidas
 *     de la miniatura vieja;
 *   - en todas las páginas y en las hojas de Elementor, cada referencia a la
 *     vieja (src, data-src, srcset, fondos) pasa a la nueva, y el alt de la
 *     <img> pasa a ser el propuesto (H1, o H1: sección).
 * Las fotos viejas no se borran de public/ (se limpian al final, aparte).
 * Se puede ejecutar varias veces: solo toca lo que aún apunte a la vieja.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const RAIZ = path.resolve('.');
const SECO = process.argv.includes('--seco');
const ENTRADA = path.join(RAIZ, 'fotos-nuevas');
const SALIDA = path.join(RAIZ, 'public', 'fotos');
const PUBLICO = path.join(RAIZ, 'public');
const LISTA = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', 'fotos.json'), 'utf8'));
const CALIDAD = 82;

const escapar = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sinExt = (f) => f.replace(/\.[a-z]+$/i, '');

// fotos nuevas disponibles: nombre sin extensión → fichero
const disponibles = new Map();
if (fs.existsSync(ENTRADA)) for (const f of fs.readdirSync(ENTRADA)) if (/\.(jpe?g|png|webp|avif|tiff?)$/i.test(f)) disponibles.set(sinExt(f).toLowerCase(), path.join(ENTRADA, f));

// qué fuente nueva le toca a cada entrada de la lista
function fuenteDe(vieja, e) {
  if (!e.nuevo) return null;
  const propia = disponibles.get(sinExt(e.nuevo).toLowerCase());
  if (propia) return propia;
  if (e.miniatura) {
    // miniatura: la foto madre, o la primera foto de su página
    if (e.original && LISTA[e.original]?.nuevo) { const m = disponibles.get(sinExt(LISTA[e.original].nuevo).toLowerCase()); if (m) return m; }
    const hermana = Object.values(LISTA).find((x) => x.nuevo && !x.miniatura && x.pagina === e.pagina && disponibles.get(sinExt(x.nuevo).toLowerCase()));
    if (hermana) return disponibles.get(sinExt(hermana.nuevo).toLowerCase());
  }
  return null;
}

const listas = [], faltan = [];
for (const [vieja, e] of Object.entries(LISTA)) {
  if (e.clase !== 'foto' || !e.nuevo) continue;
  const fuente = fuenteDe(vieja, e);
  (fuente ? listas : faltan).push({ vieja, e, fuente });
}

console.log(`${SECO ? 'EN SECO. ' : ''}Fotos de la lista: ${listas.length + faltan.length} · con foto nueva en fotos-nuevas/: ${listas.length} · sin ella: ${faltan.length}`);

// --revertir-huerfanas: una foto que ya está en public/fotos/ pero cuya fuente
// se quitó de fotos-nuevas/ (se descartó por mala) vuelve a la foto vieja:
// se borran sus webp y las páginas vuelven a apuntar a la ruta antigua.
if (process.argv.includes('--revertir-huerfanas')) {
  const huerfanas = faltan.filter((x) => fs.existsSync(path.join(SALIDA, x.e.nuevo)));
  console.log(`Huérfanas (en public/fotos/ sin fuente): ${huerfanas.length}`);
  if (!SECO && huerfanas.length) {
    const PAG = path.join(RAIZ, 'src', 'content', 'paginas');
    const CSSD = path.join(PUBLICO, 'wp-content', 'uploads', 'elementor', 'css');
    const fich = [...fs.readdirSync(PAG).filter((f) => f.endsWith('.html')).map((f) => path.join(PAG, f)), ...fs.readdirSync(CSSD).filter((f) => f.endsWith('.css')).map((f) => path.join(CSSD, f))];
    const mapa = new Map(huerfanas.map((x) => [sinExt(x.e.nuevo), x.vieja]));
    const re = /(?:\\\/|\/)fotos(?:\\\/|\/)([\w-]+?)(-\d+x\d+)?\.webp/g;
    let n = 0;
    for (const f of fich) {
      const antes = fs.readFileSync(f, 'utf8');
      const despues = antes.replace(re, (m, nombre, tam) => {
        const vieja = mapa.get(nombre);
        if (!vieja) return m;
        n++;
        const ruta = tam ? vieja.replace(/(\.[a-z]+)$/i, tam + '$1') : vieja;
        return m.includes('\\/') ? ruta.replace(/\//g, '\\/') : ruta;
      });
      if (despues !== antes) fs.writeFileSync(f, despues);
    }
    for (const x of huerfanas) for (const f of fs.readdirSync(SALIDA)) if (f === x.e.nuevo || f.startsWith(sinExt(x.e.nuevo) + '-')) fs.unlinkSync(path.join(SALIDA, f));
    console.log(`Revertidas ${huerfanas.length} fotos (${n} referencias) a la foto vieja.`);
  }
}
if (SECO) {
  const sinMini = faltan.filter((x) => !x.e.miniatura);
  console.log(`Faltan (sin contar miniaturas, que salen de su foto madre): ${sinMini.length}`);
  for (const x of sinMini.slice(0, 40)) console.log(`  ${sinExt(x.e.nuevo)}  ←  ${x.vieja.replace('/wp-content/uploads/', '')}`);
  if (sinMini.length > 40) console.log(`  … y ${sinMini.length - 40} más (la lista completa está en informes/fotos-inventario.md)`);
  process.exit(0);
}
if (!listas.length) process.exit(0);

// --- qué tamaños pide cada página --------------------------------------------
// Cada foto vieja puede ir con sufijo de tamaño (-768x512) en src, srcset,
// enlaces de la galería, fondos y JSON con barras escapadas. Se buscan todos
// los tamaños que aparecen de verdad y se generan esos.
const PAGINAS = path.join(RAIZ, 'src', 'content', 'paginas');
const CSS = path.join(PUBLICO, 'wp-content', 'uploads', 'elementor', 'css');
const ficheros = [
  ...fs.readdirSync(PAGINAS).filter((f) => f.endsWith('.html')).map((f) => path.join(PAGINAS, f)),
  ...(fs.existsSync(CSS) ? fs.readdirSync(CSS).filter((f) => f.endsWith('.css')).map((f) => path.join(CSS, f)) : []),
];
const porVieja = new Map(listas.map((x) => [x.vieja, x]));
// una sola pasada por fichero: se cogen TODAS las rutas de uploads (también con
// la barra escapada, \/, en los JSON) y se mira cada una en el mapa
const reTodo = /(?:\\\/|\/)wp-content(?:\\\/|\/)uploads(?:\\\/|\/)[^"'\s)<>&?#]+/g;
const base = (m) => { const limpio = m.replace(/\\\//g, '/'); return [limpio, limpio.replace(/-\d+x\d+(\.[a-z]+)$/i, '$1')]; };
const tamanos = new Map(); // vieja → Set('768x512')
const textos = new Map();
for (const f of ficheros) {
  const t = fs.readFileSync(f, 'utf8');
  let interesa = false;
  for (const m of t.matchAll(reTodo)) {
    const [limpio, vieja] = base(m[0]);
    if (!porVieja.has(vieja)) continue;
    interesa = true;
    const s = limpio.match(/-(\d+x\d+)\.[a-z]+$/i);
    if (!tamanos.has(vieja)) tamanos.set(vieja, new Set());
    if (s) tamanos.get(vieja).add(s[1]);
  }
  if (interesa) textos.set(f, t);
}

// --- generar ------------------------------------------------------------------
fs.mkdirSync(SALIDA, { recursive: true });
const medidasDe = async (ruta) => { try { const m = await sharp(path.join(PUBLICO, ruta)).metadata(); return { w: m.width, h: m.height }; } catch { return null; } };
const altDe = new Map(); // ruta nueva (sin tamaño) → alt
let generadas = 0;

for (const { vieja, e, fuente } of listas) {
  const base = sharp(fuente).rotate();
  const medidas = (await medidasDe(vieja)) || (await base.metadata().then((m) => ({ w: Math.min(m.width, 1920), h: null })));
  await base.clone().resize(medidas.w, medidas.h, { fit: 'cover', position: 'centre' }).webp({ quality: CALIDAD }).toFile(path.join(SALIDA, e.nuevo));
  generadas++;
  altDe.set('/fotos/' + e.nuevo, e.alt);
  for (const s of tamanos.get(vieja) || []) {
    const [w, h] = s.split('x').map(Number);
    await base.clone().resize(w, h, { fit: 'cover', position: 'centre' }).webp({ quality: CALIDAD }).toFile(path.join(SALIDA, sinExt(e.nuevo) + `-${s}.webp`));
    generadas++;
  }
}

// --- sustituir referencias ---------------------------------------------------
let tocados = 0, veces = 0;
for (const [f, antes] of textos) {
  let despues = antes.replace(reTodo, (m) => {
    const [limpio, vieja] = base(m);
    const x = porVieja.get(vieja);
    if (!x) return m;
    veces++;
    const s = limpio.match(/-(\d+x\d+)\.[a-z]+$/i);
    const nueva = '/fotos/' + (s ? sinExt(x.e.nuevo) + `-${s[1]}.webp` : x.e.nuevo);
    return m.includes('\\/') ? nueva.replace(/\//g, '\\/') : nueva;
  });
  // alt de las <img> que ahora apuntan a una foto nueva
  despues = despues.replace(/<img\b[^>]*>/g, (img) => {
    const s = img.match(/\s(?:data-)?src="(\/fotos\/[^"]+)"/);
    if (!s) return img;
    const alt = altDe.get(s[1].replace(/-\d+x\d+\.webp$/, '.webp')) || altDe.get(s[1]);
    if (!alt) return img;
    const altHtml = alt.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    return /\salt="/.test(img) ? img.replace(/\salt="[^"]*"/, ` alt="${altHtml}"`) : img.replace(/^<img/, `<img alt="${altHtml}"`);
  });
  if (despues !== antes) { tocados++; fs.writeFileSync(f, despues); }
}
console.log(`Generadas ${generadas} imágenes en public/fotos/. Referencias cambiadas: ${veces} en ${tocados} ficheros.`);
if (faltan.filter((x) => !x.e.miniatura).length) console.log(`Siguen pendientes ${faltan.filter((x) => !x.e.miniatura).length} fotos sin fichero nuevo (--seco las lista).`);
