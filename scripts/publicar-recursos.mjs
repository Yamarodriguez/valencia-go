/**
 * publicar-recursos.mjs — copia a public/ los ficheros de la web vieja que la
 * web nueva sirve con SU MISMA RUTA (regla A3.4: las fotos no cambian de
 * direccion porque estan en Google Imagenes).
 *
 *   node scripts/publicar-recursos.mjs [--ensayo]
 *
 * De referencia/wp-content/uploads/  ->  public/wp-content/uploads/
 *   fotos, videos, pdf y las letras locales de Elementor (google-fonts/fonts).
 *   NO se copian: elementor/css (va por css-original/), ni lo de LiteSpeed,
 *   ni los ficheros del propio WordPress (wc-logs, etc.).
 * Dice cuanto pesa lo copiado: antes del primer push se avisa del peso de public/.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('.');
const ORIGEN = path.join(RAIZ, 'referencia', 'wp-content', 'uploads');
const DESTINO = path.join(RAIZ, 'public', 'wp-content', 'uploads');
const ENSAYO = process.argv.includes('--ensayo');
const EXCLUIR = /^(elementor[\\/]css|litespeed|wc-logs|woocommerce_|complianz|cache)/;
const EXT = /\.(jpe?g|png|webp|gif|svg|avif|ico|mp4|webm|mov|pdf|woff2?|ttf|otf|eot)$/i;

if (!fs.existsSync(ORIGEN)) { console.error('falta referencia/wp-content/uploads — ejecuta antes scripts/montar-referencia.mjs'); process.exit(1); }

let n = 0, bytes = 0, saltados = 0;
const porExt = {};
const recorrer = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    const rel = path.relative(ORIGEN, p);
    if (e.isDirectory()) { if (!EXCLUIR.test(rel)) recorrer(p); continue; }
    if (!EXT.test(e.name) || EXCLUIR.test(rel)) { saltados++; continue; }
    const dest = path.join(DESTINO, rel);
    const tam = fs.statSync(p).size;
    if (!ENSAYO && !(fs.existsSync(dest) && fs.statSync(dest).size === tam)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(p, dest);
    }
    n++; bytes += tam;
    const ext = path.extname(e.name).toLowerCase();
    porExt[ext] = (porExt[ext] || 0) + 1;
  }
};
recorrer(ORIGEN);
console.log(`${ENSAYO ? 'ENSAYO: ' : ''}${n} ficheros, ${(bytes / 1048576).toFixed(1)} MB en public/wp-content/uploads (${saltados} saltados)`);
console.log('  ' + Object.entries(porExt).sort((a, b) => b[1] - a[1]).map(([e, c]) => `${e}: ${c}`).join(', '));
