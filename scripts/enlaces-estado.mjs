/**
 * enlaces-estado.mjs — pregunta a la web VIEJA que hace con cada destino de
 * informes/enlaces-internos.md que no existe en la copia: 200 (existe y hay que
 * bajarlo), 301/302 (redirige: adonde) o 404 (enlace roto del original).
 *
 *   node scripts/enlaces-estado.mjs
 *
 * Solo lee. Despacio (400 ms). Escribe informes/enlaces-estado.json.
 */
import fs from 'node:fs';
import path from 'node:path';
const RAIZ = path.resolve('.');
const DOMINIO = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', 'site.json'), 'utf8')).dominio.replace(/\/$/, '');
// solo los que estan "sin decidir": lo ya conocido (redirecciones, rotos, carrito) no se vuelve a preguntar
const md = (fs.readFileSync(path.join(RAIZ, 'informes', 'enlaces-internos.md'), 'utf8').split('## Sin decidir')[1] || '').split('## Conocidos')[0];
const destinos = [...new Set([...md.matchAll(/^- `([^`]+)`/gm)].map((m) => m[1]))];
const salida = [];
for (const d of destinos) {
  let estado = 0, a = '';
  try {
    const r = await fetch(DOMINIO + d.replace(/=N/g, '=1'), { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (migracion a Astro)' }, signal: AbortSignal.timeout(30000) });
    estado = r.status; a = (r.headers.get('location') || '').replace(DOMINIO, '');
  } catch (e) { estado = -1; a = e.message; }
  salida.push({ destino: d, estado, a });
  await new Promise((f) => setTimeout(f, 400));
}
fs.writeFileSync(path.join(RAIZ, 'informes', 'enlaces-estado.json'), JSON.stringify(salida, null, 1));
const cuenta = {}; for (const s of salida) cuenta[s.estado] = (cuenta[s.estado] || 0) + 1;
console.log('estados:', JSON.stringify(cuenta));
