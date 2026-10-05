/**
 * aplicar-ampliacion.mjs — vuelca en cada pagina el contenido SEO nuevo
 * (campo "ampliacion": secciones h2/h3 + FAQ) que han redactado y verificado
 * los agentes. El contenido original ("bloques") no se toca.
 *
 *   node scripts/aplicar-ampliacion.mjs <resultado.json> [--todas] [--seco]
 *
 * Con --quitar-rechazadas, a las paginas cuya ampliacion no esta aprobada se
 * les borra la que tuvieran (un borrador sin verificar no se publica).
 *
 * <resultado.json> es el objeto { ampliaciones: { "/ruta/": { secciones,
 * faq, aprobado, problemas } } } que devuelve el workflow. Por defecto solo
 * se aplican las aprobadas por el verificador; con --todas, todas. Con
 * --seco solo informa. Antes de escribir se sanea el HTML: se quitan
 * etiquetas no permitidas y se comprueba que los enlaces internos existen.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('.');
const PAGINAS = path.join(RAIZ, 'src', 'content', 'pages');
const [,, fichero, ...flags] = process.argv;
if (!fichero) { console.error('uso: node scripts/aplicar-ampliacion.mjs <resultado.json> [--todas] [--seco] [--quitar-rechazadas]'); process.exit(1); }
const todas = flags.includes('--todas'), seco = flags.includes('--seco');
// con --quitar-rechazadas, a la pagina de una ampliacion no aprobada se le
// borra la que tuviera en su JSON (un borrador sin verificar no se publica)
const quitar = flags.includes('--quitar-rechazadas');

const datos = JSON.parse(fs.readFileSync(path.resolve(fichero), 'utf8'));
const ampliaciones = datos.ampliaciones || datos;

const porRuta = new Map();
for (const f of fs.readdirSync(PAGINAS).filter((f) => f.endsWith('.json'))) {
  const p = JSON.parse(fs.readFileSync(path.join(PAGINAS, f), 'utf8'));
  porRuta.set(p.ruta, { fichero: f, pagina: p });
}

const PERMITIDAS = new Set(['p', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'br', 'b', 'i']);
const problemas = [];

function sanear(html, ruta) {
  let h = String(html || '');
  // etiquetas no permitidas: fuera la etiqueta, se queda el texto
  h = h.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (tag, nombre) => {
    if (!PERMITIDAS.has(nombre.toLowerCase())) { problemas.push(`${ruta}: etiqueta <${nombre}> eliminada`); return ''; }
    if (nombre.toLowerCase() === 'a') {
      const href = (tag.match(/href="([^"]*)"/) || [])[1] || '';
      if (tag.startsWith('</')) return tag;
      if (!href.startsWith('/') || href.startsWith('//')) { problemas.push(`${ruta}: enlace externo quitado (${href})`); return ''; }
      const limpia = href.split('#')[0];
      const ok = porRuta.has(limpia) || porRuta.has(limpia.endsWith('/') ? limpia : `${limpia}/`);
      if (!ok) { problemas.push(`${ruta}: enlace a ruta inexistente quitado (${href})`); return ''; }
      return `<a href="${href}">`;
    }
    return tag;
  });
  // un <a> quitado deja su cierre huerfano
  h = h.replace(/<\/a>/g, (m, i, s) => (s.lastIndexOf('<a ', i) > s.lastIndexOf('</a>', i - 1) ? m : ''));
  return equilibrar(h.trim(), ruta);
}

/* Cierra las etiquetas que un redactor dejo abiertas (respuestas cortadas)
   y quita los cierres sin apertura, para que el HTML no descuadre la pagina. */
const VACIAS = new Set(['br']);
function equilibrar(html, ruta) {
  const pila = [];
  let salida = '';
  const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>|[^<]+|</g;
  let m;
  while ((m = re.exec(html))) {
    const trozo = m[0];
    if (!m[1]) { salida += trozo; continue; }
    const nombre = m[1].toLowerCase();
    if (VACIAS.has(nombre)) { salida += trozo; continue; }
    if (trozo.startsWith('</')) {
      const i = pila.lastIndexOf(nombre);
      if (i < 0) { problemas.push(`${ruta}: cierre </${nombre}> sin apertura quitado`); continue; }
      while (pila.length > i + 1) salida += `</${pila.pop()}>`;
      pila.pop();
      salida += trozo;
    } else { pila.push(nombre); salida += trozo; }
  }
  if (pila.length) problemas.push(`${ruta}: etiquetas sin cerrar (${pila.join(', ')}) cerradas al final`);
  while (pila.length) salida += `</${pila.pop()}>`;
  return salida;
}

