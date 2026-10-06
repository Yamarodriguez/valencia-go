/**
 * todo-visual.mjs — las comprobaciones que necesitan navegador, una a una,
 * con [n/N] y "SE HA PARADO EN: <paso>" si algo falla.
 *
 *   node scripts/todo-visual.mjs [--solo barrido-referencia]
 *
 * Arranca el servidor de la referencia (8090) y, cuando exista dist/, la vista
 * previa de la web nueva (4321), y los apaga al terminar.
 * Pasos: barrido de 404 de la referencia y de la nueva, geometria (vieja
 * frente a nueva a 1400 y 390 px) y contraste. Con --todas, todas las paginas
 * (tarda mas de una hora).
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';

// Por defecto, una muestra por tipo de pagina (src/data/tipos.json).
//   --todas   todas las paginas (mas de una hora)
//   --rapido  una pagina por tipo (lo que usa el bloqueo pre-push, unos 12 minutos)
const TODAS = process.argv.includes('--todas') ? ' --todas' : '';
const RAPIDO = process.argv.includes('--rapido');
const muestra = (n) => TODAS || ` --por-tipo ${RAPIDO ? 1 : n}`;
const PASOS = [
  ['barrido-referencia', 'node scripts/barrido-404.mjs --base http://localhost:8090 --nombre referencia' + muestra(2)],
  ['barrido-nueva', 'node scripts/barrido-404.mjs --base http://localhost:4321 --nombre nueva' + muestra(2)],
  ['geometria', 'node scripts/geometria.mjs' + muestra(2)],
  ['contraste', 'node scripts/contraste.mjs' + muestra(2)],
];
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : ''; };
const solo = arg('--solo');
const lista = solo ? PASOS.filter(([n]) => n === solo) : PASOS;

const servidores = [];
const arrancar = (orden, puerto) => new Promise((res) => {
  const p = spawn(orden, { shell: true, stdio: 'ignore' });
  servidores.push(p);
  const espera = async () => {
    for (let i = 0; i < 50; i++) {
      try { const r = await fetch(`http://localhost:${puerto}/`); if (r.status < 500) return res(true); } catch {}
      await new Promise((f) => setTimeout(f, 200));
    }
    res(false);
  };
  espera();
});
const apagar = () => { for (const p of servidores) { try { spawnSync(`taskkill /pid ${p.pid} /T /F`, { shell: true, stdio: 'ignore' }); } catch {} try { p.kill(); } catch {} } };

if (!(await arrancar('node scripts/servir-referencia.mjs --puerto 8090', 8090))) { console.log('SE HA PARADO EN: servidor de la referencia (8090)'); apagar(); process.exit(1); }
if (lista.some(([n]) => n !== 'barrido-referencia')) {
  if (!fs.existsSync('dist')) { console.log('SE HA PARADO EN: falta dist/ (npm run build)'); apagar(); process.exit(1); }
  if (!(await arrancar('npx astro preview --port 4321', 4321))) { console.log('SE HA PARADO EN: servidor de la web nueva (4321)'); apagar(); process.exit(1); }
}

const t0 = Date.now();
let codigo = 0;
for (let i = 0; i < lista.length; i++) {
  const [nombre, orden] = lista[i];
  console.log(`\n[${i + 1}/${lista.length}] ${nombre}: ${orden}`);
  const r = spawnSync(orden, { shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const salida = ((r.stdout || '') + (r.stderr || '')).trim().split('\n');
  for (const l of salida.slice(-14)) console.log('    ' + l);
  if (r.status !== 0) { console.log(`\nSE HA PARADO EN: ${nombre} (codigo ${r.status})`); codigo = r.status || 1; break; }
}
apagar();
if (!codigo) console.log(`\nTODO BIEN (visual): ${lista.length} pasos en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(codigo);
