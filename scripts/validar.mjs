/**
 * validar.mjs — comprueba el 100 % de las paginas compiladas (dist/) contra
 * la web vieja (referencia/ y descargas/html/).
 *
 *   npm run build && node scripts/validar.mjs
 *
 * Pagina a pagina:
 *   1. existe en dist/ y no sobra ninguna
 *   2. los mismos <h1> que en vivo (regla aprobada: se conserva el H1 de cada
 *      pagina). 0 o 2+ es FALLO salvo las aprobadas en fallos-original.json
 *   3. texto visible identico al de la web vieja
 *   4. ningun enlace perdido ni anadido (mismos href)
 *   5. existe el fichero de cada cosa que la pagina pide a este dominio:
 *      fotos (src, srcset, fondos en style= y en los ajustes de Elementor),
 *      hojas y guiones. Los 404 del servidor viejo ya aprobados son aviso
 *   6. ningun shortcode literal [nombre …] en el texto visible
 *   7. canonical absoluto e igual al de la web vieja; si no es
 *      https://DOMINIO/ruta/ se avisa (lo decidio el original)
 *   8. og:url y og:image absolutos; <title> presente; robots igual que en vivo
 *   9. fuera de los datos estructurados no queda ninguna direccion absoluta
 *      al propio dominio en el <body>
 * Y una vez:
 *  10. existen los ficheros que piden las hojas de estilo con url()
 *  11. astro.config.mjs lleva trailingSlash 'always' y build.format 'directory'
 *
 * Informe completo en informes/validar.md. Sale con 1 si hay algun FALLO.
 */
import fs from 'node:fs';
import path from 'node:path';
import { crearRelativizador } from './lib/relativizar.mjs';

const RAIZ = path.resolve('.');
const DIST = path.join(RAIZ, 'dist');
const REF = path.join(RAIZ, 'referencia');
const CRUDA = path.join(RAIZ, 'descargas', 'html');
const PUBLICO = path.join(RAIZ, 'public');
const leer = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
const site = leer(path.join(RAIZ, 'src', 'data', 'site.json'), {});
const DOMINIO = site.dominio.replace(/\/$/, '');
const indice = leer(path.join(RAIZ, 'src', 'content', 'paginas', 'indice.json'), []);
const fo = leer(path.join(RAIZ, 'src', 'data', 'fallos-original.json'), {});
const rutasDe = (l) => new Set((l || []).map((x) => (typeof x === 'string' ? x : x.ruta)));
const aprobado = { h1: rutasDe(fo.h1), 404: rutasDe(fo['404']), shortcodes: new Set((fo.shortcodes || []).map((x) => x.nombre)) };
const { relativizar, contarHtml } = crearRelativizador(DOMINIO);
const contar = contarHtml;

if (!fs.existsSync(DIST)) { console.error('falta dist/ — ejecuta antes: npm run build'); process.exit(1); }
if (!indice.length) { console.error('falta src/content/paginas/indice.json — ejecuta antes scripts/partir-paginas.mjs'); process.exit(1); }

