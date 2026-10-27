/**
 * cambiar-marca.mjs — cambia el nombre de la empresa, el dominio, el correo,
 * el teléfono, las redes y el logo en todas las páginas, según
 * src/data/marca.json. Lo que en marca.json esté vacío ("nuevo": "") no se
 * toca.
 *
 *   node scripts/cambiar-marca.mjs --seco   cuenta y enseña, no cambia nada
 *   node scripts/cambiar-marca.mjs          aplica (sobre Git: se revisa con git diff)
 *
 * Reglas:
 *   - El nombre se cambia conservando la forma: "VALENCIA & GO" en mayúsculas
 *     pasa al nombre nuevo en mayúsculas; "Valencia&amp;Go" (HTML) recibe el
 *     nombre nuevo con el & escapado.
 *   - El logo: cada ruta vieja (con todos sus tamaños -WxH) pasa a la ruta
 *     nueva de public/marca/. En las <img> se quita el srcset y se ponen
 *     width/height del fichero nuevo.
 *   - Toca src/content/paginas/*.html, public/formularios-netlify.html,
 *     public/wp-content/uploads/elementor/css/*.css y src/data/site.json.
 *     No toca los textos de los tours (eso es otra fase).
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('.');
const SECO = process.argv.includes('--seco');
const CONF = path.join(RAIZ, 'src', 'data', 'marca.json');
const marca = JSON.parse(fs.readFileSync(CONF, 'utf8'));

const escapar = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const html = (t) => t.replace(/&/g, '&amp;');
// direcciones y rutas: en los datos estructurados van con la barra escapada (\/)
const reRuta = (t, banderas = 'g') => new RegExp(escapar(t).replace(/\//g, '\\\\?\\/'), banderas);
const conBarras = (m, nuevo) => (m.includes('\\/') ? nuevo.replace(/\//g, '\\/') : nuevo);

// --- reglas de sustitución ---------------------------------------------------
// cada regla: { que, re, nuevo(match) } ; se cuentan por separado en el informe
const reglas = [];

// primero lo que lleva el nombre dentro de una dirección (dominio, correo,
// redes, logos) y después el nombre a secas, para que éste no toque aquello
if (marca.dominio?.nuevo) {
  reglas.push({ que: `dominio ${marca.dominio.viejo}`, re: reRuta(marca.dominio.viejo, 'gi'), nuevo: () => marca.dominio.nuevo });
}
for (const campo of ['correo', 'telefono', 'whatsapp']) {
  const c = marca[campo];
  if (!c?.nuevo) continue;
  for (const viejo of [].concat(c.viejo)) reglas.push({ que: `${campo} ${viejo}`, re: reRuta(viejo), nuevo: () => c.nuevo });
}
for (const [viejo, nuevo] of Object.entries(marca.redes || {})) {
  if (!nuevo || viejo.startsWith('_')) continue;
  if (viejo.startsWith('@')) {
    // usuario: palabra suelta, no dentro de otra más larga
    reglas.push({ que: `usuario ${viejo}`, re: new RegExp(escapar(viejo) + '(?![\\w.-])', 'g'), nuevo: () => nuevo });
    continue;
  }
  // con http o https, con o sin barra final, con las barras escapadas o no
  const cuerpo = viejo.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const re = new RegExp('https?:\\\\?\\/\\\\?\\/' + escapar(cuerpo).replace(/\//g, '\\\\?\\/') + '\\\\?\\/?(?![\\w.-])', 'g');
  const limpio = nuevo.replace(/\/$/, '');
  reglas.push({ que: `red ${viejo}`, re, nuevo: (m) => conBarras(m, limpio + (/\\?\/$/.test(m) ? '/' : '')) });
}
if (marca.nombre?.nuevo) {
  for (const viejo of marca.nombre.viejo) {
    // una forma junta (sin espacio ni &) solo vale como palabra suelta
    const junta = /^[a-z]+$/i.test(viejo);
    const re = new RegExp((junta ? '(?<![\\w/.@-])' : '') + escapar(viejo) + (junta ? '(?![\\w.-])' : ''), 'gi');
    reglas.push({ que: `nombre «${viejo}»`, re, nuevo: (m) => {
      const n = marca.nombre.nuevo;
      const conAmp = viejo.includes('&amp;');
      const texto = conAmp ? html(n) : n;
      return m === m.toUpperCase() && /[A-Z]/.test(m) ? texto.toUpperCase() : texto;
    } });
  }
}
// logos: ruta vieja (cualquier tamaño) → ruta nueva
const logos = Object.entries(marca.logos || {}).filter(([viejo, nuevo]) => nuevo && !viejo.startsWith('_'));
let medidas = null;
if (logos.length && !SECO) {
  const sharp = (await import('sharp')).default;
  medidas = {};
  for (const [, nuevo] of logos) {
    const f = path.join(RAIZ, 'public', nuevo);
    if (!fs.existsSync(f)) throw new Error(`falta el logo nuevo: public${nuevo}`);
    if (!/\.svg$/i.test(f)) { const m = await sharp(f).metadata(); medidas[nuevo] = { w: m.width, h: m.height }; }
    else {
      // SVG: medidas del viewBox o de width/height, para que la <img> guarde la proporción
      const t = fs.readFileSync(f, 'utf8');
      const vb = t.match(/viewBox="[\d.\-]+\s+[\d.\-]+\s+([\d.]+)\s+([\d.]+)"/);
      const w = t.match(/<svg[^>]*\swidth="([\d.]+)/), h = t.match(/<svg[^>]*\sheight="([\d.]+)/);
      if (vb) medidas[nuevo] = { w: Math.round(Number(vb[1])), h: Math.round(Number(vb[2])) };
      else if (w && h) medidas[nuevo] = { w: Math.round(Number(w[1])), h: Math.round(Number(h[1])) };
    }
  }
}
for (const [viejo, nuevo] of logos) {
  const sinExt = viejo.replace(/\.[a-z]+$/i, ''), ext = viejo.slice(sinExt.length);
  const re = new RegExp(escapar(sinExt).replace(/\//g, '\\\\?\\/') + '(?:-\\d+x\\d+)?' + escapar(ext), 'g');
  reglas.push({ que: `logo ${path.posix.basename(viejo)}`, re, nuevo: (m) => conBarras(m, nuevo), logo: nuevo });
}
// otras imágenes de marca (imagen de compartir en redes, favicon PNG…): ruta vieja → nueva, sin más
for (const [viejo, nuevo] of Object.entries(marca.otras || {})) {
  if (!nuevo || viejo.startsWith('_')) continue;
  const sinExt = viejo.replace(/\.[a-z]+$/i, ''), ext = viejo.slice(sinExt.length);
  const re = new RegExp(escapar(sinExt).replace(/\//g, '\\\\?\\/') + '(?:-\\d+x\\d+)?' + escapar(ext), 'g');
  reglas.push({ que: `imagen ${path.posix.basename(viejo)}`, re, nuevo: (m) => conBarras(m, nuevo) });
}
// el nombre va el último (ver arriba)
reglas.push(...reglas.splice(0, reglas.length).sort((a, b) => Number(a.que.startsWith('nombre')) - Number(b.que.startsWith('nombre'))));

// --- ficheros ----------------------------------------------------------------
const PAGINAS = path.join(RAIZ, 'src', 'content', 'paginas');
const CSS = path.join(RAIZ, 'public', 'wp-content', 'uploads', 'elementor', 'css');
const ficheros = [
  ...fs.readdirSync(PAGINAS).filter((f) => f.endsWith('.html')).map((f) => path.join(PAGINAS, f)),
  path.join(RAIZ, 'public', 'formularios-netlify.html'),
  ...(fs.existsSync(CSS) ? fs.readdirSync(CSS).filter((f) => f.endsWith('.css')).map((f) => path.join(CSS, f)) : []),
].filter((f) => fs.existsSync(f));

const totales = new Map(reglas.map((r) => [r.que, { veces: 0, ficheros: 0 }]));
let cambiados = 0;

// arregla las <img> del logo: srcset fuera, width/height del fichero nuevo
function arreglarImgLogo(texto) {
  if (!medidas) return texto;
  return texto.replace(/<img\b[^>]*>/g, (img) => {
    const src = img.match(/\ssrc="([^"]+)"/);
    const m = src && medidas[src[1]];
    if (!m) return img;
    let r = img.replace(/\ssrcset="[^"]*"/, '').replace(/\ssizes="[^"]*"/, '');
    r = r.replace(/\swidth="[^"]*"/, ` width="${m.w}"`).replace(/\sheight="[^"]*"/, ` height="${m.h}"`);
    if (marca.nombre?.nuevo) r = r.replace(/\salt=""/, ` alt="${html(marca.nombre.nuevo)}"`);
    return r;
  });
}

for (const f of ficheros) {
  const antes = fs.readFileSync(f, 'utf8');
  let despues = antes;
  for (const r of reglas) {
    let n = 0;
    despues = despues.replace(r.re, (m) => { n++; return r.nuevo(m); });
    if (n) { const t = totales.get(r.que); t.veces += n; t.ficheros++; }
  }
  if (logos.length) despues = arreglarImgLogo(despues);
  // iOS y Windows no aceptan SVG como icono de pantalla de inicio: si el icono quedó en SVG, ahí va el PNG hermano
  despues = despues.replace(/(rel="apple-touch-icon"[^>]*href="|msapplication-TileImage"[^>]*content="[^"]*)(\/marca\/[\w-]+)\.svg"/g, '$1$2.png"');
  if (despues !== antes) {
    cambiados++;
    if (!SECO) fs.writeFileSync(f, despues);
  }
}

// site.json
if (!SECO) {
  const sitePath = path.join(RAIZ, 'src', 'data', 'site.json');
  const site = JSON.parse(fs.readFileSync(sitePath, 'utf8'));
  if (marca.nombre?.nuevo) { site.nombre = marca.nombre.nuevo; site.pie.copyright = marca.nombre.nuevo; }
  if (marca.dominio?.nuevo) site.dominio = 'https://' + marca.dominio.nuevo.replace(/^https?:\/\//, '');
  if (marca.correo?.nuevo) { site.email = marca.correo.nuevo; site.titular.email = marca.correo.nuevo; site.formulario.destino = marca.correo.nuevo; }
  if (marca.telefono?.nuevo) site.telefono = marca.telefono.nuevo;
  if (marca.whatsapp?.nuevo) site.whatsapp = marca.whatsapp.nuevo.replace(/\D/g, '');
  fs.writeFileSync(sitePath, JSON.stringify(site, null, 1) + '\n');
}

// --- informe -----------------------------------------------------------------
console.log(SECO ? 'EN SECO: nada cambiado.' : 'APLICADO.');
if (!reglas.length) console.log('marca.json no tiene ningún "nuevo" relleno: no hay nada que cambiar.');
for (const [que, t] of totales) console.log(`  ${que}: ${t.veces} veces en ${t.ficheros} ficheros`);
console.log(`Ficheros que cambian: ${cambiados} de ${ficheros.length}.`);
const vacios = ['nombre', 'dominio', 'correo', 'telefono', 'whatsapp'].filter((c) => !marca[c]?.nuevo);
if (vacios.length) console.log(`Sin rellenar en marca.json (no se tocan): ${vacios.join(', ')}${logos.length ? '' : ', logos'}.`);
