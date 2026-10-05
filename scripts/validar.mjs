/**
 * validar.mjs — comprueba el 100 % de las paginas compiladas.
 *
 *   npm run build && node scripts/validar.mjs
 *
 * No se sube nada que no pase esta validacion.
 * Comprueba, pagina a pagina:
 *   1. equilibrio de <p>, <a>, <div>, <section>, <h2>, <h3>, <ul>, <li>, <figure>
 *   2. un solo <h1>
 *   3. ningun bloque generado anidado dentro de otro igual
 *   4. texto visible identico al original (salvo lo anadido a proposito y
 *      los encabezados reescritos de src/data/encabezados.json)
 *   5. ningun href perdido respecto del JSON de origen
 *   6. ninguna imagen marcador (aviso)
 *   7. title, meta description y canonical presentes
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('.');
const DIST = path.join(RAIZ, 'dist');
const PAGINAS = path.join(RAIZ, 'src', 'content', 'pages');

// fallos de la web vieja aprobados por el propietario: salen como aviso
const fallosOriginal = (() => {
  const f = path.join(RAIZ, 'src', 'data', 'fallos-original.json');
  const d = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
  const rutas = (lista) => new Set((lista || []).map((x) => (typeof x === 'string' ? x : x.ruta)));
  return { h1: rutas(d.h1), '404': rutas(d['404']) };
})();

const ETIQUETAS = ['p', 'a', 'div', 'section', 'h2', 'h3', 'ul', 'li', 'figure'];
const GENERADOS = ['rejilla', 'tarjeta', 'fila-titulos', 'figura', 'mapa', 'formulario'];

const textoVisible = (h) =>
  h.replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/gi, ' ')
    // comillas tipograficas: el arbol trae las curvas y el HTML las rectas
    .replace(/[\u2018\u2019\u201a\u201b]/g, "'")
    .replace(/[\u201c\u201d\u201e\u201f\u00ab\u00bb]/g, '"')
    .replace(/[\s ]+/g, ' ')
    .trim()
    .toLowerCase();

const VACIAS = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'area', 'col', 'embed']);

/** Recorre el HTML con una pila y devuelve los bloques generados que estan
 *  anidados dentro de otro del mismo tipo. */
