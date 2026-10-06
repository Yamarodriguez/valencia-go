/**
 * radiografia.mjs — radiografía de la carga de una página: qué tarda el
 * servidor en contestar, qué hojas y guiones bloquean el pintado, qué
 * elemento es el que más tarda en pintarse (LCP) y de dónde sale, y los
 * ficheros más pesados.
 *
 *   node scripts/radiografia.mjs [--url https://valenciaandgo.netlify.app/] [--movil]
 *
 * Solo lee. Escribe informes/radiografia.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ, arg, abrirNavegador } from './lib/navegador.mjs';

const URL_ = arg('--url', 'https://valenciaandgo.netlify.app/');
const MOVIL = process.argv.includes('--movil');
const navegador = await abrirNavegador();
const ctx = await navegador.newContext({ viewport: MOVIL ? { width: 390, height: 844 } : { width: 1400, height: 900 } });
const pagina = await ctx.newPage();
const cdp = await ctx.newCDPSession(pagina);
await cdp.send('Network.enable');
await cdp.send('Network.clearBrowserCache');
if (MOVIL) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
await pagina.addInitScript(() => {
  window.__lcp = [];
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp.push({ t: Math.round(e.renderTime || e.loadTime), tag: e.element ? e.element.tagName : '?', id: e.element ? (e.element.id || e.element.className || '').toString().slice(0, 60) : '', url: e.url || '', size: e.size }); }).observe({ type: 'largest-contentful-paint', buffered: true });
});
const t0 = Date.now();
await pagina.goto(URL_, { waitUntil: 'load', timeout: 90000 }).catch(() => {});
await pagina.waitForTimeout(3000);
const datos = await pagina.evaluate(() => {
  const nav = performance.getEntriesByType('navigation')[0];
  const rec = performance.getEntriesByType('resource').map((r) => ({ url: r.name.replace(location.origin, ''), tipo: r.initiatorType, inicio: Math.round(r.startTime), fin: Math.round(r.responseEnd), kb: Math.round((r.encodedBodySize || r.transferSize || 0) / 1024), bloquea: r.renderBlockingStatus || '' }));
  const hojas = [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => l.getAttribute('href'));
  const fuentes = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight} ${f.style}`);
  return {
    ttfb: Math.round(nav.responseStart), html: Math.round(nav.responseEnd), domListo: Math.round(nav.domContentLoadedEventEnd), carga: Math.round(nav.loadEventEnd),
    primerPintado: Math.round((performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime || 0),
    lcp: window.__lcp, recursos: rec, hojas, fuentes,
  };
});
await navegador.close();
const bloq = datos.recursos.filter((r) => r.bloquea === 'blocking');
const pesados = [...datos.recursos].sort((a, b) => b.kb - a.kb).slice(0, 12);
const porTipo = {};
for (const r of datos.recursos) { porTipo[r.tipo] = porTipo[r.tipo] || { n: 0, kb: 0 }; porTipo[r.tipo].n++; porTipo[r.tipo].kb += r.kb; }
const L = [`# Radiografía — ${URL_} — ${MOVIL ? 'móvil 4G lenta' : 'escritorio'} — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, '',
  `Servidor contesta (TTFB): ${datos.ttfb} ms · HTML completo: ${datos.html} ms · primer pintado: ${datos.primerPintado} ms · documento listo: ${datos.domListo} ms · carga: ${datos.carga} ms`,
  `LCP (lo más grande que se pinta): ${datos.lcp.map((e) => `${e.t} ms <${e.tag}> ${e.id} ${e.url.replace(/^https?:\/\/[^/]+/, '')}`).join(' → ') || '-'}`, '',
  `## Bloquean el pintado (${bloq.length})`, ...bloq.map((r) => `- ${r.kb} KB, listo a los ${r.fin} ms: ${r.url}`), '',
  `## Hojas de estilo en el <head> (${datos.hojas.length})`, ...datos.hojas.map((h) => '- ' + h), '',
  `## Letras cargadas (${datos.fuentes.length})`, ...datos.fuentes.map((f) => '- ' + f), '',
  '## Por tipo', ...Object.entries(porTipo).map(([t, v]) => `- ${t}: ${v.n} peticiones, ${v.kb} KB`), '',
  '## Los 12 más pesados', ...pesados.map((r) => `- ${r.kb} KB (${r.tipo}, ${r.inicio}→${r.fin} ms): ${r.url}`)];
fs.mkdirSync(path.join(RAIZ, 'informes'), { recursive: true });
fs.writeFileSync(path.join(RAIZ, 'informes', `radiografia${MOVIL ? '-movil' : ''}.md`), L.join('\n') + '\n');
console.log(L.slice(0, 4).join('\n')); console.log(`bloquean: ${bloq.length} (${bloq.reduce((a, r) => a + r.kb, 0)} KB) · hojas: ${datos.hojas.length} · letras: ${datos.fuentes.length}`);
console.log('pesados: ' + pesados.slice(0, 6).map((r) => `${r.kb}KB ${r.url.split('/').pop().slice(0, 40)}`).join(' | '));
console.log('-> informes/radiografia' + (MOVIL ? '-movil' : '') + '.md');
