/**
 * seo-arreglos.mjs — arreglos de SEO en paginas concretas (28-10-2026), segun
 * src/data/seo.json "arreglos". Toca las piezas de src/content/paginas/ y se
 * puede repetir (lo ya arreglado no se vuelve a tocar).
 *
 *   node scripts/seo-arreglos.mjs [--seco]
 *
 * - titulos: pagina -> titulo nuevo. Cambia <title>, og:title/twitter:title y
 *   el mismo texto dentro de los datos estructurados de la cabeza.
 * - src/data/seo-metas.json: ruta -> titulo y/o descripcion. La descripcion
 *   cambia la <meta name="description">, og:/twitter:description y el mismo
 *   texto en los datos estructurados; si no habia, la anade.
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

const plano = (s) => s.replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&#8217;/g, '’').replace(/&amp;/g, '&').trim();
// cambia el valor de las <meta> (atributo `clave` = una de `nombres`) y de las
// claves JSON `campo` cuyo texto era `viejo`
const cambiarMetas = (cab, nombres, viejo, nuevo) => cab.replace(
  new RegExp(`(<meta[^>]+(?:name|property)=["'](?:${nombres})["'] content=")([^"]*)(")`, 'g'),
  (t, a, v, b) => (viejo === null || plano(v) === plano(viejo) ? a + escAttr(nuevo) + b : t));
const cambiarJson = (cab, campo, viejo, nuevo) => cab.replace(
  new RegExp(`("${campo}"\\s*:\\s*")((?:[^"\\\\]|\\\\.)*)(")`, 'g'),
  (t, a, v, b) => {
    let claro = v;
    try { claro = JSON.parse(`"${v}"`); } catch { /* se compara tal cual */ }
    return plano(claro) === plano(viejo) ? a + escJson(nuevo) + b : t;
  });

// tareas: los "titulos" de seo.json (por nombre de pagina) y src/data/seo-metas.json (por ruta)
const metas = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', 'seo-metas.json'), 'utf8'));
const porRuta = new Map(indice.map((p) => [p.ruta, p.nombre]));
const tareas = [
  ...Object.entries(titulos).map(([nombre, titulo]) => ({ nombre, titulo })),
  ...Object.entries(metas).filter(([r]) => r.startsWith('/')).map(([ruta, v]) => ({ nombre: porRuta.get(ruta), ruta, ...v })),
];

let cambios = 0;
for (const t of tareas) {
  if (!t.nombre || !indice.some((p) => p.nombre === t.nombre)) { console.log(`  FALTA la pagina ${t.ruta || t.nombre}`); continue; }
  const texto = leer(t.nombre);
  const z = pieza(texto, 'cabeza');
  let cab = texto.slice(z.ini, z.fin);
  const antes = cab;
  if (t.titulo) {
    const m = cab.match(/<title>([\s\S]*?)<\/title>/);
    const viejo = m ? plano(m[1]) : '';
    if (m && viejo !== t.titulo) {
      cab = cab.replace(m[0], () => `<title>${t.titulo.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title>`);
      cab = cambiarMetas(cab, 'og:title|twitter:title', viejo, t.titulo);
      cab = cambiarJson(cab, 'name', viejo, t.titulo);
      console.log(`  titulo ${t.ruta || t.nombre}: "${viejo}" -> "${t.titulo}"`);
    }
  }
  if (t.descripcion) {
    const m = cab.match(/<meta name="description" content="([^"]*)"/);
    const viejo = m ? plano(m[1]) : null;
    if (viejo !== t.descripcion) {
      if (m) {
        cab = cambiarMetas(cab, 'description|og:description|twitter:description', viejo, t.descripcion);
        cab = cambiarJson(cab, 'description', viejo, t.descripcion);
      } else {
        // sin descripcion: se pone detras del <title>, y la de redes si no la hay
        const og = /property="og:description"/.test(cab) ? '' : `\n\t<meta property="og:description" content="${escAttr(t.descripcion)}" />`;
        cab = cab.replace(/<\/title>/, () => `</title>\n\t<meta name="description" content="${escAttr(t.descripcion)}" />${og}`);
      }
      console.log(`  descripcion ${t.ruta || t.nombre}${m ? '' : ' (nueva)'}`);
    }
  }
  if (cab === antes) continue;
  cambios++;
  if (!SECO) fs.writeFileSync(path.join(DIR, t.nombre + '.html'), texto.slice(0, z.ini) + cab + texto.slice(z.fin));
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
