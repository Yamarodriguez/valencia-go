/**
 * seo-arreglos.mjs — arreglos de SEO en paginas concretas (28-10-2026), segun
 * src/data/seo.json "arreglos". Toca las piezas de src/content/paginas/ y se
 * puede repetir (lo ya arreglado no se vuelve a tocar).
 *
 *   node scripts/seo-arreglos.mjs [--seco]
 *
 * - titulos: pagina -> titulo nuevo. Cambia <title>, og:title/twitter:title y
 *   el mismo texto dentro de los datos estructurados de la cabeza.
 * - h1: paginas sin H1 cuyo titulo visible es un widget de texto de Elementor
 *   (data-id = widget). Su texto pasa a ir dentro de un <h1> que hereda letra,
 *   color y margenes del widget: se ve igual, pero Google y las IA ya saben
 *   cual es el titulo.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('.');
const DIR = path.join(RAIZ, 'src', 'content', 'paginas');
const SECO = process.argv.includes('--seco');
const seo = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', 'seo.json'), 'utf8'));
const indice = JSON.parse(fs.readFileSync(path.join(DIR, 'indice.json'), 'utf8'));
const { titulos = {}, h1 = [] } = seo.arreglos || {};

const leer = (n) => fs.readFileSync(path.join(DIR, n + '.html'), 'utf8');
const pieza = (texto, nombre) => {
  const marca = `\n<!--@@${nombre}@@-->\n`;
  const a = texto.indexOf(marca);
  if (a < 0) return null;
  const ini = a + marca.length;
  const fin = texto.indexOf('\n<!--@@', ini);
  return { ini, fin: fin < 0 ? texto.length : fin };
};
const escAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const escJson = (s) => JSON.stringify(s).slice(1, -1).replace(/\//g, '\\/');

let cambios = 0;
for (const [nombre, nuevo] of Object.entries(titulos)) {
  if (!indice.some((p) => p.nombre === nombre)) { console.log(`  FALTA la pagina ${nombre}`); continue; }
  const texto = leer(nombre);
  const z = pieza(texto, 'cabeza');
  let cab = texto.slice(z.ini, z.fin);
  const m = cab.match(/<title>([\s\S]*?)<\/title>/);
  if (!m) { console.log(`  ${nombre}: sin <title>`); continue; }
  const viejo = m[1].trim();
  if (viejo === nuevo) continue;
  cab = cab.replace(m[0], `<title>${nuevo}</title>`);
  const plano = (s) => s.replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  cab = cab.replace(/(<meta[^>]+(?:og|twitter):title"? content=")([^"]*)(")/g, (t, a, v, b) => (plano(v) === plano(viejo) ? a + escAttr(nuevo) + b : t));
  cab = cab.replace(/("name"\s*:\s*")((?:[^"\\]|\\.)*)(")/g, (t, a, v, b) => {
    let claro = v;
    try { claro = JSON.parse(`"${v}"`); } catch { /* se compara tal cual */ }
    return claro === viejo ? a + escJson(nuevo) + b : t;
  });
  console.log(`  titulo ${nombre}: "${viejo}" -> "${nuevo}"`);
  cambios++;
  if (!SECO) fs.writeFileSync(path.join(DIR, nombre + '.html'), texto.slice(0, z.ini) + cab + texto.slice(z.fin));
}

for (const regla of h1) {
  const re = new RegExp(regla.paginas);
  const widget = new RegExp(`(data-id="${regla.widget}"[^>]*data-widget_type="text-editor\\.default">)([\\s\\S]*?)(</div>)`);
  for (const p of indice.filter((x) => re.test(x.nombre.split('--').pop()))) {
    const texto = leer(p.nombre);
    const z = pieza(texto, 'contenido');
    const con = texto.slice(z.ini, z.fin);
    if (/<h1[\s>]/i.test(con)) continue;
    const m = con.match(widget);
    if (!m) { console.log(`  ${p.ruta}: no encuentro el widget ${regla.widget}`); continue; }
    const dentro = m[2].trim().replace(/^<p>([\s\S]*)<\/p>$/, '$1');
    if (/<(?!\/?(?:span|strong|b|em|i|br)\b)/i.test(dentro)) { console.log(`  ${p.ruta}: el widget lleva bloques, no se toca`); continue; }
    const h = `<h1 style="font:inherit;color:inherit;letter-spacing:inherit;text-transform:inherit;margin:0">${dentro}</h1>`;
    console.log(`  h1 ${p.ruta}: ${dentro.replace(/<[^>]+>/g, '').slice(0, 60)}`);
    cambios++;
    if (!SECO) fs.writeFileSync(path.join(DIR, p.nombre + '.html'), texto.slice(0, z.ini) + con.replace(m[0], m[1] + h + m[3]) + texto.slice(z.fin));
  }
}
console.log(`seo-arreglos: ${cambios} cambios${SECO ? ' (en seco, nada escrito)' : ''}`);
