/**
 * quitar-instagram.mjs — quita de las páginas el bloque del feed de Instagram
 * (plugin Smash Balloon, widget "sbi-widget" de Elementor), que enseña las
 * publicaciones de la cuenta de la empresa vieja con sus fotos en caché.
 * El título "Síguenos en Instagram" y su icono se quedan (enlazan al perfil
 * que diga marca.json → redes).
 *
 *   node scripts/quitar-instagram.mjs [--seco]
 */
import fs from 'node:fs';
import path from 'node:path';

const SECO = process.argv.includes('--seco');
const DIR = path.resolve('src/content/paginas');
const MARCA = 'data-widget_type="sbi-widget.default"';

// devuelve [inicio, fin) del <div class="elementor-element …"> que contiene la marca
function bloque(html, pos) {
  const ini = html.lastIndexOf('<div class="elementor-element', pos);
  if (ini < 0) return null;
  let nivel = 0;
  for (const m of html.slice(ini).matchAll(/<div\b|<\/div>/g)) {
    nivel += m[0] === '<div' ? 1 : -1;
    if (nivel === 0) return [ini, ini + m.index + m[0].length];
  }
  return null;
}

let paginas = 0, bloques = 0;
for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.html'))) {
  const ruta = path.join(DIR, f);
  let html = fs.readFileSync(ruta, 'utf8');
  if (!html.includes(MARCA)) continue;
  let n = 0, pos;
  while ((pos = html.indexOf(MARCA)) > -1) {
    const b = bloque(html, pos);
    if (!b) break;
    html = html.slice(0, b[0]) + html.slice(b[1]);
    n++;
  }
  // los guiones y hojas del plugin que ya no pintan nada
  html = html.replace(/<link[^>]*sb-instagram-feed[^>]*>\s*/g, '').replace(/<script[^>]*sb-instagram-feed[^>]*>(?:[\s\S]*?<\/script>)?\s*/g, '');
  paginas++; bloques += n;
  console.log(`${f}: ${n} bloque(s) de Instagram${SECO ? ' (en seco)' : ' quitado(s)'}`);
  if (!SECO) fs.writeFileSync(ruta, html);
}
console.log(`Páginas: ${paginas} · bloques: ${bloques}`);
