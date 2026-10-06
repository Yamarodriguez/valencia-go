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
/**
 * Reune en un fichero cada tramo de hojas consecutivas del <head>: los <link>
 * propios (tambien las post-ID.css de las plantillas, que comparten las
 * paginas de un mismo tipo) y los <style> del head que son iguales en todas
 * las paginas. Se quedan sueltos: la post-ID.css de la PROPIA pagina (si no,
 * cada pagina tendria un fichero distinto y no se aprovecharia la cache), las
 * hojas con media distinto de all/screen, las de otros dominios y los <style>
 * cuyo id esta en `inlineNo` (cambian de pagina a pagina).
 * Cada tramo: [{href} | {id, css}], en su orden. Devuelve {cabeza, tramos}.
 */
export function reunirHojas(cabeza, { postId = 0, inlineNo = [] } = {}) {
  const tramos = {};
  const propia = new RegExp(`/elementor/css/post-${postId}\\.css`);
  const esLinkCombinable = (l) => {
    const h = attr(l, 'href') || ''; const m = attr(l, 'media');
    return h.startsWith('/') && !h.startsWith('//') && (!m || /^(all|screen)$/i.test(m)) && !(postId && propia.test(h));
  };
  const reunir = (grupo) => {
    const clave = grupo.map((x) => x.href || `style#${x.id}:${crypto.createHash('sha1').update(x.css).digest('hex').slice(0, 10)}`).join('\n');
    const hash = crypto.createHash('sha1').update(clave).digest('hex').slice(0, 12);
    tramos[hash] = grupo;
    return `<link rel="stylesheet" id="hojas-${hash}" href="/css/r-${hash}.css" data-nuevo="hojas" data-reune="${grupo.length}" />\n`;
  };
  // se recorre la cabeza elemento a elemento: <link>, <style>, comentarios y espacios
  const rx = /<link\b[^>]*>|<style\b([^>]*)>([\s\S]*?)<\/style>|<!--[\s\S]*?-->|\s+/gi;
  const partes = []; let grupo = []; let ultimo = 0;
  const cerrar = () => { if (grupo.length >= 2) partes.push(reunir(grupo)); else partes.push(...grupo.map((x) => x.texto + '\n')); grupo = []; };
  for (let m; (m = rx.exec(cabeza));) {
    if (m.index > ultimo) { cerrar(); partes.push(cabeza.slice(ultimo, m.index)); } // cualquier otra etiqueta corta el tramo
    ultimo = m.index + m[0].length;
    const t = m[0];
    if (/^\s+$/.test(t) || t.startsWith('<!--')) { if (!grupo.length) partes.push(t); continue; }
    if (t.startsWith('<link')) {
      if (/rel=['"]stylesheet['"]/i.test(t) && esLinkCombinable(t)) grupo.push({ href: attr(t, 'href'), texto: t });
      else { cerrar(); partes.push(t + '\n'); }
      continue;
    }
    const id = attr(m[1], 'id');
    if (id && !inlineNo.includes(id)) grupo.push({ id, css: m[2], texto: t });
    else { cerrar(); partes.push(t + '\n'); }
  }
  cerrar();
  if (ultimo < cabeza.length) partes.push(cabeza.slice(ultimo));
  return { cabeza: partes.join(''), tramos };
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
