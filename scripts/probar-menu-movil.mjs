/**
 * probar-menu-movil.mjs — a tamano de movil (Pixel 7), toca el boton del menu
 * (una ventana de Elementor Pro) y mide cuanto tarda en abrirse y si lo hace
 * con el PRIMER toque (los guiones estan aplazados: src/js/aplazador.js guarda
 * ese primer toque y lo repite cuando estan listos).
 *
 *   node scripts/probar-menu-movil.mjs [url1,url2]
 *   (por defecto la copia en Netlify y la web vieja)
 */
import { chromium, devices } from 'playwright';

const URLS = (process.argv[2] || 'https://valenciaandgo.netlify.app/,https://www.valenciaandgo.com/').split(',');
const navegador = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
for (const url of URLS) {
  const ctx = await navegador.newContext({ ...devices['Pixel 7'] });
  const pagina = await ctx.newPage();
  const errores = [];
  pagina.on('pageerror', (e) => errores.push(e.message.slice(0, 160)));
  pagina.on('console', (m) => { if (m.type() === 'error') errores.push('console: ' + m.text().slice(0, 160) + (m.location() && m.location().url ? ' <- ' + m.location().url.replace(url.replace(/[/][^/]*[/]?$/, ''), '') : '')); });
  await pagina.goto(url, { waitUntil: 'load' });
  await pagina.waitForTimeout(500);
  const boton = pagina.locator('a[href^="#elementor-action"]:visible').first();
  const visible = await boton.isVisible().catch(() => false);
  console.log(`\n== ${url}\nboton del menu visible: ${visible}`);
  const estado = async (etiqueta) => {
    const r = await pagina.evaluate(() => {
      const ms = [...document.querySelectorAll('.elementor-popup-modal')];
      const vis = ms.filter((m) => getComputedStyle(m).display !== 'none').map((m) => m.id + ' ' + Math.round(m.getBoundingClientRect().height));
      return { ventanas: ms.length, visibles: vis, aplazado: document.documentElement.getAttribute('data-js-aplazado') };
    });
    console.log(`${etiqueta}: ${JSON.stringify(r)}`);
  };
  await estado('antes de tocar');
  const t0 = Date.now();
  await boton.tap({ timeout: 5000 }).catch((e) => console.log('no se pudo tocar: ' + e.message.slice(0, 100)));
  let abierto = null;
  for (let i = 0; i < 60; i++) {
    await pagina.waitForTimeout(250);
    const r = await pagina.evaluate(() => ({ aplazado: document.documentElement.getAttribute('data-js-aplazado'), visibles: [...document.querySelectorAll('.elementor-popup-modal')].filter((m) => getComputedStyle(m).display !== 'none').length }));
    if (r.visibles && abierto === null) abierto = Date.now() - t0;
    if (r.aplazado === 'hecho' && (abierto !== null || i > 12)) break;
  }
  console.log(`guiones listos: ${Date.now() - t0} ms desde el toque; menu abierto con el 1er toque: ${abierto === null ? 'NO' : 'si, a los ' + abierto + ' ms'}`);
  await estado('tras el 1er toque');
  if (abierto === null) { await boton.tap({ timeout: 5000 }).catch(() => {}); await pagina.waitForTimeout(1500); await estado('tras el 2o toque'); }
  console.log('errores JS:', errores.length ? errores : 'ninguno');
  await ctx.close();
}
await navegador.close();
