// Genera una copia .webp de cada .jpg/.jpeg/.png de public/wp-content/uploads
// (al lado del original, mismo nombre). Los originales NO se tocan ni se
// borran: siguen sirviéndose en su URL de siempre (indexada en Google
// Imágenes). Es idempotente: salta los que ya tienen .webp más reciente.
//   node scripts/webp.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const RAIZ = 'public/wp-content/uploads';
const lista = [];
(function recorrer(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) recorrer(p);
    else if (/\.(jpe?g|png)$/i.test(e.name)) lista.push(p);
  }
})(RAIZ);

let hechos = 0, saltados = 0, fallos = 0, antes = 0, despues = 0;
for (const f of lista) {
  const destino = f.replace(/\.(jpe?g|png)$/i, '.webp');
  if (fs.existsSync(destino) && fs.statSync(destino).mtimeMs >= fs.statSync(f).mtimeMs) { saltados++; continue; }
  try {
    const meta = await sharp(f).metadata();
    // PNG con transparencia: se conserva el canal alfa; el resto, calidad 80
    await sharp(f).webp({ quality: 80, effort: 4, alphaQuality: 90 }).toFile(destino);
    const a = fs.statSync(f).size, d = fs.statSync(destino).size;
    // si el webp no ahorra al menos un 15 %, no compensa: se borra y se usa el original
    if (d > a * 0.85) { fs.unlinkSync(destino); saltados++; continue; }
    antes += a; despues += d; hechos++;
    if (hechos % 200 === 0) console.log(hechos, 'convertidas...');
  } catch (e) {
    fallos++;
    console.error('fallo', f, e.message);
  }
}
console.log({ total: lista.length, hechos, saltados, fallos, MBantes: (antes / 1e6).toFixed(1), MBdespues: (despues / 1e6).toFixed(1) });
