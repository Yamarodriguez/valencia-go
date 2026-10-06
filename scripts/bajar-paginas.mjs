/**
 * bajar-paginas.mjs — baja el HTML LIMPIO (sin LiteSpeed) de todas las paginas
 * de la web vieja.
 *
 *   node scripts/bajar-paginas.mjs [--solo-faltan] [--rutas /a/,/b/] [--lista fichero.txt] [--hilos 2] [--404]
 *
 * La web vieja lleva LiteSpeed Cache, que combina las hojas, retrasa los
 * guiones y hace perezosas las fotos. Con ?LSCWP_CTRL=before_optm el servidor
 * devuelve la pagina tal como la genera WordPress, antes de optimizarla. Ese
 * HTML es el original de la copia fiel.
 *
 * Que paginas: todas las rutas de src/data/tipos.json (o --rutas).
 * Donde:  descargas/html/<ruta>/index.html   el HTML tal cual llega (con las
 *                                            direcciones absolutas: de aqui
 *                                            salen canonical, hreflang, og:)
 *         referencia/<ruta>/index.html       copia para servir en local; la
 *                                            completa y reescribe montar-referencia.mjs
 * Ritmo lento a proposito (2 hilos, 400 ms, 3 reintentos): cada peticion la
 * pinta PHP entera, sin cache.
 * Se descarta y se reintenta lo que llegue con menos de 5.000 caracteres o
 * todavia optimizado (CSS combinado o data-lazyloaded).
 * Quita de dentro del HTML el propio parametro (?LSCWP_CTRL=before_optm) alli
 * donde WordPress lo haya copiado a un enlace.
 * Informe en informes/bajar-paginas.md. Sale con 1 si alguna pagina falla.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('.');
const site = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', 'site.json'), 'utf8'));
const DOMINIO = site.dominio.replace(/\/$/, '');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const HILOS = Number(arg('--hilos', 2));
const ESPERA = 400;
const SOLO_FALTAN = process.argv.includes('--solo-faltan');
const PARAM = 'LSCWP_CTRL=before_optm';
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 (migracion a Astro)' };
const CRUDA = path.join(RAIZ, 'descargas', 'html');
const REF = path.join(RAIZ, 'referencia');

let rutas = [];
const rutasArg = arg('--rutas', '');
const listaArg = arg('--lista', '');
if (rutasArg) rutas = rutasArg.split(',').map((r) => r.trim()).filter(Boolean);
else if (listaArg) rutas = fs.readFileSync(path.resolve(listaArg), 'utf8').split(/\r?\n/).map((r) => r.trim()).filter((r) => r.startsWith('/'));
else {
  const tipos = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', 'tipos.json'), 'utf8'));
  rutas = [...new Set(Object.values(tipos).flat())];
}

const fichero = (base, ruta) => path.join(base, ...ruta.split('/').filter(Boolean), 'index.html');
const estaLimpio = (h) => h.length >= 5000 && !h.includes('/wp-content/litespeed/css/') && !h.includes('data-lazyloaded') && (h.match(/rel=['"]stylesheet['"]/g) || []).length >= 15;
const quitarParam = (h) => {
  let n = 0;
  const rx = [/\?LSCWP_CTRL=before_optm(&#0?38;|&amp;|&)/g, /(\?|&#0?38;|&amp;|&)LSCWP_CTRL=before_optm/g, /(\\u0026|%26|%3F)LSCWP_CTRL(=|%3D)before_optm/gi];
  h = h.replace(rx[0], () => { n++; return '?'; }).replace(rx[1], () => { n++; return ''; }).replace(rx[2], () => { n++; return ''; });
  return { h, n };
};

const res = { ok: 0, ya: 0, fallo: [], conParam: 0, quedanParam: [] };
async function bajar(ruta) {
  const destino = fichero(CRUDA, ruta);
  if (SOLO_FALTAN && fs.existsSync(destino) && estaLimpio(fs.readFileSync(destino, 'utf8'))) { res.ya++; return; }
  let motivo = '';
  for (let intento = 1; intento <= 3; intento++) {
    try {
      const r = await fetch(`${DOMINIO}${encodeURI(ruta)}?${PARAM}`, { headers: UA, redirect: 'manual', signal: AbortSignal.timeout(60000) });
      if (r.status >= 300 && r.status < 400) { motivo = `redirige (${r.status}) a ${r.headers.get('location')}`; break; }
      if (r.status !== 200) throw new Error('HTTP ' + r.status);
      let h = await r.text();
      if (!estaLimpio(h)) throw new Error(h.length < 5000 ? `corta (${h.length})` : 'llega optimizada por LiteSpeed');
      const q = quitarParam(h); h = q.h; res.conParam += q.n;
      if (h.includes('LSCWP_CTRL')) res.quedanParam.push(ruta);
      for (const base of [CRUDA, REF]) { const f = fichero(base, ruta); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, h); }
      res.ok++;
      return;
    } catch (e) { motivo = e.message || String(e); await new Promise((f) => setTimeout(f, 2500 * intento)); }
  }
  res.fallo.push(`${ruta} — ${motivo}`);
}

const t0 = Date.now();
let i = 0;
const obrero = async () => { while (i < rutas.length) { const r = rutas[i++]; await bajar(r); await new Promise((f) => setTimeout(f, ESPERA)); if (i % 50 === 0) console.log(`  ${i}/${rutas.length} (${res.ok} bien, ${res.fallo.length} fallos)`); } };
await Promise.all(Array.from({ length: HILOS }, obrero));

// La pagina de error 404 de la web vieja (se pide una direccion que no existe).
const SLUG_404 = 'pagina-que-no-existe-para-el-404';
let error404 = 'no pedida';
if ((!rutasArg && !listaArg) || process.argv.includes('--404')) {
  try {
    const r = await fetch(`${DOMINIO}/${SLUG_404}/?${PARAM}`, { headers: UA, signal: AbortSignal.timeout(60000) });
    let h = await r.text();
    if (r.status !== 404) throw new Error('devuelve ' + r.status + ' en vez de 404');
    if (!estaLimpio(h)) throw new Error('llega optimizada o corta');
    h = quitarParam(h).h;
    const f404 = path.join(RAIZ, 'descargas', 'html-404', 'index.html');
    fs.mkdirSync(path.dirname(f404), { recursive: true });
    fs.writeFileSync(f404, h);
    error404 = 'bajada (' + h.length + ' caracteres)';
  } catch (e) { error404 = 'FALLO: ' + (e.message || e); res.fallo.push('pagina 404 — ' + (e.message || e)); }
}

const lineas = [
  `# Descarga del HTML limpio — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, '',
  `Rutas: ${rutas.length}. Bajadas: ${res.ok}. Ya estaban: ${res.ya}. Fallos: ${res.fallo.length}. Tiempo: ${((Date.now() - t0) / 60000).toFixed(1)} min.`,
  `El parametro se quito de ${res.conParam} sitios dentro del HTML; queda en ${res.quedanParam.length} paginas.`,
  `Pagina de error 404: ${error404}.`, '',
  `## Fallos (${res.fallo.length})`, ...res.fallo.map((x) => '- ' + x), '',
  `## Paginas donde aun aparece LSCWP_CTRL (${res.quedanParam.length})`, ...res.quedanParam.map((x) => '- ' + x),
];
fs.mkdirSync(path.join(RAIZ, 'informes'), { recursive: true });
fs.writeFileSync(path.join(RAIZ, 'informes', 'bajar-paginas.md'), lineas.join('\n') + '\n');
console.log(`bajar-paginas: ${res.ok} bien, ${res.ya} ya estaban, ${res.fallo.length} fallos, parametro quitado ${res.conParam} veces (queda en ${res.quedanParam.length}) -> informes/bajar-paginas.md`);
for (const x of res.fallo.slice(0, 10)) console.log('  FALLO ' + x);
process.exit(res.fallo.length || res.quedanParam.length ? 1 : 0);
