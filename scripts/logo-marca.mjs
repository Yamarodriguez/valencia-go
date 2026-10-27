/**
 * logo-marca.mjs — dibuja el logo de Excursiones Valencia (27-10-2026) y lo
 * escribe en public/marca/: logo.svg (fondo claro), logo-blanco.svg (fondo
 * oscuro), icono.svg, sus PNG, la imagen para compartir en redes
 * (compartir.jpg) y capturas/logo-muestra.png para verlo.
 *
 *   OPENTYPE_DIR=<carpeta con node_modules/opentype.js> FUENTES_TTF=<carpeta con
 *   fraunces-600.ttf y dmsans-700.ttf> node scripts/logo-marca.mjs
 *
 * El texto va convertido a trazos (no depende de las letras del visitante).
 * Sello: cuadrado redondeado verde oscuro con sol azafrán y dos olas crema.
 * Nombre: "Excursiones" en Fraunces 600 y "VALENCIA" en DM Sans 700 espaciada.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import sharp from 'sharp';

const requerir = createRequire(path.join(process.env.OPENTYPE_DIR || process.cwd(), 'package.json'));
const opentype = requerir('opentype.js');
const TTF = process.env.FUENTES_TTF || '.';
const fraunces = opentype.loadSync(path.join(TTF, 'fraunces-600.ttf'));
const dmsans = opentype.loadSync(path.join(TTF, 'dmsans-700.ttf'));
const SALIDA = path.resolve('public/marca');

const C = { verde: '#1F6F50', oscuro: '#143D2E', azafran: '#E8A93A', crema: '#FAF6EE' };
const r1 = (n) => Math.round(n * 10) / 10;

// trazo de un texto con espaciado (en em) entre letras; devuelve d y ancho
function texto(font, cadena, x, y, tam, espaciado = 0) {
  let cx = x, d = '';
  const glifos = font.stringToGlyphs(cadena);
  glifos.forEach((g, i) => {
    d += g.getPath(cx, y, tam).toPathData(1);
    let avance = (g.advanceWidth / font.unitsPerEm) * tam;
    if (i < glifos.length - 1) avance += (font.getKerningValue(g, glifos[i + 1]) / font.unitsPerEm) * tam;
    cx += avance + (i < glifos.length - 1 ? espaciado * tam : 0);
  });
  return { d, ancho: cx - x };
}

// el sello (en una caja de 120×120 empezando en ox, oy)
function sello(ox, oy, fondo, sol, olas, id) {
  const s = (v) => r1(v);
  return `<defs><clipPath id="${id}"><rect x="${ox + 4}" y="${oy + 4}" width="112" height="112" rx="22"/></clipPath></defs>
  <rect x="${ox + 4}" y="${oy + 4}" width="112" height="112" rx="22" fill="${fondo}"/>
  <g clip-path="url(#${id})">
    <circle cx="${ox + 60}" cy="${oy + 66}" r="25" fill="${sol}"/>
    <rect x="${ox}" y="${oy + 70}" width="120" height="50" fill="${fondo}"/>
    <path d="M${s(ox - 6)} ${s(oy + 78)} C ${s(ox + 12)} ${s(oy + 68)}, ${s(ox + 30)} ${s(oy + 68)}, ${s(ox + 48)} ${s(oy + 78)} S ${s(ox + 84)} ${s(oy + 88)}, ${s(ox + 102)} ${s(oy + 78)} S ${s(ox + 120)} ${s(oy + 68)}, ${s(ox + 132)} ${s(oy + 76)}" fill="none" stroke="${olas}" stroke-width="7" stroke-linecap="round"/>
    <path d="M${s(ox - 6)} ${s(oy + 96)} C ${s(ox + 12)} ${s(oy + 86)}, ${s(ox + 30)} ${s(oy + 86)}, ${s(ox + 48)} ${s(oy + 96)} S ${s(ox + 84)} ${s(oy + 106)}, ${s(ox + 102)} ${s(oy + 96)} S ${s(ox + 120)} ${s(oy + 86)}, ${s(ox + 132)} ${s(oy + 94)}" fill="none" stroke="${olas}" stroke-width="7" stroke-linecap="round" opacity="0.75"/>
  </g>`;
}

function logo({ fondoSello, sol, olas, colorNombre, colorCiudad, id }) {
  const x = 140;
  const nombre = texto(fraunces, 'Excursiones', x, 70, 56, -0.005);
  const ciudad = texto(dmsans, 'VALENCIA', x + 2, 106, 23, 0.36);
  const ancho = Math.ceil(x + Math.max(nombre.ancho, ciudad.ancho) + 6);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ancho} 120" width="${ancho}" height="120" role="img" aria-label="Excursiones Valencia">
  <title>Excursiones Valencia</title>
  ${sello(0, 0, fondoSello, sol, olas, id)}
  <path d="${nombre.d}" fill="${colorNombre}"/>
  <path d="${ciudad.d}" fill="${colorCiudad}"/>
</svg>
`;
}

const icono = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="Excursiones Valencia">
  <title>Excursiones Valencia</title>
  ${sello(0, 0, C.oscuro, C.azafran, C.crema, 'sello-i')}
</svg>
`;

fs.mkdirSync(SALIDA, { recursive: true });
const claro = logo({ fondoSello: C.oscuro, sol: C.azafran, olas: C.crema, colorNombre: C.oscuro, colorCiudad: C.verde, id: 'sello-c' });
const oscuro = logo({ fondoSello: C.crema, sol: C.azafran, olas: C.oscuro, colorNombre: C.crema, colorCiudad: C.azafran, id: 'sello-o' });
fs.writeFileSync(path.join(SALIDA, 'logo.svg'), claro);
fs.writeFileSync(path.join(SALIDA, 'logo-blanco.svg'), oscuro);
fs.writeFileSync(path.join(SALIDA, 'icono.svg'), icono);

const ancho = Number(claro.match(/viewBox="0 0 (\d+)/)[1]);
await sharp(Buffer.from(claro), { density: 300 }).resize(ancho * 2).png().toFile(path.join(SALIDA, 'logo.png'));
await sharp(Buffer.from(oscuro), { density: 300 }).resize(ancho * 2).png().toFile(path.join(SALIDA, 'logo-blanco.png'));
await sharp(Buffer.from(icono), { density: 400 }).resize(512).png().toFile(path.join(SALIDA, 'icono.png'));
await sharp(Buffer.from(icono), { density: 400 }).resize(180).flatten({ background: C.crema }).png().toFile(path.join(SALIDA, 'apple-touch-icon.png'));

// imagen para compartir en redes: foto de la Albufera con velo verde y el logo para fondo oscuro
const fotoFondo = ['fotos-nuevas/excursion-al-parque-natural-de-la-albufera-1.jpg', 'public/fotos/excursion-al-parque-natural-de-la-albufera-1.webp'].find((f) => fs.existsSync(f));
if (fotoFondo) {
  const foto = await sharp(fotoFondo).rotate().resize(1200, 630, { fit: 'cover' }).toBuffer();
  const velo = Buffer.from(`<svg width="1200" height="630"><defs><linearGradient id="g" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${C.oscuro}" stop-opacity="0.92"/><stop offset="0.6" stop-color="${C.oscuro}" stop-opacity="0"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/></svg>`);
  const marca = await sharp(Buffer.from(oscuro), { density: 300 }).resize(560).png().toBuffer();
  const mm = await sharp(marca).metadata();
  await sharp(foto).composite([{ input: velo }, { input: marca, top: 630 - mm.height - 52, left: 56 }]).jpeg({ quality: 86 }).toFile(path.join(SALIDA, 'compartir.jpg'));
}

// muestra para verlo: claro y oscuro
const muestra = async (svg, fondo) => sharp(Buffer.from(svg), { density: 300 }).resize(760).flatten({ background: fondo }).extend({ top: 36, bottom: 36, left: 40, right: 40, background: fondo }).png().toBuffer();
const a = await muestra(claro, C.crema), b = await muestra(oscuro, C.oscuro);
const ma = await sharp(a).metadata(), mb = await sharp(b).metadata();
fs.mkdirSync('capturas', { recursive: true });
await sharp({ create: { width: ma.width, height: ma.height + mb.height, channels: 3, background: '#fff' } }).composite([{ input: a, top: 0, left: 0 }, { input: b, top: ma.height, left: 0 }]).png().toFile('capturas/logo-muestra.png');
console.log(`logo: ${ancho}×120 · public/marca/{logo,logo-blanco,icono}.svg/png, apple-touch-icon.png, compartir.jpg · capturas/logo-muestra.png`);
