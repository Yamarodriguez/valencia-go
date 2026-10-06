/**
 * previsualizar-rediseno.mjs — captura la misma página con cada opción de
 * rediseño (las hojas de public/rediseno/*.css) y sin ninguna, en escritorio
 * (1400 px) y móvil (390 px), SIN tocar la web: la hoja se inyecta en el
 * navegador solo para la foto.
 *
 *   node scripts/previsualizar-rediseno.mjs [--base http://localhost:4321] [--ruta /] [--alto 2600]
 *
 * Deja las imágenes en capturas/rediseno/<opcion>-<ancho>.png y una tira con
 * las cuatro en capturas/rediseno/comparativa-<ancho>.jpg.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { RAIZ, arg, abrirNavegador, preparar } from './lib/navegador.mjs';

const BASE = arg('--base', 'http://localhost:4321').replace(/\/$/, '');
const RUTA = arg('--ruta', '/');
const ALTO = Number(arg('--alto', 2600));
const DIR = path.join(RAIZ, 'capturas', 'rediseno');
fs.mkdirSync(DIR, { recursive: true });
const opciones = [['original', null], ...fs.readdirSync(path.join(RAIZ, 'public', 'rediseno')).filter((f) => f.endsWith('.css')).map((f) => [f.replace('.css', ''), path.join(RAIZ, 'public', 'rediseno', f)])];

const navegador = await abrirNavegador();
for (const ancho of [1400, 390]) {
  // aquí sí se deja cargar lo externo (las letras de Google de una de las opciones)
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const fotos = [];
  for (const [nombre, hoja] of opciones) {
    const pagina = await ctx.newPage();
    await preparar(pagina, BASE + RUTA);
    if (hoja) { await pagina.addStyleTag({ content: fs.readFileSync(hoja, 'utf8') }); await pagina.waitForTimeout(1500); }
    // la ventana de cookies tapa la foto: se cierra solo para la captura
    await pagina.evaluate(() => { const b = document.querySelector('#cmplz-cookiebanner-container'); if (b) b.style.display = 'none'; window.scrollTo(0, 0); });
    await pagina.waitForTimeout(400);
    const alto = Math.min(ALTO, await pagina.evaluate(() => document.documentElement.scrollHeight));
    const f = path.join(DIR, `${nombre}-${ancho}.png`);
    await pagina.screenshot({ path: f, clip: { x: 0, y: 0, width: ancho, height: alto }, fullPage: true });
    fotos.push([nombre, f, alto]);
    await pagina.close();
    console.log(`  ${nombre} @${ancho}: capturas/rediseno/${nombre}-${ancho}.png`);
  }
  await ctx.close();
  // tira comparativa
  const cinta = 40, hueco = 20;
  const altoMax = Math.max(...fotos.map((x) => x[2]));
  const rotulo = (t) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${cinta}"><rect width="100%" height="100%" fill="#222"/><text x="14" y="27" font-family="Arial" font-size="20" fill="#fff">${t}</text></svg>`);
  await sharp({ create: { width: ancho * fotos.length + hueco * (fotos.length - 1), height: altoMax + cinta, channels: 3, background: '#888' } })
    .composite(fotos.flatMap(([n, f], i) => [{ input: rotulo(n.toUpperCase()), left: i * (ancho + hueco), top: 0 }, { input: f, left: i * (ancho + hueco), top: cinta }]))
    .jpeg({ quality: 70 }).toFile(path.join(DIR, `comparativa-${ancho}.jpg`));
}
await navegador.close();
console.log('comparativas: capturas/rediseno/comparativa-1400.jpg y comparativa-390.jpg');
