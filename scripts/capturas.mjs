/**
 * Capturas de revision visual. Una pagina de cada tipo, en escritorio
 * (1400 px) y en movil (390 px), por trozos de 1800 px y con las imagenes
 * perezosas ya cargadas (se recorre la pagina antes de capturar).
 *
 *   node scripts/capturas.mjs [http://127.0.0.1:8080]
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const SALIDA = path.resolve('capturas');
const TROZO = 1800;

const PAGINAS = [
  ['portada', '/'],
  ['tema-precios', '/precios/'],
  ['tema-modelos', '/modelos/'],
  ['localidad-casas', '/galicia/'],
  ['localidad-maritimos', '/contenedores-maritimos-madrid/'],
  ['producto', '/piscina-contenedor/'],
  ['legal', '/aviso-legal/'],
];

const VISTAS = [
  ['escritorio', 1400, 900],
  ['movil', 390, 844],
];

fs.rmSync(SALIDA, { recursive: true, force: true });
fs.mkdirSync(SALIDA, { recursive: true });

const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM || undefined,
});

for (const [vista, ancho, alto] of VISTAS) {
  const ctx = await navegador.newContext({
    viewport: { width: ancho, height: alto },
    deviceScaleFactor: 1,
  });
  const pag = await ctx.newPage();
  // los anuncios y el tag de analitica no pintan nada util en una captura
  await ctx.route('**://*.googlesyndication.com/**', (r) => r.abort());
  await ctx.route('**://*.googletagmanager.com/**', (r) => r.abort());

  for (const [nombre, ruta] of PAGINAS) {
    await pag.goto(BASE + ruta, { waitUntil: 'networkidle' });

    // recorrer la pagina para disparar el lazy loading
    await pag.evaluate(async () => {
      await new Promise((listo) => {
        let y = 0;
        const paso = () => {
          window.scrollTo(0, y);
          y += 600;
          if (y < document.body.scrollHeight) setTimeout(paso, 40);
          else { window.scrollTo(0, 0); setTimeout(listo, 300); }
        };
        paso();
      });
    });
    await pag.waitForTimeout(500);

    const altura = await pag.evaluate(() => document.body.scrollHeight);
    const trozos = Math.min(Math.ceil(altura / TROZO), 12);
    for (let i = 0; i < trozos; i++) {
      await pag.setViewportSize({ width: ancho, height: Math.min(TROZO, altura - i * TROZO) });
      await pag.evaluate((y) => window.scrollTo(0, y), i * TROZO);
      await pag.waitForTimeout(200);
      await pag.screenshot({
        path: path.join(SALIDA, `${vista}-${nombre}-${String(i + 1).padStart(2, '0')}.png`),
      });
    }
    await pag.setViewportSize({ width: ancho, height: alto });
    console.log(`${vista.padEnd(11)} ${ruta.padEnd(36)} ${altura} px -> ${trozos} trozos`);
  }
  await ctx.close();
}

await navegador.close();
console.log('\ncapturas en ' + SALIDA);
