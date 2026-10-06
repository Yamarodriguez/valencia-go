/**
 * publicar-recursos.mjs — copia a public/ los ficheros de la web vieja que la
 * web nueva sirve con SU MISMA RUTA: hojas de estilo, guiones, fotos, letras,
 * videos y pdf de /wp-content/ y /wp-includes/.
 *
 *   node scripts/publicar-recursos.mjs [--ensayo]
 *
 * Por que con la misma ruta: las paginas se copian tal cual y piden cada
 * fichero donde estaba; y las fotos no pueden cambiar de direccion porque
 * estan en Google Imagenes (regla A3.4).
 *
 * De referencia/wp-content/ y referencia/wp-includes/ (los baja y les quita
 * las direcciones absolutas scripts/montar-referencia.mjs) a public/.
 * NO se copia: lo de LiteSpeed (CSS y JS combinados de la cache), ni PHP.
 * Borra de public/wp-content y public/wp-includes lo que ya no este en la
 * referencia. Dice cuanto pesa cada cosa.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('.');
const ENSAYO = process.argv.includes('--ensayo');
const EXCLUIR = /^wp-content[\\/](litespeed|uploads[\\/](litespeed|wc-logs|woocommerce_|cache))/;
const EXT = /\.(css|js|json|map|jpe?g|png|webp|gif|svg|avif|ico|mp4|webm|mov|pdf|woff2?|ttf|otf|eot)$/i;

if (!fs.existsSync(path.join(RAIZ, 'referencia', 'wp-content'))) { console.error('falta referencia/wp-content — ejecuta antes scripts/montar-referencia.mjs'); process.exit(1); }

let n = 0, bytes = 0, copiados = 0, borrados = 0;
const porGrupo = {};
const vistos = new Set();
for (const raiz of ['wp-content', 'wp-includes']) {
  const origen = path.join(RAIZ, 'referencia', raiz);
  if (!fs.existsSync(origen)) continue;
  const recorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      const rel = path.relative(path.join(RAIZ, 'referencia'), p);
      if (EXCLUIR.test(rel)) continue;
      if (e.isDirectory()) { recorrer(p); continue; }
      if (!EXT.test(e.name)) continue;
      const dest = path.join(RAIZ, 'public', rel);
      const tam = fs.statSync(p).size;
      vistos.add(dest);
      if (!ENSAYO && !(fs.existsSync(dest) && fs.statSync(dest).size === tam && fs.statSync(dest).mtimeMs >= fs.statSync(p).mtimeMs)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(p, dest);
        copiados++;
      }
      n++; bytes += tam;
      const partes = rel.split(/[\\/]/);
      const grupo = partes[0] === 'wp-includes' ? 'wp-includes' : partes.slice(0, 2).join('/');
      porGrupo[grupo] = porGrupo[grupo] || { n: 0, bytes: 0 };
      porGrupo[grupo].n++; porGrupo[grupo].bytes += tam;
    }
  };
  recorrer(origen);
  // limpiar lo que sobra en public/
  const limpiar = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { limpiar(p); if (!ENSAYO && !fs.readdirSync(p).length) fs.rmdirSync(p); }
      else if (!vistos.has(p)) { borrados++; if (!ENSAYO) fs.rmSync(p); }
    }
  };
  limpiar(path.join(RAIZ, 'public', raiz));
}
console.log(`${ENSAYO ? 'ENSAYO: ' : ''}${n} ficheros, ${(bytes / 1048576).toFixed(1)} MB en public/ (${copiados} copiados ahora, ${borrados} borrados por sobrar)`);
for (const [g, c] of Object.entries(porGrupo).sort((a, b) => b[1].bytes - a[1].bytes)) console.log(`  ${g}: ${c.n} ficheros, ${(c.bytes / 1048576).toFixed(1)} MB`);
