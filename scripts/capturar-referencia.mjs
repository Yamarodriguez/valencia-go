/**
 * Capturas de la web ORIGINAL montada en local (http://127.0.0.1:8090),
 * para poder comparar trozo a trozo con la web nueva.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:8090';
const SALIDA = '/tmp/cc/capturas-referencia';
const TROZO = 1800;

const PAGINAS = [
  ['portada', '/portada.html'],
  ['tema-precios', '/tema-precios.html'],
  ['tema-modelos', '/tema-modelos.html'],
  ['localidad-casas', '/localidad-casas.html'],
  ['localidad-maritimos', '/localidad-maritimos.html'],
  ['producto', '/producto.html'],
  ['legal', '/legal.html'],
];

const VISTAS = [['escritorio', 1400, 900], ['movil', 390, 844]];

fs.rmSync(SALIDA, { recursive: true, force: true });
fs.mkdirSync(SALIDA, { recursive: true });

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM });

for (const [vista, ancho, alto] of VISTAS) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: alto } });
  const pag = await ctx.newPage();
  await ctx.route('**://**', (r) => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));

  for (const [nombre, ruta] of PAGINAS) {
    await pag.goto(BASE + ruta, { waitUntil: 'load' });
    await pag.evaluate(async () => {
      // las imagenes perezosas del tema usan data-src: se fuerzan
      for (const img of document.querySelectorAll('img[data-src]')) {
        img.src = img.getAttribute('data-src');
      }
      await new Promise((listo) => {
        let y = 0;
        const paso = () => {
          window.scrollTo(0, y); y += 600;
          if (y < document.body.scrollHeight) setTimeout(paso, 40);
          else { window.scrollTo(0, 0); setTimeout(listo, 400); }
        };
        paso();
      });
    });
    await pag.waitForTimeout(600);

    const altura = await pag.evaluate(() => document.body.scrollHeight);
    const trozos = Math.min(Math.ceil(altura / TROZO), 12);
    for (let i = 0; i < trozos; i++) {
      await pag.setViewportSize({ width: ancho, height: Math.min(TROZO, altura - i * TROZO) });
      await pag.evaluate((y) => window.scrollTo(0, y), i * TROZO);
      await pag.waitForTimeout(200);
      await pag.screenshot({ path: path.join(SALIDA, `${vista}-${nombre}-${String(i + 1).padStart(2, '0')}.png`) });
    }
    await pag.setViewportSize({ width: ancho, height: alto });
    console.log(`${vista.padEnd(11)} ${nombre.padEnd(22)} ${altura} px -> ${trozos} trozos`);
  }
  await ctx.close();
}

await navegador.close();
console.log('\ncapturas en ' + SALIDA);
