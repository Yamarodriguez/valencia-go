/**
 * todo.mjs — encadena las comprobaciones que no necesitan navegador, una a una,
 * anunciando [n/N] y, si algo falla, "SE HA PARADO EN: <paso>".
 *
 *   node scripts/todo.mjs [--desde css] [--solo build]
 *
 * Cada paso escribe su informe en informes/ y sale con un codigo distinto de 0
 * si falla. La consola solo enseña el resumen de cada paso (ultimas lineas).
 */
import { spawnSync } from 'node:child_process';

const PASOS = [
  ['fuentes', 'node scripts/fuentes-locales.mjs'],
  ['css', 'node scripts/css.mjs'],
  ['build', 'npx astro build'],
  ['validar', 'node scripts/validar.mjs'],
  ['encabezados', 'node scripts/comparar-encabezados.mjs'],
  // Fase 2: ['marcado', 'node scripts/comparar-marcado.mjs'],
];

const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : ''; };
const desde = arg('--desde'); const solo = arg('--solo');
let lista = PASOS;
if (solo) lista = PASOS.filter(([n]) => n === solo);
else if (desde) lista = PASOS.slice(PASOS.findIndex(([n]) => n === desde));

const t0 = Date.now();
for (let i = 0; i < lista.length; i++) {
  const [nombre, orden] = lista[i];
  console.log(`\n[${i + 1}/${lista.length}] ${nombre}: ${orden}`);
  const r = spawnSync(orden, { shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const salida = ((r.stdout || '') + (r.stderr || '')).trim().split('\n');
  for (const l of salida.slice(-12)) console.log('    ' + l);
  if (r.status !== 0) {
    console.log(`\nSE HA PARADO EN: ${nombre} (codigo ${r.status})`);
    process.exit(r.status || 1);
  }
}
console.log(`\nTODO BIEN: ${lista.length} pasos en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
