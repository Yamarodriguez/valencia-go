// Genera los favicons a partir del icono del logo (el contenedor de la izquierda).
//   node scripts/favicons.mjs
// Escribe en public/: favicon.ico (16+32+48), favicon-32.png, favicon-96.png
// y apple-touch-icon.png (180). Base.astro ya los enlaza.
import sharp from 'sharp';
import fs from 'node:fs';

const LOGO = 'public/wp-content/uploads/2021/08/casas-contenedores-.jpg';

// El icono (contenedor mas los cuadros verde y azul) ocupa la parte izquierda
// del logo, aproximadamente x 40-370, y 40-380 sobre una imagen de 810x450.
const icono = await sharp(LOGO)
  .extract({ left: 45, top: 45, width: 300, height: 285 })
  .flatten({ background: '#ffffff' })
  .png()
  .toBuffer();

async function png(tamano) {
  return sharp(icono)
    .resize(tamano, tamano, { fit: 'contain', background: '#ffffff' })
    .png()
    .toBuffer();
}

fs.writeFileSync('public/favicon-32.png', await png(32));
fs.writeFileSync('public/favicon-96.png', await png(96));
fs.writeFileSync('public/apple-touch-icon.png', await png(180));

// ICO con PNG dentro (lo entienden todos los navegadores actuales)
const tamanos = [16, 32, 48];
const imagenes = await Promise.all(tamanos.map(png));

const cabecera = Buffer.alloc(6);
cabecera.writeUInt16LE(0, 0); // reservado
cabecera.writeUInt16LE(1, 2); // tipo: icono
cabecera.writeUInt16LE(tamanos.length, 4);

const entradas = [];
let desplazamiento = 6 + 16 * tamanos.length;
tamanos.forEach((t, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(t, 0);
  e.writeUInt8(t, 1);
  e.writeUInt8(0, 2);
  e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(imagenes[i].length, 8);
  e.writeUInt32LE(desplazamiento, 12);
  desplazamiento += imagenes[i].length;
  entradas.push(e);
});

fs.writeFileSync('public/favicon.ico', Buffer.concat([cabecera, ...entradas, ...imagenes]));

console.log('favicons generados en public/');
