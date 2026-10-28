/**
 * seo.js — datos estructurados (schema.org) que la web nueva ANADE al
 * construir, segun src/data/seo.json "datos" (28-10-2026). Las piezas no se
 * tocan: se lee la cabeza y el contenido de la pagina y se devuelve una cabeza
 * nueva para Base.astro.
 *
 * Todo sale de lo que la pagina ya ensena (nada inventado):
 *   - preguntas frecuentes visibles  -> el WebPage pasa a ser tambien FAQPage
 *     con sus preguntas y respuestas (desplegables de Elementor o lista bajo
 *     un titulo "Preguntas frecuentes" en el blog);
 *   - fichas (paginas de producto)   -> TouristTrip (o Service) con nombre,
 *     descripcion, foto y, si la ficha ensena precio, Product con oferta en EUR;
 *   - paginas sin grafo de Yoast (las categorias nuevas) -> WebPage o
 *     CollectionPage, migas de pan, WebSite y Organization, copiados de la
 *     portada;
 *   - se quita el SearchAction del WebSite: anuncia un buscador (?s=) que en la
 *     web estatica no existe.
 * A las paginas con noindex solo se les quita el buscador.
 */
import fs from 'node:fs';
import path from 'node:path';
import seo from '../data/seo.json';
import site from '../data/site.json';

