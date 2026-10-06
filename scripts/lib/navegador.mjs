/**
 * navegador.mjs — arranque comun del navegador para las comprobaciones
 * visuales (geometria, contraste, capturas lado a lado).
 *
 *  - Chrome instalado (channel 'chrome'); si no, el Chromium de Playwright.
 *  - Lo de otros dominios se corta: la medida no depende de internet ni de
 *    servicios externos (reservas, cookies, mapas), y los dos lados quedan igual.
 *  - preparar(): abre la pagina, espera las letras, recorre la pagina entera
 *    (para que carguen las fotos perezosas y entren las animaciones), para los
 *    carruseles en la primera foto y vuelve arriba. Igual para vieja y nueva.
 */
import fs from 'node:fs';
import path from 'node:path';

export const RAIZ = path.resolve('.');
export const leerJson = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
export const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };

export async function abrirNavegador() {
  const { chromium } = await import('playwright');
  try { return await chromium.launch({ channel: 'chrome' }); }
  catch {
    try { return await chromium.launch(); }
    catch { console.error('no arranca el navegador: instala Chrome o ejecuta  npx playwright install chromium'); process.exit(1); }
  }
}

export async function nuevoContexto(navegador, ancho, alto = 900) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await ctx.route('**/*', (route) => {
    const u = new URL(route.request().url());
    return (u.hostname === 'localhost' || u.hostname === '127.0.0.1') ? route.continue() : route.abort();
  });
  return ctx;
}

/** Abre y deja la pagina quieta y entera. Devuelve false si no carga. */
export async function preparar(pagina, url) {
  try {
    await pagina.goto(url, { waitUntil: 'load', timeout: 45000 });
  } catch (e) {
    if (!/Timeout/i.test(e.message)) return false; // con timeout de load se sigue: lo externo esta cortado
  }
  await pagina.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important;scroll-behavior:auto!important}' }).catch(() => {});
  await pagina.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  const alto = await pagina.evaluate(() => document.documentElement.scrollHeight).catch(() => 2000);
  for (let y = 0; y < alto + 900; y += 600) { await pagina.evaluate((y) => window.scrollTo(0, y), y); await pagina.waitForTimeout(70); }
  await pagina.evaluate(() => {
    document.querySelectorAll('.swiper, .swiper-container').forEach((s) => {
      const sw = s.swiper; if (!sw) return;
      try { sw.autoplay && sw.autoplay.stop(); (sw.slideToLoop ? sw.slideToLoop(0, 0) : sw.slideTo(0, 0)); } catch {}
    });
    window.scrollTo(0, 0);
  }).catch(() => {});
  await pagina.waitForTimeout(500);
  return true;
}

/** Rutas a medir: N por tipo de src/data/tipos.json (menos en los traducidos), o --rutas, o --todas. */
export function rutasPorTipo({ porTipo = 2, porTipoTraducido = 1 } = {}) {
  const tipos = leerJson(path.join(RAIZ, 'src', 'data', 'tipos.json'), {});
  const rutasArg = arg('--rutas', '');
  if (rutasArg) return rutasArg.split(',').map((r) => ({ ruta: r.trim(), tipo: 'elegida' })).filter((x) => x.ruta);
  const todas = process.argv.includes('--todas');
  const soloTipos = arg('--tipos', '');
  const n = Number(arg('--por-tipo', porTipo));
  const salida = [];
  for (const [tipo, lista] of Object.entries(tipos)) {
    if (soloTipos && !soloTipos.split(',').includes(tipo)) continue;
    const cuantas = todas ? lista.length : (tipo.startsWith('traducida-') ? Math.min(n, porTipoTraducido) : n);
    // repartidas por la lista, no solo las primeras
    const paso = Math.max(1, Math.floor(lista.length / cuantas));
    for (let i = 0, k = 0; i < lista.length && k < cuantas; i += paso, k++) salida.push({ ruta: lista[i], tipo });
  }
  return salida;
}