const fallos = [], avisos = [];
const fichero = (base, ruta) => path.join(base, ...ruta.split('/').filter(Boolean), 'index.html');
const cuerpoDe = (h) => (h.match(/<body\b[^>]*>([\s\S]*)<\/body>/i) || [, h])[1];
const sinGuiones = (h) => h.replace(/<(script|style|template|noscript)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
const entidades = (t) => t.replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;|&#0?38;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
const texto = (h) => entidades(sinGuiones(h).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const h1s = (h) => [...sinGuiones(h).matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => texto(m[1]));
const hrefs = (h) => [...sinGuiones(h).matchAll(/<a\b[^>]*?\shref=(?:"([^"]*)"|'([^']*)')/gi)].map((m) => entidades(relativizar(m[1] ?? m[2])));
const meta = (h, rx) => (h.match(rx) || [, ''])[1];
const existeCache = new Map();
const existe = (ruta) => {
  if (existeCache.has(ruta)) return existeCache.get(ruta);
  let limpia = ruta.split('?')[0].split('#')[0];
  try { limpia = decodeURIComponent(limpia); } catch {}
  const ok = fs.existsSync(path.join(PUBLICO, limpia)) || fs.existsSync(path.join(DIST, limpia));
  existeCache.set(ruta, ok);
  return ok;
};
/** Todo lo que el HTML pide a este dominio y es un fichero (tiene extension). */
function recursos(html) {
  const s = new Set();
  const plano = html.replace(/\\\//g, '/').replace(/&quot;/g, '"').replace(/&#0?38;|&amp;/g, '&');
  const anadir = (u) => {
    u = (u || '').trim();
    if (!u.startsWith('/') || u.startsWith('//')) return;
    const limpia = u.split('?')[0].split('#')[0];
    if (/\.(css|js|jpe?g|png|webp|gif|svg|avif|ico|woff2?|ttf|otf|eot|mp4|webm|mov|pdf)$/i.test(limpia)) s.add(limpia);
  };
  for (const m of plano.matchAll(/\b(?:src|href|data-src|data-bg|data-background|poster)=["']([^"']+)["']/gi)) anadir(m[1]);
  for (const m of plano.matchAll(/\b(?:srcset|data-srcset)=["']([^"']+)["']/gi)) for (const t of m[1].split(',')) anadir(t.trim().split(/\s+/)[0]);
  for (const m of plano.matchAll(/url\((['"]?)([^)'"]+)\1\)/gi)) anadir(m[2]);
  for (const m of plano.matchAll(/["'](\/wp-(?:content|includes)\/[^"'\s)<>]+)["']/g)) anadir(m[1]);
  return s;
}

const faltanFicheros = new Map(); // ruta del fichero -> paginas
let n = 0, canonOtros = 0;
for (const p of indice) {
  const ruta = p.ruta;
  const fd = fichero(DIST, ruta), fr = fichero(REF, ruta), fc = fichero(CRUDA, ruta);
  if (!fs.existsSync(fd)) { fallos.push(`${ruta} — no esta en dist/`); continue; }
  if (!fs.existsSync(fr)) { fallos.push(`${ruta} — no esta en referencia/`); continue; }
  n++;
  const nueva = fs.readFileSync(fd, 'utf8');
  const vieja = fs.readFileSync(fr, 'utf8');
  const cruda = fs.existsSync(fc) ? fs.readFileSync(fc, 'utf8') : '';
  const cn = cuerpoDe(nueva), cv = cuerpoDe(vieja);

  // 2. H1
  const hn = h1s(cn), hv = h1s(cv);
  if (JSON.stringify(hn) !== JSON.stringify(hv)) fallos.push(`${ruta} — los <h1> no son los de la web vieja: nueva ${JSON.stringify(hn).slice(0, 120)} / vieja ${JSON.stringify(hv).slice(0, 120)}`);
  if (hv.length !== 1) {
    const msg = `${ruta} — ${hv.length} <h1>, como en la web vieja`;
    if (hv.length === 0 && aprobado.h1.has(ruta)) avisos.push(msg + ' (fallo del original aprobado)');
    else if (/^\/(en|it|fr|pl)\//.test(ruta) && hv.length === 0) avisos.push(msg + ' (traduccion de una pagina aprobada sin H1)');
    else fallos.push(msg + ' y NO esta aprobado en fallos-original.json');
  }
  // 3. texto visible
  const tn = texto(cn), tv = texto(cv);
  if (tn !== tv) {
    let i = 0; while (i < tn.length && tn[i] === tv[i]) i++;
    fallos.push(`${ruta} — el texto visible cambia en el caracter ${i}: nueva «${tn.slice(Math.max(0, i - 30), i + 40)}» / vieja «${tv.slice(Math.max(0, i - 30), i + 40)}»`);
  }
  // 4. enlaces
  const en = hrefs(cn), ev = hrefs(cv);
  if (JSON.stringify(en) !== JSON.stringify(ev)) {
    const sv = new Set(ev), sn = new Set(en);
    const perdidos = [...sv].filter((x) => !sn.has(x)), nuevos = [...sn].filter((x) => !sv.has(x));
    fallos.push(`${ruta} — enlaces distintos: ${perdidos.length} perdidos ${perdidos.slice(0, 2).join(' ')} · ${nuevos.length} anadidos ${nuevos.slice(0, 2).join(' ')}${!perdidos.length && !nuevos.length ? ' (mismo conjunto, otro orden o numero)' : ''}`);
  }
  if (/<a\b[^>]*\shref=""/i.test(sinGuiones(cn)) && !/<a\b[^>]*\shref=""/i.test(sinGuiones(cv))) fallos.push(`${ruta} — aparece un href vacio que no estaba`);
  // 5. ficheros
  for (const r of recursos(nueva)) if (!existe(r)) { if (!faltanFicheros.has(r)) faltanFicheros.set(r, []); faltanFicheros.get(r).push(ruta); }
  // 6. shortcodes literales
  const sc = [...tn.matchAll(/\[([a-z][a-z0-9_-]{2,})(?:\s[^\]]{0,80})?\]/g)].map((m) => m[0]);
  if (sc.length) {
    const msg = `${ruta} — shortcode literal en el texto: ${[...new Set(sc)].slice(0, 3).join(' ')}`;
    // si ya se veia asi en la web vieja y esta apuntado en fallos-original.json, es aviso
    if (sc.every((x) => tv.includes(x) && aprobado.shortcodes.has(x.slice(1).split(/[\s\]]/)[0]))) avisos.push(msg + ' (asi en la web vieja; apuntado en fallos-original.json)'); else fallos.push(msg);
  }
  // 7. canonical
  const rxCanon = /<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i;
  const canN = meta(nueva, rxCanon), canV = meta(cruda || vieja, rxCanon);
  if (!canN) { if (canV) fallos.push(`${ruta} — sin canonical (la vieja lo tenia)`); }
  else {
    if (!/^https:\/\//.test(canN)) fallos.push(`${ruta} — canonical no absoluto: ${canN}`);
    if (cruda && canN !== canV) fallos.push(`${ruta} — canonical distinto del original: ${canN} / ${canV}`);
    if (canN !== DOMINIO + ruta) { canonOtros++; avisos.push(`${ruta} — el canonical del original apunta a otra direccion: ${canN}`); }
  }
  // 8. sociales, title, robots
  const ogUrl = meta(nueva, /<meta\b[^>]*property=["']og:url["'][^>]*content=["']([^"']*)["']/i);
  const ogImg = meta(nueva, /<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i);
  if (ogUrl && !/^https:\/\//.test(ogUrl)) fallos.push(`${ruta} — og:url no absoluto`);
  if (ogImg && !/^https:\/\//.test(ogImg)) fallos.push(`${ruta} — og:image no absoluto`);
  if (!/<title>[^<]{3,}<\/title>/i.test(nueva)) fallos.push(`${ruta} — sin <title>`);
  const rxRobots = /<meta\b[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i;
  if (meta(nueva, rxRobots) !== meta(vieja, rxRobots)) fallos.push(`${ruta} — robots distinto: ${meta(nueva, rxRobots)} / ${meta(vieja, rxRobots)}`);
  if (!/<meta\b[^>]*name=["']description["'][^>]*content=["'][^"']{20,}/i.test(nueva) && !/noindex/.test(meta(nueva, rxRobots))) avisos.push(`${ruta} — sin meta descripcion (tampoco en la vieja)`);
  // 9. absolutas sueltas en el cuerpo
  const sueltas = contar(cn.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, ''));
  if (sueltas) fallos.push(`${ruta} — ${sueltas} direccion(es) absoluta(s) al propio dominio en el cuerpo`);
  // ...y, por si el lector de etiquetas se saltara alguna, la comprobacion directa
  const directas = (cn.match(/\s(?:href|src|action|data-src)=["']https?:\/\/(?:www\.)?valenciaandgo\.com/gi) || []).length;
  if (directas) fallos.push(`${ruta} — ${directas} atributo(s) href/src que siguen apuntando al dominio viejo`);
}

// 1. sobran
const enIndice = new Set(indice.map((p) => p.ruta));
const sobran = [];
const recorrer = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!/^(wp-content|wp-includes|_astro|fontawesome)$/.test(e.name) || dir !== DIST) recorrer(p); }
    else if (e.name === 'index.html') { const r = '/' + path.relative(DIST, dir).replace(/\\/g, '/') + '/'; const ruta = r === '//' ? '/' : r; if (!enIndice.has(ruta)) sobran.push(ruta); }
  }
};
recorrer(DIST);
for (const r of sobran) fallos.push(`${r} — esta en dist/ y no en la web vieja`);

// 5. ficheros que faltan
for (const [r, pags] of [...faltanFicheros].sort()) {
  const msg = `falta el fichero ${r} (lo piden ${pags.length} paginas, p. ej. ${pags[0]})`;
  if (aprobado[404].has(r)) avisos.push(msg + ' — tampoco existe en el servidor viejo (aprobado)'); else fallos.push(msg);
}

// 10. url() de las hojas
let hojas = 0;
const faltanCss = new Map();
const recorrerCss = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { recorrerCss(p); continue; }
    if (!e.name.endsWith('.css')) continue;
    hojas++;
    const base = 'http://x/' + path.relative(PUBLICO, p).replace(/\\/g, '/');
    for (const m of fs.readFileSync(p, 'utf8').matchAll(/url\((['"]?)([^)'"]+)\1\)/gi)) {
      const u = m[2].trim();
      if (/^(data:|https?:|\/\/|#|about:)/i.test(u)) continue;
      let ruta; try { ruta = decodeURIComponent(new URL(u, base).pathname); } catch { continue; }
      if (!fs.existsSync(path.join(PUBLICO, ruta))) { if (!faltanCss.has(ruta)) faltanCss.set(ruta, []); faltanCss.get(ruta).push('/' + path.relative(PUBLICO, p).replace(/\\/g, '/')); }
    }
  }
};
recorrerCss(PUBLICO);
for (const [r, hs] of [...faltanCss].sort()) {
  const msg = `falta ${r}, que pide con url() la hoja ${hs[0]}${hs.length > 1 ? ` (y ${hs.length - 1} mas)` : ''}`;
  if (aprobado[404].has(r)) avisos.push(msg + ' (aprobado)'); else fallos.push(msg);
}

// 12. los mapas del sitio: cada direccion tiene que ser una pagina de la copia o una redireccion
const redirecciones = new Set((leer(path.join(RAIZ, 'src', 'data', 'redirecciones.json'), { lista: [] }).lista).map((r) => r.de.replace(/\/$/, '') || '/'));
let enMapas = 0;
for (const f of fs.existsSync(PUBLICO) ? fs.readdirSync(PUBLICO).filter((x) => /sitemap.*\.xml$/.test(x) && x !== 'sitemap_index.xml') : []) {
  for (const m of fs.readFileSync(path.join(PUBLICO, f), 'utf8').matchAll(/<url>\s*<loc>([^<]+)<\/loc>/g)) {
    enMapas++;
    const ruta = m[1].trim().replace(DOMINIO, '') || '/';
    if (!enIndice.has(ruta) && !redirecciones.has(ruta.replace(/\/$/, '') || '/')) fallos.push(`${ruta} — esta en el mapa del sitio ${f} y no es pagina ni redireccion`);
  }
}
if (!enMapas) avisos.push('no hay mapas del sitio en public/ (scripts/sitemaps.mjs)');

// 11. configuracion
const cfg = fs.readFileSync(path.join(RAIZ, 'astro.config.mjs'), 'utf8');
if (!/trailingSlash:\s*'always'/.test(cfg)) fallos.push("astro.config.mjs sin trailingSlash: 'always'");
if (!/format:\s*'directory'/.test(cfg)) fallos.push("astro.config.mjs sin build.format: 'directory'");

const lineas = [
  `# Validacion — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, '',
  `Paginas revisadas: ${n} de ${indice.length}. Hojas de estilo revisadas: ${hojas}. FALLOS: ${fallos.length}. Avisos: ${avisos.length}.`,
  `Canonical que el original apunta a otra direccion: ${canonOtros}.`, '',
  `## FALLOS (${fallos.length})`, ...fallos.map((x) => '- ' + x), '',
  `## Avisos (${avisos.length})`, ...avisos.map((x) => '- ' + x),
];
fs.mkdirSync(path.join(RAIZ, 'informes'), { recursive: true });
fs.writeFileSync(path.join(RAIZ, 'informes', 'validar.md'), lineas.join('\n') + '\n');
console.log(`validar: ${n} paginas, ${hojas} hojas; FALLOS ${fallos.length}, avisos ${avisos.length} -> informes/validar.md`);
const porClase = {};
for (const f of fallos) { const k = f.replace(/^\S+ — /, '').replace(/[«:(].*$/, '').replace(/\d+/g, 'N').trim().slice(0, 60); porClase[k] = (porClase[k] || 0) + 1; }
for (const [k, c] of Object.entries(porClase).sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${String(c).padStart(5)}  ${k}`);
for (const f of fallos.slice(0, 6)) console.log('  FALLO ' + f.slice(0, 260));
process.exit(fallos.length ? 1 : 0);
