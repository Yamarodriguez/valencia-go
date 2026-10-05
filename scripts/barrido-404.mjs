/**
 * barrido-404.mjs — abre paginas con el navegador y apunta todo lo que falla
 * al cargar (400, 404, peticiones abortadas), recorriendo la pagina entera
 * para que carguen tambien las imagenes perezosas.
 *
 *   node scripts/barrido-404.mjs [--base http://localhost:8090] [--todas]
 *                                [--por-tipo 2] [--rutas /a/,/b/] [--nombre referencia]
 *
 * Que paginas: por defecto, las N primeras de cada tipo de src/data/tipos.json
 * (--por-tipo, 2). Con --todas, todas las de tipos.json. Con --rutas, esas.
 *
 * Que cuenta:
 *   FALLO  una peticion al propio servidor (la base) que devuelve 400 o mas,
 *          o que se aborta, salvo las rutas apuntadas en
 *          src/data/fallos-original.json ("404") y las de la lista blanca
 *          src/data/lista-blanca-404.json (rutas o dominios que se aceptan).
 *   AVISO  lo mismo pero hacia otro dominio (servicios externos).
 * Separa fotos, letras y otros. Informe en informes/barrido-404-<nombre>.md.
 * Sale con 1 si hay algun FALLO.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('.');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('--base', 'http://localhost:8090').replace(/\/$/, '');
const NOMBRE = arg('--nombre', 'referencia');
const POR_TIPO = Number(arg('--por-tipo', 2));
const TODAS = process.argv.includes('--todas');
const RUTAS_ARG = arg('--rutas', '');
const INFORME = path.join(RAIZ, 'informes', `barrido-404-${NOMBRE}.md`);

const leerJson = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
const tipos = leerJson(path.join(RAIZ, 'src', 'data', 'tipos.json'), {});
const fallosOriginal = leerJson(path.join(RAIZ, 'src', 'data', 'fallos-original.json'), {});
const listaBlanca = leerJson(path.join(RAIZ, 'src', 'data', 'lista-blanca-404.json'), { rutas: [], dominios: [] });
const excepciones = new Set((fallosOriginal['404'] || []).map((x) => (typeof x === 'string' ? x : x.ruta)));

let rutas = [];
if (RUTAS_ARG) rutas = RUTAS_ARG.split(',').map((r) => r.trim()).filter(Boolean);
else for (const lista of Object.values(tipos)) rutas.push(...(TODAS ? lista : lista.slice(0, POR_TIPO)));
if (!rutas.length) { console.error('no hay rutas: falta src/data/tipos.json o --rutas'); process.exit(1); }

const { chromium } = await import('playwright');
let navegador;
try { navegador = await chromium.launch({ channel: 'chrome' }); }
catch { try { navegador = await chromium.launch(); } catch { console.error('no arranca el navegador: instala Chrome o ejecuta  npx playwright install chromium'); process.exit(1); } }

const clasificar = (url) => (/\.(jpe?g|png|webp|gif|svg|avif|ico)(\?|$)/i.test(url) ? 'foto' : /\.(woff2?|ttf|otf|eot)(\?|$)/i.test(url) ? 'letra' : 'otro');
const enListaBlanca = (url) => {
  const u = new URL(url);
  return listaBlanca.dominios.some((d) => u.host === d || u.host.endsWith('.' + d)) || listaBlanca.rutas.some((r) => (u.pathname + u.search).includes(r));
};

const fallos = []; const avisos = []; const porPagina = [];
const contexto = await navegador.newContext({ viewport: { width: 1400, height: 900 } });
// Lo de otros dominios se corta a proposito (asi la prueba no depende de
// internet ni de servicios externos). Lo cortado que NO esta en la lista
// blanca sale como aviso; lo propio que falla, como FALLO.
const baseHost = new URL(BASE).host;
await contexto.route('**/*', (route) => {
  const u = new URL(route.request().url());
  if (u.host === baseHost) return route.continue();
  return route.abort();
});
const pagina = await contexto.newPage();
for (const ruta of rutas) {
  const vistos = new Map();
  const apuntar = (url, estado) => {
    if (vistos.has(url)) return;
    vistos.set(url, estado);
    const propia = url.startsWith(BASE + '/');
    const camino = propia ? new URL(url).pathname : url;
    const reg = { pagina: ruta, url: camino, estado, tipo: clasificar(url) };
    if (propia) { if (excepciones.has(camino) || enListaBlanca(url)) reg.excepcion = true; else fallos.push(reg); }
    else if (!enListaBlanca(url)) avisos.push(reg);
  };
  pagina.removeAllListeners('response'); pagina.removeAllListeners('requestfailed');
  pagina.on('response', (r) => { if (r.status() >= 400) apuntar(r.url(), r.status()); });
  pagina.on('requestfailed', (r) => apuntar(r.url(), 'cortada: ' + (r.failure()?.errorText || '').replace('net::', '')));
  const antes = fallos.length + avisos.length;
  try {
    await pagina.goto(BASE + ruta, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // recorrer la pagina entera para que carguen las imagenes perezosas
    await pagina.mouse.move(10, 10);
    const alto = await pagina.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < alto + 900; y += 700) { await pagina.evaluate((y) => window.scrollTo(0, y), y); await pagina.waitForTimeout(80); }
    await pagina.evaluate(() => window.scrollTo(0, 0));
    try { await pagina.waitForLoadState('networkidle', { timeout: 4000 }); } catch {}
  } catch (e) {
    fallos.push({ pagina: ruta, url: ruta, estado: 'no carga: ' + e.message.split('\n')[0], tipo: 'otro' });
  }
  porPagina.push({ ruta, fallos: fallos.length + avisos.length - antes, peticiones: vistos.size });
}
await navegador.close();

const grupo = (lista, t) => lista.filter((x) => x.tipo === t);
const lineas = [
  `# Barrido de 400/404 — ${NOMBRE} — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
  '', `Base: ${BASE}. Paginas: ${rutas.length}. FALLOS: ${fallos.length}. Avisos (otros dominios): ${avisos.length}.`, '',
  ...['foto', 'letra', 'otro'].flatMap((t) => [`## FALLOS — ${t} (${grupo(fallos, t).length})`, ...grupo(fallos, t).map((x) => `- ${x.estado}  ${x.url}  (en ${x.pagina})`), '']),
  ...['foto', 'letra', 'otro'].flatMap((t) => [`## Avisos externos — ${t} (${grupo(avisos, t).length})`, ...grupo(avisos, t).map((x) => `- ${x.estado}  ${x.url}  (en ${x.pagina})`), '']),
  '## Paginas', ...porPagina.map((p) => `- ${p.ruta}: ${p.fallos} problemas`),
];
fs.mkdirSync(path.dirname(INFORME), { recursive: true });
fs.writeFileSync(INFORME, lineas.join('\n') + '\n');
console.log(`barrido ${NOMBRE}: ${rutas.length} paginas, ${fallos.length} FALLOS, ${avisos.length} avisos externos -> informes/barrido-404-${NOMBRE}.md`);
for (const x of fallos.slice(0, 12)) console.log(`  FALLO ${x.estado} ${x.url} (${x.pagina})`);
process.exit(fallos.length ? 1 : 0);