/* Algun redactor metio los h3-pregunta DENTRO del html de su h2 en vez de
   como seccion aparte. Se sacan: cada <h2>/<h3>/<h4> incrustado abre una
   seccion nueva con el contenido que le sigue. */
function desplegar(secciones) {
  const salida = [];
  for (const s of secciones || []) {
    if (!s || !s.titulo) continue;
    const trozos = String(s.html || '').split(/(<h[2-4]\b[^>]*>[\s\S]*?<\/h[2-4]>)/i);
    salida.push({ ...s, html: trozos[0].trim() });
    for (let i = 1; i < trozos.length; i += 2) {
      const m = trozos[i].match(/<h([2-4])\b[^>]*>([\s\S]*?)<\/h[2-4]>/i);
      salida.push({ nivel: m[1] === '2' ? 'h2' : 'h3', titulo: m[2].replace(/<[^>]+>/g, '').trim(), html: (trozos[i + 1] || '').trim() });
    }
  }
  return salida.filter((s) => s.titulo);
}

const contarPalabras = (a) => [
  ...a.secciones.map((s) => `${s.titulo} ${s.html}`),
  ...((a.faq?.items || []).map((i) => `${i.pregunta} ${i.respuesta}`)),
].join(' ').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

let aplicadas = 0, saltadas = 0, sinPagina = 0;
const resumen = [];
for (const [ruta, a] of Object.entries(ampliaciones)) {
  const destino = porRuta.get(ruta);
  if (!destino) { sinPagina++; problemas.push(`${ruta}: no hay pagina`); continue; }
  if (!todas && !a.aprobado) {
    saltadas++;
    const borrar = quitar && destino.pagina.ampliacion;
    resumen.push(`${borrar ? 'QUITADA' : 'SALTADA'} ${ruta}: ${(a.problemas || []).slice(0, 2).join(' | ').slice(0, 160)}`);
    if (borrar && !seco) { delete destino.pagina.ampliacion; fs.writeFileSync(path.join(PAGINAS, destino.fichero), JSON.stringify(destino.pagina, null, 1)); }
    continue;
  }
  const ampliacion = {
    secciones: desplegar(a.secciones).map((s) => ({ nivel: s.nivel === 'h3' ? 'h3' : 'h2', titulo: String(s.titulo).trim(), html: sanear(s.html, ruta) })),
    faq: a.faq && a.faq.items?.length
      ? { titulo: String(a.faq.titulo || 'Preguntas frecuentes').trim(), items: a.faq.items.filter((i) => i && i.pregunta && i.respuesta).map((i) => ({ pregunta: String(i.pregunta).trim(), respuesta: sanear(i.respuesta, ruta) })) }
      : undefined,
  };
  if (!ampliacion.faq) delete ampliacion.faq;
  const palabras = contarPalabras(ampliacion);
  resumen.push(`OK ${ruta} — ${ampliacion.secciones.length} secciones, ${ampliacion.faq?.items.length || 0} FAQ, ${palabras} palabras${a.reescrita ? ' (reescrita)' : ''}`);
  if (!seco) {
    destino.pagina.ampliacion = ampliacion;
    fs.writeFileSync(path.join(PAGINAS, destino.fichero), JSON.stringify(destino.pagina, null, 1));
  }
  aplicadas++;
}

resumen.forEach((l) => console.log(l));
if (problemas.length) { console.log('\nAVISOS:'); problemas.forEach((p) => console.log('  ' + p)); }
console.log(`\n${seco ? '(seco) ' : ''}aplicadas: ${aplicadas} · saltadas (no aprobadas): ${saltadas} · sin pagina: ${sinPagina}`);