const DIR = path.resolve('src/content/paginas');
const D = seo.datos || {};
const SIN_MARCA = new RegExp(`\\s*[|·–-]\\s*(Blog\\s+)?${site.nombre}\\s*$`, 'i');
const TITULO_FAQ = new RegExp(D.tituloPreguntas || 'preguntas frecuentes', 'i');
const GRAFO = /<script type="application\/ld\+json" class="yoast-schema-graph">([\s\S]*?)<\/script>/;

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', euro: '€', laquo: '«', raquo: '»', iquest: '¿', iexcl: '¡' };
const deco = (s) => s
  .replace(/&#(\d+);/g, (t, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (t, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (t, n) => ENT[n.toLowerCase()] ?? t);
const texto = (s) => deco(s
  .replace(/<(script|style|svg|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<\/(p|li|div|h\d)>/gi, ' ')
  .replace(/<[^>]+>/g, ''))
  .replace(/\s+/g, ' ').trim();
const meta = (cab, re) => { const m = cab.match(re); return m ? deco(m[1]).trim() : ''; };
// JSON dentro de <script>: que ningun texto pueda cerrar la etiqueta
const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

// ------------------------------------------------------- preguntas frecuentes
function preguntas(contenido) {
  const tit = [...contenido.matchAll(/<(h[2-6])\b[^>]*>([\s\S]*?)<\/\1>/gi)].find((m) => TITULO_FAQ.test(texto(m[2])));
  if (!tit) return [];
  const desde = tit.index + tit[0].length;
  const resto = contenido.slice(desde);
  const fin = resto.search(/<h[23]\b/i);
  const zona = fin < 0 ? resto : resto.slice(0, fin);
  const salida = [];
  // 1) desplegables de Elementor (fichas)
  for (const m of zona.matchAll(/<details\b[^>]*class="e-n-accordion-item"[^>]*>([\s\S]*?)<\/details>/g)) {
    const q = m[1].match(/class="e-n-accordion-item-title-text">([\s\S]*?)<\/div>/);
    const a = m[1].split(/<\/summary>/)[1] || '';
    if (q) salida.push([texto(q[1]), texto(a)]);
  }
  if (salida.length) return salida.filter(([q, a]) => q && a.length >= 20);
  // 2) blog: preguntas en negrita al principio de un <li>/<p>, o como titulos h4-h6
  let actual = null;
  const cerrar = () => { if (actual && actual[1].length >= 20) salida.push(actual); actual = null; };
  for (const b of zona.matchAll(/<(li|p|h[4-6])\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const [, tag, dentro] = b;
    if (/^h/i.test(tag)) {
      cerrar();
      const t = texto(dentro);
      if (t.endsWith('?')) actual = [t, ''];
      continue;
    }
    const negrita = dentro.match(/^\s*((?:<(b|strong)\b[^>]*>[\s\S]*?<\/\2>\s*)+)([\s\S]*)$/i);
    const qn = negrita ? texto(negrita[1]) : '';
    if (qn.endsWith('?')) {
      cerrar();
      actual = [qn, texto(negrita[3])];
      if (tag.toLowerCase() === 'li') cerrar();
      continue;
    }
    if (negrita && !qn.endsWith('?')) { cerrar(); continue; } // parrafo destacado: se acaba la lista
    if (actual) actual[1] = (actual[1] + ' ' + texto(dentro)).trim();
  }
  cerrar();
  return salida;
}

// ------------------------------------------------------------------- precio
// El precio de la ficha es el primer widget de precio de WooCommerce que NO es
// de las tarjetas de "otras actividades" (su widget se repite en la pagina).
let repetidos = null;
function widgetsRepetidos() {
  if (repetidos) return repetidos;
  repetidos = new Set();
  const indice = JSON.parse(fs.readFileSync(path.join(DIR, 'indice.json'), 'utf8'));
  for (const p of indice.filter((x) => /producto$/.test(x.tipo))) {
    const t = fs.readFileSync(path.join(DIR, p.nombre + '.html'), 'utf8');
    const ids = [...t.matchAll(/data-id="([0-9a-f]+)"[^>]*data-widget_type="woocommerce-product-price/g)].map((m) => m[1]);
    for (const id of ids) if (ids.indexOf(id) !== ids.lastIndexOf(id)) repetidos.add(id);
  }
  return repetidos;
}
function precio(contenido) {
  const rep = widgetsRepetidos();
  for (const m of contenido.matchAll(/data-id="([0-9a-f]+)"[^>]*data-widget_type="woocommerce-product-price[^>]*>([\s\S]*?)<\/div>/g)) {
    if (rep.has(m[1])) continue;
    const bdi = m[2].match(/<bdi>([\s\S]*?)<\/bdi>/);
    if (!bdi) return null; // "A consultar": la ficha no tiene precio
    let n = texto(bdi[1]).replace(/[^\d.,]/g, '');
    if (/,\d{1,2}$/.test(n)) n = n.replace(/\./g, '').replace(',', '.');
    else n = n.replace(/,/g, '');
    const v = Number(n);
    return v > 0 ? v.toFixed(2) : null;
  }
  return null;
}

// ------------------------------------------------------------------ portada
let basicos = null;
function nodosBasicos() {
  if (basicos) return basicos;
  const indice = JSON.parse(fs.readFileSync(path.join(DIR, 'indice.json'), 'utf8'));
  const portada = indice.find((p) => p.ruta === '/');
  const t = portada ? fs.readFileSync(path.join(DIR, portada.nombre + '.html'), 'utf8') : '';
  const m = t.match(GRAFO);
  basicos = [];
  if (m) {
    const g = JSON.parse(m[1]);
    for (const n of g['@graph'] || []) if (['WebSite', 'Organization'].includes([].concat(n['@type'])[0])) basicos.push(n);
  }
  return basicos;
}
const sinBuscador = (n) => {
  if (!D.quitarBuscador || !n.potentialAction) return n;
  const pa = [].concat(n.potentialAction).filter((a) => a['@type'] !== 'SearchAction');
  if (pa.length) n.potentialAction = pa; else delete n.potentialAction;
  return n;
};

// ------------------------------------------------------------------ entrada
export function cabezaConDatos(cabeza, contenido, despues, pagina, dominio) {
  const noindex = /<meta name=['"]robots['"] content=['"][^'"]*noindex/.test(cabeza);
  if (noindex && !GRAFO.test(cabeza)) return cabeza;
  const canon = meta(cabeza, /<link rel="canonical" href="([^"]+)"/) || dominio.replace(/\/$/, '') + pagina.ruta;
  const titulo = meta(cabeza, /<meta property="og:title" content="([^"]*)"/) || meta(cabeza, /<title>([\s\S]*?)<\/title>/);
  const desc = meta(cabeza, /<meta name="description" content="([^"]*)"/);
  const foto = meta(cabeza, /<meta property="og:image" content="([^"]*)"/);
  const idioma = (pagina.html && pagina.html.lang ? pagina.html.lang.split('-')[0] : 'es');
  const marca = nodosBasicos().find((n) => [].concat(n['@type'])[0] === 'Organization');
  const org = marca ? { '@id': marca['@id'] } : undefined;

  const m = cabeza.match(GRAFO);
  let grafo;
  try { grafo = m ? JSON.parse(m[1]) : null; } catch { return cabeza; }
  const nuevo = !grafo;
  if (nuevo) grafo = { '@context': 'https://schema.org', '@graph': [] };
  const nodos = grafo['@graph'];
  nodos.forEach(sinBuscador);
  if (noindex) return cabeza.replace(m[0], () => `<script type="application/ld+json" class="yoast-schema-graph">${json(grafo)}</script>`);

  let pag = nodos.find((n) => [].concat(n['@type']).some((t) => /Page$/.test(t)));
  if (!pag) {
    const nombre = titulo.replace(SIN_MARCA, '') || titulo;
    pag = { '@type': /categoria/.test(pagina.tipo || '') ? 'CollectionPage' : 'WebPage', '@id': canon, url: canon, name: titulo, inLanguage: idioma };
    if (desc) pag.description = desc;
    if (foto) pag.image = foto;
    const sitio = nodosBasicos().find((n) => [].concat(n['@type'])[0] === 'WebSite');
    if (sitio) pag.isPartOf = { '@id': sitio['@id'] };
    if (org) pag.about = org;
    nodos.push(pag);
    if (!/BreadcrumbList/.test(despues || '') && !/BreadcrumbList/.test(contenido)) {
      const base = dominio.replace(/\/$/, '') + '/';
      pag.breadcrumb = { '@id': canon + '#breadcrumb' };
      nodos.push({ '@type': 'BreadcrumbList', '@id': canon + '#breadcrumb', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Portada', item: base },
        { '@type': 'ListItem', position: 2, name: nombre },
      ] });
    }
    if (nuevo) for (const n of nodosBasicos()) nodos.push(sinBuscador(structuredClone(n)));
  }

  if (D.preguntas) {
    const qa = preguntas(contenido);
    if (qa.length >= 2) {
      pag['@type'] = [...new Set([...[].concat(pag['@type']), 'FAQPage'])];
      pag.mainEntity = qa.map(([q, a], i) => ({ '@type': 'Question', '@id': `${canon}#pregunta-${i + 1}`, name: q, acceptedAnswer: { '@type': 'Answer', text: a } }));
    }
  }

  if (D.actividad && /producto$/.test(pagina.tipo || '')) {
    const ruta = pagina.ruta.replace(/^\/(en|fr|it|pl)\//, '/');
    const porRuta = Object.entries(D.tipoPorRuta || {}).find(([r]) => !r.startsWith('_') && ruta.startsWith(r));
    const tipo = porRuta ? porRuta[1] : 'TouristTrip';
    const p = precio(contenido);
    const act = { '@type': p ? [tipo, 'Product'] : tipo, '@id': canon + '#actividad', name: titulo.replace(SIN_MARCA, ''), url: canon, inLanguage: idioma };
    if (desc) act.description = desc;
    if (foto) act.image = foto;
    if (org) { act.provider = org; if (p) act.brand = org; }
    if (p) act.offers = { '@type': 'Offer', price: p, priceCurrency: 'EUR', url: canon };
    nodos.push(act);
    if (!pag.mainEntity) pag.mainEntity = { '@id': act['@id'] };
  }

  const script = `<script type="application/ld+json" class="yoast-schema-graph"${nuevo ? ' data-nuevo="datos"' : ''}>${json(grafo)}</script>`;
  return m ? cabeza.replace(m[0], () => script) : cabeza + script;
}
