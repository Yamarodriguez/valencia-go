/**
 * capturar.mjs — capturas de una pagina por tramos, para revisarla a ojo.
 *
 *   node scripts/capturar.mjs <url> <nombre> [ancho=1400] [carpeta=capturas-tmp]
 *
 * Deja <carpeta>/<nombre>-<ancho>-NN.png, un fichero por cada 1400 px de
 * alto (en movil, 1200). Usa el Chrome instalado en el equipo (canal
 * "chrome"): el Chromium de Playwright no esta descargado.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const [,, url, nombre = 'pagina', anchoArg = '1400', carpeta = 'capturas-tmp'] = process.argv;
if (!url) { console.error('uso: node scripts/capturar.mjs <url> <nombre> [ancho] [carpeta]'); process.exit(1); }
const ancho = Number(anchoArg);
const TROZO = ancho < 700 ? 1200 : 1400;
const salida = path.resolve(carpeta);
fs.mkdirSync(salida, { recursive: true });

const navegador = await chromium.launch({ channel: process.env.CANAL || 'chrome' });
const ctx = await navegador.newContext({ viewport: { width: ancho, height: TROZO }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
// recorre la pagina para que carguen las imagenes perezosas
const alto = await page.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < alto; y += 700) { await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(60); }
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);
const total = await page.evaluate(() => document.body.scrollHeight);
let n = 0;
for (let y = 0; y < total; y += TROZO) {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(salida, `${nombre}-${ancho}-${String(n).padStart(2, '0')}.png`) });
  n++;
}
console.log(`${n} trozos, alto total ${total}px -> ${salida}`);
await navegador.close();
