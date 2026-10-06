/**
 * lado-a-lado.mjs — captura cada tipo de pagina en la web vieja (referencia,
 * :8090) y en la nueva (dist, :4321) y las junta en una sola imagen, vieja a
 * la izquierda y nueva a la derecha, a 1400 y a 390 px.
 *
 *   node scripts/lado-a-lado.mjs [--por-tipo 1] [--tipos a,b] [--rutas /a/,/b/] [--alto 5000]
 *
 * Deja las imagenes en capturas/lado-a-lado/<tipo>--<pagina>-<ancho>.jpg
 * (fuera de Git) y una lista en informes/lado-a-lado.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { RAIZ, arg, abrirNavegador, nuevoContexto, preparar, rutasPorTipo } from './lib/navegador.mjs';

const VIEJA = arg('--vieja', 'http://localhost:8090').replace(/\/$/, '');
const NUEVA = arg('--nueva', 'http://localhost:4321').replace(/\/$/, '');
const ALTO_MAX = Number(arg('--alto', 5000));
const DESTINO = path.join(RAIZ, 'capturas', 'lado-a-lado');
const rutas = rutasPorTipo({ porTipo: 1, porTipoTraducido: 0 }).filter((r) => !r.tipo.startsWith('traducida-') || arg('--tipos', '') || arg('--rutas', ''));
fs.mkdirSync(DESTINO, { recursive: true });

const navegador = await abrirNavegador();
const hechas = [];
for (const ancho of [1400, 390]) {
  const ctx = await nuevoContexto(navegador, ancho);
  const pagina = await ctx.newPage();
  for (const { ruta, tipo } of rutas) {
    const fotos = [];
    for (const base of [VIEJA, NUEVA]) {
      if (!(await preparar(pagina, base + ruta))) { fotos.push(null); continue; }
      const alto = Math.min(ALTO_MAX, await pagina.evaluate(() => document.documentElement.scrollHeight));
      fotos.push(await pagina.screenshot({ clip: { x: 0, y: 0, width: ancho, height: alto }, fullPage: true, type: 'png' }));
    }
    if (!fotos[0] || !fotos[1]) { hechas.push(`- ${tipo} ${ruta} @${ancho}: NO SE PUDO CAPTURAR`); continue; }
    const [ma, mb] = await Promise.all(fotos.map((f) => sharp(f).metadata()));
    const alto = Math.max(ma.height, mb.height);
    const hueco = 24, cinta = 36;
    const rotulo = (texto, w) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${cinta}"><rect width="100%" height="100%" fill="#222"/><text x="12" y="24" font-family="Arial" font-size="18" fill="#fff">${texto}</text></svg>`);
    const nombre = `${tipo}--${(ruta.replace(/^\/|\/$/g, '').replace(/\//g, '--') || 'inicio').slice(0, 60)}-${ancho}.jpg`;
    await sharp({ create: { width: ancho * 2 + hueco, height: alto + cinta, channels: 3, background: '#888888' } })
      .composite([
        { input: rotulo(`VIEJA  ${ruta}  ${ancho}px`, ancho), left: 0, top: 0 },
        { input: rotulo(`NUEVA  ${ruta}  ${ancho}px`, ancho), left: ancho + hueco, top: 0 },
        { input: fotos[0], left: 0, top: cinta },
        { input: fotos[1], left: ancho + hueco, top: cinta },
      ]).jpeg({ quality: 72 }).toFile(path.join(DESTINO, nombre));
    hechas.push(`- ${tipo} ${ruta} @${ancho}: capturas/lado-a-lado/${nombre} (vieja ${ma.height}px, nueva ${mb.height}px de alto)`);
  }
  await ctx.close();
}
await navegador.close();
fs.mkdirSync(path.join(RAIZ, 'informes'), { recursive: true });
fs.writeFileSync(path.join(RAIZ, 'informes', 'lado-a-lado.md'), `# Capturas lado a lado — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}\n\n${hechas.join('\n')}\n`);
console.log(`lado a lado: ${hechas.length} imagenes en capturas/lado-a-lado/ -> informes/lado-a-lado.md`);
process.exit(hechas.some((x) => x.includes('NO SE PUDO')) ? 1 : 0);
