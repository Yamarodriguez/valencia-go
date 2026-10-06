/**
 * velocidad.mjs — mide con el navegador cuanto pesa y cuanto tarda cada
 * pagina, en la web vieja y en la nueva, y lo compara.
 *
 *   node scripts/velocidad.mjs [--vieja https://www.valenciaandgo.com] [--nueva https://valenciaandgo.netlify.app]
 *                              [--rutas /,/paella/] [--movil]
 *
 * Por pagina: peticiones y kilobytes por tipo (hojas, guiones, fotos, letras,
 * otros), tiempo hasta que el documento esta listo, hasta que carga todo y
 * hasta que se pinta lo mas grande (LCP). Se mide SOBRE LA WEB COMPILADA y
 * desplegada, con lo externo cargando de verdad, 3 veces y se da la mediana.
 * Con --movil, a 390 px y con la red frenada (4G lenta).
 * Informe en informes/velocidad.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ, arg, abrirNavegador } from './lib/navegador.mjs';

const VIEJA = arg('--vieja', 'https://www.valenciaandgo.com').replace(/\/$/, '');
const NUEVA = arg('--nueva', 'https://valenciaandgo.netlify.app').replace(/\/$/, '');
const RUTAS = arg('--rutas', '/,/paella/,/excursiones/excursion-al-parque-natural-de-la-albufera/').split(',').filter(Boolean);
const MOVIL = process.argv.includes('--movil');
const VECES = 3;

const navegador = await abrirNavegador();
async function medir(base, ruta) {
  const ctx = await navegador.newContext({ viewport: MOVIL ? { width: 390, height: 844 } : { width: 1400, height: 900 }, deviceScaleFactor: 1 });
  const pagina = await ctx.newPage();
  const cdp = await ctx.newCDPSession(pagina);
  await cdp.send('Network.enable');
  if (MOVIL) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await cdp.send('Network.clearBrowserCache');
  const bytes = {}; const n = {};
  cdp.on('Network.loadingFinished', (e) => { const t = tipos.get(e.requestId) || 'otros'; bytes[t] = (bytes[t] || 0) + e.encodedDataLength; n[t] = (n[t] || 0) + 1; });
  const tipos = new Map();
  cdp.on('Network.responseReceived', (e) => { const mt = e.response.mimeType || ''; const u = e.response.url;
    tipos.set(e.requestId, /css/.test(mt) ? 'hojas' : /javascript/.test(mt) ? 'guiones' : /^image\//.test(mt) ? 'fotos' : /font/.test(mt) || /\.woff2?(\?|$)/.test(u) ? 'letras' : /html/.test(mt) ? 'html' : 'otros'); });
  await pagina.addInitScript(() => { window.__lcp = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.renderTime || e.loadTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); });
  const t0 = Date.now();
  try { await pagina.goto(base + ruta, { waitUntil: 'load', timeout: 90000 }); } catch {}
  await pagina.waitForTimeout(MOVIL ? 4000 : 2500);
  const tiempos = await pagina.evaluate(() => { const nav = performance.getEntriesByType('navigation')[0] || {}; return { listo: Math.round(nav.domContentLoadedEventEnd || 0), carga: Math.round(nav.loadEventEnd || 0), lcp: Math.round(window.__lcp || 0) }; });
  await ctx.close();
  const total = Object.values(bytes).reduce((a, b) => a + b, 0), peticiones = Object.values(n).reduce((a, b) => a + b, 0);
  return { ...tiempos, kb: Math.round(total / 1024), peticiones, porTipo: Object.fromEntries(Object.entries(bytes).map(([k, v]) => [k, `${n[k]}/${Math.round(v / 1024)}KB`])), ms: Date.now() - t0 };
}
const mediana = (l, k) => { const v = l.map((x) => x[k]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };

const filas = [];
for (const ruta of RUTAS) {
  const res = {};
  for (const [nombre, base] of [['vieja', VIEJA], ['nueva', NUEVA]]) {
    const l = []; for (let i = 0; i < VECES; i++) l.push(await medir(base, ruta));
    res[nombre] = { listo: mediana(l, 'listo'), carga: mediana(l, 'carga'), lcp: mediana(l, 'lcp'), kb: mediana(l, 'kb'), peticiones: mediana(l, 'peticiones'), porTipo: l[0].porTipo };
  }
  filas.push({ ruta, ...res });
  console.log(`${ruta}  vieja: ${res.vieja.kb} KB, ${res.vieja.peticiones} pet., listo ${res.vieja.listo} ms, carga ${res.vieja.carga} ms, LCP ${res.vieja.lcp} ms  |  nueva: ${res.nueva.kb} KB, ${res.nueva.peticiones} pet., listo ${res.nueva.listo} ms, carga ${res.nueva.carga} ms, LCP ${res.nueva.lcp} ms`);
}
await navegador.close();
const lineas = [`# Velocidad — ${MOVIL ? 'movil (390 px, 4G lenta)' : 'escritorio (1400 px)'} — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, '',
  `Vieja: ${VIEJA}. Nueva: ${NUEVA}. Mediana de ${VECES} cargas sin cache, con lo externo cargando.`, '',
  '| Pagina | Web | KB | Peticiones | Listo (ms) | Carga (ms) | LCP (ms) | Por tipo |', '|---|---|---|---|---|---|---|---|',
  ...filas.flatMap((f) => ['vieja', 'nueva'].map((w) => `| ${f.ruta} | ${w} | ${f[w].kb} | ${f[w].peticiones} | ${f[w].listo} | ${f[w].carga} | ${f[w].lcp} | ${Object.entries(f[w].porTipo).map(([k, v]) => `${k} ${v}`).join(', ')} |`))];
fs.mkdirSync(path.join(RAIZ, 'informes'), { recursive: true });
fs.writeFileSync(path.join(RAIZ, 'informes', `velocidad${MOVIL ? '-movil' : ''}.md`), lineas.join('\n') + '\n');
console.log(`-> informes/velocidad${MOVIL ? '-movil' : ''}.md`);