function bloquesAnidados(html, generados) {
  const pila = [];
  const encontrados = new Set();
  for (const m of html.matchAll(/<(\/?)([a-z][a-z0-9]*)\b([^>]*)>/gi)) {
    const cierre = m[1] === '/';
    const tag = m[2].toLowerCase();
    if (VACIAS.has(tag) || m[3].endsWith('/')) continue;
    if (cierre) { pila.pop(); continue; }
    const clases = ((m[3].match(/class="([^"]*)"/) || [, ''])[1]).split(/\s+/);
    const propias = generados.filter((g) => clases.includes(g));
    for (const g of propias) {
      if (pila.some((nivel) => nivel.includes(g))) encontrados.add(g);
    }
    pila.push(propias);
  }
  return [...encontrados];
}

function equilibrio(html, etiqueta) {
  const abre = (html.match(new RegExp(`<${etiqueta}(?=[\\s>])`, 'gi')) || []).length;
  const cierra = (html.match(new RegExp(`</${etiqueta}\\s*>`, 'gi')) || []).length;
  return abre - cierra;
}

/* Encabezados reescritos a peticion del propietario en paginas concretas
   (src/data/encabezados.json, los aplica src/utils/renombres.js al pintar):
   en esas paginas el texto de referencia es el nuevo, no el original. */
const RENOMBRES = (() => {
  const f = path.join(path.resolve('.'), 'src', 'data', 'encabezados.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
})();
const planoDe = (t) => String(t ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
  .replace(/\s+/g, ' ').trim();
const renombresDe = (ruta) => RENOMBRES[ruta]
  ? new Map(Object.entries(RENOMBRES[ruta]).map(([k, v]) => [planoDe(k), v]))
  : null;

/** Todo el texto que el arbol de maquetacion deberia acabar enseñando. */
function textoDelArbol(bloques, salida = [], renombres = null) {
  for (const b of bloques || []) {
    if (b.t === 'seccion') { for (const c of b.columnas || []) textoDelArbol(c.elementos, salida, renombres); }
    else if (b.t === 'encabezado') salida.push(renombres?.get(planoDe(b.texto)) ?? b.texto);
    else if (b.t === 'texto') salida.push(b.html);
    else if (b.t === 'boton') salida.push(b.texto);
  }
  return salida.join(' ');
}

/** Los destinos de enlace que el arbol deberia acabar enseñando. */
function enlacesDelArbol(bloques, salida = []) {
  for (const b of bloques || []) {
    if (b.t === 'seccion') { for (const c of b.columnas || []) enlacesDelArbol(c.elementos, salida); }
    else if (b.t === 'video') { /* se pinta como reproductor, no como enlace */ }
    else {
      if (b.url) salida.push(b.url);
      if (b.html) for (const m of b.html.matchAll(/href="([^"]+)"/g)) salida.push(m[1]);
    }
  }
  return salida;
}

const fallos = [];
const avisos = [];
let revisadas = 0;

for (const f of fs.readdirSync(PAGINAS).filter((x) => x.endsWith('.json'))) {
  const origen = JSON.parse(fs.readFileSync(path.join(PAGINAS, f), 'utf8'));
  const destino = path.join(DIST, origen.ruta.replace(/^\//, ''), 'index.html');
  if (!fs.existsSync(destino)) {
    fallos.push(`${origen.ruta} — no se ha generado`);
    continue;
  }
  revisadas++;
  const html = fs.readFileSync(destino, 'utf8');
  const cuerpo = (html.match(/<main id="main"[^>]*>([\s\S]*?)<\/main>/) || [, ''])[1];

  for (const e of ETIQUETAS) {
    const d = equilibrio(cuerpo, e);
    if (d !== 0) fallos.push(`${origen.ruta} — <${e}> descuadrado (${d})`);
  }

  const h1 = (html.match(/<h1(?=[\s>])/gi) || []).length;
  // las paginas que en la web viva ya no tenian H1 y el propietario aprobo
  // (src/data/fallos-original.json, lista "h1") salen como aviso, no como fallo
  if (h1 !== 1) {
    if (h1 === 0 && fallosOriginal.h1.has(origen.ruta)) avisos.push(`${origen.ruta} — 0 <h1>, como en la web vieja (fallo del original aprobado)`);
    else fallos.push(`${origen.ruta} — ${h1} <h1> (debe haber exactamente 1)`);
  }

  // 3. anidamiento: se recorre el arbol con una pila y se comprueba que
  //    ningun bloque generado contiene otro del mismo tipo. Comparar clases
  //    con \b no vale: "tarjeta-titulo" casaria con "tarjeta".
  const anidados = bloquesAnidados(cuerpo, GENERADOS);
  for (const g of anidados) {
    fallos.push(`${origen.ruta} — bloque "${g}" anidado dentro de otro "${g}"`);
  }

  // 4. texto visible: ninguna palabra del original puede haberse perdido.
  //    La referencia es el arbol `bloques` (lo que Elementor tenia), no el
  //    HTML plano del export: el HTML plano trae ademas las URL de los videos
  //    como texto, que en la web real son un reproductor.
  const cuenta = (t) => {
    const m = new Map();
    for (const p of t.split(' ')) if (p) m.set(p, (m.get(p) || 0) + 1);
    return m;
  };
  // texto que el motor quita a proposito, con su regla documentada en
  // scripts/arbol.py (funcion limpiar_html)
  const QUITADO = [
    /[^.]*estamos realizando modificaciones[^.]*\./gi,   // aviso de obras olvidado
  ];
  let original = origen.bloques && origen.bloques.length
    ? textoVisible(textoDelArbol(origen.bloques, [], renombresDe(origen.ruta)))
    : textoVisible(origen.cuerpo);
  for (const re of QUITADO) original = original.replace(re, ' ');

  const antes = cuenta(original.replace(/\s+/g, ' ').trim());
  const ahora = cuenta(textoVisible(cuerpo));
  const perdidas = [];
  for (const [palabra, n] of antes) {
    const m = ahora.get(palabra) || 0;
    if (m < n) perdidas.push(`${palabra} (x${n - m})`);
  }
  if (perdidas.length) {
    fallos.push(`${origen.ruta} — ${perdidas.length} palabra(s) del original perdidas: ${perdidas.slice(0, 6).join(', ')}`);
  }

  const normalizar_url = (u) => decodeURI(u).replace(/&amp;/g, '&').replace(/\s+/g, '').toLowerCase();
  const presentes = new Set([...cuerpo.matchAll(/href="([^"]+)"/g)]
    .map((m) => normalizar_url(m[1])));
  const esperados = origen.bloques && origen.bloques.length
    ? enlacesDelArbol(origen.bloques)
    : [...cuerpo.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  const faltan = [...new Set(esperados)]
    .filter((u) => u && !u.startsWith('#') && !u.startsWith('mailto:'))
    .filter((u) => !presentes.has(normalizar_url(u)));
  if (faltan.length) {
    fallos.push(`${origen.ruta} — ${faltan.length} enlace(s) perdidos: ${faltan.slice(0, 3).join(' ')}`);
  }

  const marcadores = (cuerpo.match(/data:image\/svg\+xml/g) || []).length;
  if (marcadores) avisos.push(`${origen.ruta} — ${marcadores} imagen(es) sin archivo`);

  if (!/<title>[^<]{5,}<\/title>/.test(html)) fallos.push(`${origen.ruta} — sin <title>`);
  if (!/<meta name="description" content="[^"]{20,}"/.test(html) && !origen.noindex) {
    avisos.push(`${origen.ruta} — sin meta descripcion`);
  }
  if (!/<link rel="canonical"/.test(html)) fallos.push(`${origen.ruta} — sin canonical`);
  if (/href=""/.test(cuerpo)) fallos.push(`${origen.ruta} — quedan href vacios`);
}

/* -------------------------------------------- fotos de fondo de las hojas
 * Las franjas oscuras del sitio (la de "Ventajas de las casas de
 * Contenedores", la del presupuesto, la del diseño en 3D...) llevan la foto
 * puesta desde el CSS, no desde el texto de la pagina. Si el fichero no esta
 * descargado, esa franja sale de color liso y nadie se entera revisando el
 * HTML, porque en el HTML no hay ninguna imagen rota: simplemente no hay foto.
 * Por eso se comprueba aqui, contra las hojas, y cuenta como FALLO. */
{
  const raizPublica = path.join(RAIZ, 'public');
  const re = /url\(\s*["']?(?:https?:\/\/(?:www\.)?valenciaandgo\.com)?(\/wp-content\/uploads\/[^"')?#]+\.(?:jpg|jpeg|png|gif|webp|svg))/gi;
  const faltan = new Map();
  for (const sub of ['paginas', 'comunes']) {
    const d = path.join(RAIZ, 'css-original', sub);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) {
      if (!f.endsWith('.css')) continue;
      const css = fs.readFileSync(path.join(d, f), 'utf8');
      for (const m of css.matchAll(re)) {
        const r = m[1];
        if (fs.existsSync(path.join(raizPublica, r.replace(/^\//, '')))) continue;
        faltan.set(r, (faltan.get(r) || 0) + 1);
      }
    }
  }
  for (const [r, n] of [...faltan].sort((a, b) => b[1] - a[1])) {
    fallos.push(`foto de fondo sin descargar, usada en ${n} hoja(s): ${r}`);
  }
}

console.log(`paginas revisadas: ${revisadas}`);
console.log(`fallos: ${fallos.length} | avisos: ${avisos.length}\n`);

if (avisos.length) {
  console.log('AVISOS (no bloquean):');
  avisos.slice(0, 20).forEach((a) => console.log('  ' + a));
  if (avisos.length > 20) console.log(`  … y ${avisos.length - 20} mas`);
  console.log('');
}

if (fallos.length) {
  console.log('FALLOS:');
  fallos.slice(0, 40).forEach((x) => console.log('  ' + x));
  if (fallos.length > 40) console.log(`  … y ${fallos.length - 40} mas`);
  process.exit(1);
}

console.log('VALIDACION SUPERADA: el 100 % de las paginas esta correcto.');
