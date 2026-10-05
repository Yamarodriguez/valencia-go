/**
 * css-original.mjs — monta css-original/ con las hojas REALES de la web vieja,
 * en el orden exacto en que las cargaba el <head> (y el cuerpo) de la portada
 * sin cache, que es la unica pagina que llego cruda (LiteSpeed combina las
 * demas).
 *
 *   node scripts/css-original.mjs
 *
 * De referencia/ (lo baja scripts/montar-referencia.mjs) a:
 *   css-original/comunes/NN-<id>.css        hojas <link> y <style id> propias, numeradas por orden
 *   css-original/comunes/NN-fontawesome.css Font Awesome 6.4.0 desde npm, en el sitio del cdn
 *   css-original/paginas/post-ID.css        la hoja de cada pagina y de cada plantilla de
 *                                           Elementor (cabeceras, pie, popups, entrada, archivo...)
 *   css-original/orden.json                 { corte, tipografias, lista }: donde va la hoja de la
 *                                           pagina (CORTE) y donde iban las letras de Google
 *
 * Las plantillas que cambian segun el tipo de pagina (las dos cabeceras, la de
 * entrada, las de archivo y producto) NO van en comunes: van en paginas/ y el
 * motor las engancha segun el tipo (Fase 2). Las que llevan todas las paginas
 * (kit 67, pie 8452, popups 9717/10535/9016) si van en comunes.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('.');
const REF = path.join(RAIZ, 'referencia');
const DESTINO = path.join(RAIZ, 'css-original');
const PORTADA = path.join(REF, 'index.html');
const FA_NPM = path.join(RAIZ, 'node_modules', '@fortawesome', 'fontawesome-free', 'css', 'all.min.css');
// hojas de plantilla que cargan TODAS las paginas (se quedan en comunes)
const EN_TODAS = new Set(['67', '8452', '9717', '10535', '9016']);

if (!fs.existsSync(PORTADA)) { console.error('falta referencia/index.html'); process.exit(1); }
const html = fs.readFileSync(PORTADA, 'utf8');
const nLinks = (html.match(/<link rel=['"]stylesheet['"]/g) || []).length;
if (nLinks < 20) { console.error(`la portada de referencia/ solo tiene ${nLinks} <link rel=stylesheet>: esta pasada por LiteSpeed, no sirve de patron`); process.exit(1); }

// id de la pagina (post-ID.css propio) desde el body
const idPagina = (html.match(/elementor-page-(\d+)/) || [])[1];

fs.rmSync(DESTINO, { recursive: true, force: true });
fs.mkdirSync(path.join(DESTINO, 'comunes'), { recursive: true });
fs.mkdirSync(path.join(DESTINO, 'paginas'), { recursive: true });

const lista = [];
let n = 0, corte = 0, tipografias = 0, faltan = 0;
const rx = /<link rel=['"]stylesheet['"] id=['"]([^'"]+)['"] href=['"]([^'"]+)['"][^>]*>|<style id=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/style>/g;
for (const m of html.matchAll(rx)) {
  if (m[1]) {
    const id = m[1].replace(/-css$/, '');
    let href = m[2].replace(/&#0?38;|&amp;/g, '&');
    const esPost = href.match(/elementor\/css\/post-(\d+)\.css/);
    if (/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome/.test(href)) {
      n++;
      const nombre = `${String(n).padStart(2, '0')}-fontawesome.css`;
      if (!fs.existsSync(FA_NPM)) { console.error('falta @fortawesome/fontawesome-free en node_modules: npm install'); process.exit(1); }
      fs.copyFileSync(FA_NPM, path.join(DESTINO, 'comunes', nombre));
      lista.push({ n, id, origen: href, destino: 'comunes/' + nombre, nota: 'desde npm 6.4.0' });
      continue;
    }
    if (/^https?:\/\/(?!(www\.)?valenciaandgo\.com)/.test(href) || (/^\/\//.test(href) && !/valenciaandgo\.com/.test(href))) {
      lista.push({ id, origen: href, nota: 'externa, no se copia' });
      continue;
    }
    const ruta = href.replace(/^(https?:)?\/\/(www\.)?valenciaandgo\.com/, '').replace(/[?#].*$/, '');
    const origen = path.join(REF, ruta);
    if (!fs.existsSync(origen)) { faltan++; lista.push({ id, origen: ruta, nota: 'FALTA en referencia/' }); continue; }
    if (esPost && (esPost[1] === idPagina || !EN_TODAS.has(esPost[1]))) {
      // la hoja de ESTA pagina marca el corte; las plantillas por tipo van a paginas/
      if (esPost[1] === idPagina) corte = n;
      fs.copyFileSync(origen, path.join(DESTINO, 'paginas', `post-${esPost[1]}.css`));
      lista.push({ id, origen: ruta, destino: `paginas/post-${esPost[1]}.css`, nota: esPost[1] === idPagina ? 'la pagina (CORTE)' : 'plantilla por tipo' });
      continue;
    }
    n++;
    if (/google-fonts\/css\//.test(ruta) && !tipografias) tipografias = n;
    const nombre = `${String(n).padStart(2, '0')}-${/google-fonts\/css\//.test(ruta) ? 'elementor-gf-' : ''}${id}.css`;
    fs.copyFileSync(origen, path.join(DESTINO, 'comunes', nombre));
    lista.push({ n, id, origen: ruta, destino: 'comunes/' + nombre });
  } else {
    n++;
    const id = m[3];
    const nombre = `${String(n).padStart(2, '0')}-inline-${id}.css`;
    fs.writeFileSync(path.join(DESTINO, 'comunes', nombre), m[4].trim() + '\n');
    lista.push({ n, id, destino: 'comunes/' + nombre, nota: '<style> en linea' });
  }
}

// todas las post-ID.css que bajo el montador (paginas y plantillas)
const dirPost = path.join(REF, 'wp-content', 'uploads', 'elementor', 'css');
let hojasPagina = 0;
if (fs.existsSync(dirPost)) {
  for (const f of fs.readdirSync(dirPost)) {
    if (!/^post-\d+\.css$/.test(f)) continue;
    const id = f.match(/\d+/)[0];
    if (EN_TODAS.has(id)) continue;
    fs.copyFileSync(path.join(dirPost, f), path.join(DESTINO, 'paginas', f));
    hojasPagina++;
  }
}

fs.writeFileSync(path.join(DESTINO, 'orden.json'), JSON.stringify({ corte, tipografias, paginaPatron: idPagina, lista }, null, 1));
console.log(`css-original/comunes: ${n} hojas (corte en la ${corte}, letras de Google en la ${tipografias}); paginas/: ${hojasPagina} post-ID.css; faltan ${faltan}`);
process.exit(faltan ? 1 : 0);
