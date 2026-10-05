/**
 * fotos-servicios.mjs — copia la foto de cada servicio con el nombre del
 * servicio (public/img/servicios/<nombre>.jpg y .webp) y la apunta en
 * src/data/servicios.json e imagenes.json.
 *
 *   node scripts/fotos-servicios.mjs
 *
 * Las originales de /wp-content/uploads/ no se tocan (estan indexadas en
 * Google Imagenes): se hace una copia nueva, recortando si hace falta un
 * filete blanco del borde.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const RAIZ = path.resolve('.');
const DATOS = path.join(RAIZ, 'src/data/servicios.json');
const FOTOS = path.join(RAIZ, 'src/data/imagenes.json');
const DESTINO = '/img/servicios/';

// servicio -> nombre del archivo (la palabra clave del servicio)
const NOMBRES = {
  transporte: 'transporte-de-contenedores-maritimos',
  pintura: 'pintura-de-contenedores',
  aislamiento: 'aislamiento-de-contenedores',
  electricidad: 'instalacion-electrica-en-contenedores',
  transformacion: 'transformacion-de-contenedores',
  alquiler: 'alquiler-de-contenedores-maritimos',
  seguridad: 'seguridad-para-contenedores',
  reparacion: 'reparacion-de-contenedores',
  tasacion: 'tasacion-de-contenedores-usados',
  'estudio-parcela': 'estudio-de-parcela-casa-contenedor',
  traslado: 'traslado-de-contenedores',
};
// filete blanco que traen algunas originales: px a quitar por cada lado
const RECORTES = {
  '/wp-content/uploads/2021/08/alquiler-contenedor-maritimos-1024x1024.jpg': { izq: 10, der: 2, arr: 0, aba: 2 },
};

const datos = JSON.parse(fs.readFileSync(DATOS, 'utf8'));
const fotos = JSON.parse(fs.readFileSync(FOTOS, 'utf8'));
fs.mkdirSync(path.join(RAIZ, 'public', DESTINO), { recursive: true });

for (const t of datos.tarjetas) {
  const nombre = NOMBRES[t.servicio];
  if (!nombre) throw new Error(`sin nombre para ${t.servicio}`);
  // la original: la que ya tenia (o la apuntada antes, si se relanza)
  const original = t.original || t.foto;
  const medida = fotos[original];
  if (!medida) throw new Error(`${original} no esta en imagenes.json`);
  let img = sharp(path.join(RAIZ, 'public', original));
  const meta = await img.metadata();
  const r = RECORTES[original];
  if (r) img = img.extract({ left: r.izq, top: r.arr, width: meta.width - r.izq - r.der, height: meta.height - r.arr - r.aba });
  const base = path.join(RAIZ, 'public', DESTINO, nombre);
  const buf = await img.toBuffer();
  const info = await sharp(buf).jpeg({ quality: 84, mozjpeg: true }).toFile(`${base}.jpg`);
  await sharp(buf).webp({ quality: 80 }).toFile(`${base}.webp`);
  const nueva = `${DESTINO}${nombre}.jpg`;
  fotos[nueva] = { ancho: info.width, alto: info.height, blanco: Boolean(medida.blanco) };
  t.original = original;
  t.foto = nueva;
  delete t.bordeBlanco; // ya recortado en la copia
  console.log(`${t.servicio.padEnd(16)} ${nueva}  (${info.width}x${info.height}${medida.blanco ? ', fondo blanco' : ''})`);
}
fs.writeFileSync(DATOS, JSON.stringify(datos, null, 1) + '\n');
fs.writeFileSync(FOTOS, JSON.stringify(fotos, null, 1));
