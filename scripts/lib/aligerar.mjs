/**
 * aligerar.mjs — las tres reglas de velocidad de src/data/velocidad.json,
 * aplicadas a las piezas de una pagina (las usa scripts/partir-paginas.mjs):
 *   quitarGuiones   quita los <script> que ya no hacen nada en estatico
 *   reunirHojas     cada tramo de <link rel=stylesheet> consecutivos del <head>
 *                   pasa a un solo <link> a /css/r-<hash>.css (mismo orden)
 *   fotosPerezosas  loading="lazy" en las fotos salvo las primeras N del contenido
 * Nada de esto toca el texto ni el diseno; el comparador de marcado lo conoce.
 */
import crypto from 'node:crypto';

const RX_SCRIPT = /<script\b([^>]*)>[\s\S]*?<\/script>\s*/gi;
const attr = (etiqueta, nombre) => {
  const m = etiqueta.match(new RegExp(`\\b${nombre}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? (m[1] ?? m[2] ?? m[3] ?? '') : null;
};

/** Devuelve {html, quitados: {nombre: n}}. */
export function quitarGuiones(html, reglas) {
  const quitados = {};
  const salida = html.replace(RX_SCRIPT, (todo, atributos) => {
    const id = attr(atributos, 'id') || '';
    for (const r of reglas) {
      const porId = r.id && id && new RegExp(r.id).test(id);
      const porContenido = r.contenido && !id && new RegExp(r.contenido).test(todo);
      if (porId || porContenido) { quitados[r.nombre] = (quitados[r.nombre] || 0) + 1; return ''; }
    }
    return todo;
  });
  return { html: salida, quitados };
}

/** Tramos de <link rel=stylesheet href="/..."> consecutivos (solo separados por
 *  espacios o comentarios) -> un <link> por tramo. Devuelve {cabeza, tramos: {hash: [href...]}}.
 *  No se reunen las hojas con media distinto de all/screen ni las de otros dominios. */
export function reunirHojas(cabeza) {
  const tramos = {};
  // Las hojas que Elementor escribe por pagina o por plantilla (post-ID.css) se
  // quedan sueltas: si entraran en el tramo, cada pagina tendria un fichero
  // distinto y el visitante no aprovecharia la cache al cambiar de pagina.
  const combinable = (l) => {
    const h = attr(l, 'href') || ''; const m = attr(l, 'media');
    return h.startsWith('/') && !h.startsWith('//') && (!m || /^(all|screen)$/i.test(m)) && !/\/elementor\/css\/post-\d+\.css/.test(h);
  };
  const reunir = (grupo) => {
    const hrefs = grupo.map((l) => attr(l, 'href'));
    const hash = crypto.createHash('sha1').update(hrefs.join('\n')).digest('hex').slice(0, 12);
    tramos[hash] = hrefs;
    return `<link rel="stylesheet" id="hojas-${hash}" href="/css/r-${hash}.css" data-nuevo="hojas" data-reune="${hrefs.length}" />\n`;
  };
  const rx = /(?:<link\b[^>]*rel=['"]stylesheet['"][^>]*>(?:\s|<!--[\s\S]*?-->)*){2,}/gi;
  const salida = cabeza.replace(rx, (bloque) => {
    const links = bloque.match(/<link\b[^>]*>/gi);
    const partes = []; let grupo = [];
    const cerrar = () => { if (grupo.length >= 2) partes.push(reunir(grupo)); else partes.push(...grupo.map((l) => l + '\n')); grupo = []; };
    for (const l of links) { if (combinable(l)) grupo.push(l); else { cerrar(); partes.push(l + '\n'); } }
    cerrar();
    return partes.join('');
  });
  return { cabeza: salida, tramos };
}

/** Tramos [inicio, fin) de los elementos cuya clase casa con `rx` (contando la profundidad de <div>). */
function tramosDe(html, rx) {
  const tramos = [];
  for (const m of html.matchAll(/<div\b[^>]*\bclass=["']([^"']*)["'][^>]*>/gi)) {
    if (!rx.test(m[1])) continue;
    const r = /<(\/?)div\b[^>]*>/gi; r.lastIndex = m.index; let prof = 0;
    for (let x; (x = r.exec(html));) { prof += x[1] ? -1 : 1; if (prof === 0) { tramos.push([m.index, x.index + x[0].length]); break; } }
  }
  return tramos;
}

/** loading="lazy" en las <img> sin loading, saltando las primeras N del contenido.
 *  Las fotos de un carrusel (swiper) no se hacen perezosas: las que estan fuera
 *  de pantalla no cargarian y el carrusel cambiaria de tamano. */
export function fotosPerezosas(piezas, saltar) {
  const cuenta = { perezosas: 0, sinTocar: 0 };
  const marcar = (html, saltarAqui) => {
    let vistas = 0;
    const carruseles = tramosDe(html, /\bswiper\b|\bswiper-container\b|elementor-widget-(image-carousel|loop-carousel|media-carousel|testimonial-carousel|reviews|slides)\b/);
    return html.replace(/<img\b[^>]*>/gi, (img, pos) => {
      if (/\bloading\s*=/i.test(img)) { cuenta.sinTocar++; return img; }
      if (vistas++ < saltarAqui) { cuenta.sinTocar++; return img; }
      if (carruseles.some(([a, b]) => pos > a && pos < b)) { cuenta.sinTocar++; return img; }
      cuenta.perezosas++;
      return img.replace(/^<img\b/i, '<img loading="lazy"');
    });
  };
  return {
    piezas: { ...piezas, contenido: marcar(piezas.contenido, saltar), pie: marcar(piezas.pie, 0), despues: marcar(piezas.despues, 0) },
    cuenta,
  };
}

/** Deja cada <script> de JavaScript como type="text/plain" data-aplazado="js|module"
 *  para que lo ejecute src/js/aplazador.js cuando el visitante haga algo (como
 *  LiteSpeed en la web vieja). No se tocan los JSON (ld+json, speculationrules…),
 *  los que llevan data-no-aplazar ni los nuestros (data-nuevo). */
export function aplazarGuiones(html) {
  let n = 0;
  const salida = html.replace(/<script\b([^>]*)>/gi, (todo, atributos) => {
    if (/data-aplazado=|data-no-aplazar|data-nuevo=/i.test(atributos)) return todo;
    const tipo = (attr(atributos, 'type') || '').trim().toLowerCase();
    const esModulo = tipo === 'module';
    if (tipo && !esModulo && !/^(text|application)\/(javascript|ecmascript|x-javascript)$/.test(tipo)) return todo;
    n++;
    const sinTipo = atributos.replace(/\s*\btype\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i, '');
    return `<script type="text/plain" data-aplazado="${esModulo ? 'module' : 'js'}"${sinTipo}>`;
  });
  return { html: salida, aplazados: n };
}
