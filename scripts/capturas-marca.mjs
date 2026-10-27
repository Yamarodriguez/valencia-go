/**
 * capturas-marca.mjs — fotos de pantalla de unas páginas con la marca nueva,
 * en escritorio (1400 px) y móvil (390 px), página entera, con los guiones
 * aplazados ya ejecutados y las fotos perezosas cargadas.
 *
 *   node scripts/capturas-marca.mjs [http://127.0.0.1:4321] [--rutas /,/excursiones/...]
 *
 * Deja capturas/marca/<nombre>-<ancho>.png.
 */
import fs from 'node:fs';
import path from 'node:path';
import { abrirNavegador } from './lib/navegador.mjs';

const BASE = (process.argv.find((a) => a.startsWith('http')) || 'http://127.0.0.1:4321').replace(/\/$/, '');
const i = process.argv.indexOf('--rutas');
const RUTAS = i > -1 ? process.argv[i + 1].split(',') : ['/', '/excursiones/excursion-al-parque-natural-de-la-albufera/', '/atracciones/lonja-de-la-seda/', '/blog/', '/creditos-de-fotos/'];
const SALIDA = path.resolve('capturas', 'marca');
fs.mkdirSync(SALIDA, { recursive: true });

const navegador = await abrirNavegador();
for (const ancho of [1400, 390]) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: 900 }, deviceScaleFactor: 1 });
  for (const ruta of RUTAS) {
    const pagina = await ctx.newPage();
    const nombre = (ruta.replace(/^\/|\/$/g, '').replace(/\//g, '--') || 'portada') + `-${ancho}.png`;
    try {
      await pagina.goto(BASE + ruta, { waitUntil: 'load', timeout: 60000 });
      await pagina.mouse.move(10, 10); await pagina.mouse.move(40, 40);
      await pagina.waitForSelector('html[data-js-aplazado="hecho"]', { timeout: 15000 }).catch(() => {});
      // cerrar el aviso de cookies si tapa
      await pagina.evaluate(() => { document.querySelectorAll('.cmplz-cookiebanner, #cmplz-cookiebanner-container').forEach((e) => e.remove()); });
      // recorrer para que carguen las fotos perezosas
      const alto = await pagina.evaluate(() => document.body.scrollHeight);
      for (let y = 0; y < alto; y += 700) { await pagina.evaluate((v) => window.scrollTo(0, v), y); await pagina.waitForTimeout(120); }
      await pagina.evaluate(() => window.scrollTo(0, 0));
      await pagina.waitForTimeout(800);
      await pagina.screenshot({ path: path.join(SALIDA, nombre), fullPage: true });
      console.log(`${nombre} (${Math.round(alto)} px de alto)`);
    } catch (e) {
      console.log(`${nombre}: ${e.message.split('\n')[0]}`);
    }
    await pagina.close();
  }
  await ctx.close();
}
await navegador.close();
